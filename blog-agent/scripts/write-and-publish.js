#!/usr/bin/env node
'use strict';
/**
 * Slack @bot 요청으로 블로그 포스팅 자동 생성·발행
 *
 * 사용법:
 *   node blog-agent/scripts/write-and-publish.js \
 *     --topic 3 --platform ghost \
 *     --thread 1234567890.123456 --channel C0A28EJQA7P
 */

const path = require('path');
const fs = require('fs');
const https = require('https');
const crypto = require('crypto');

require('dotenv').config({ path: '.env.local' });

// ─── CLI args ─────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const getArg = (name) => {
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 ? args[idx + 1] : null;
};

const TOPIC_N   = parseInt(getArg('topic') || '1', 10);
const PLATFORM  = getArg('platform') || 'ghost';   // 'ghost' | 'landing'
const THREAD_TS = getArg('thread');
const CHANNEL   = getArg('channel') || 'C0A28EJQA7P';

// ─── Paths ────────────────────────────────────────────────────────────────────
const ROOT     = path.join(__dirname, '../..');
const DATA_DIR = path.join(__dirname, '../data');
const SKILLS   = path.join(ROOT, '.claude/skills/superfastsat-blog');

// ─── Helpers ──────────────────────────────────────────────────────────────────
const safeRead = (p) => { try { return fs.readFileSync(p, 'utf-8'); } catch { return ''; } };

// ─── Today Topics ─────────────────────────────────────────────────────────────
function getTopic(n) {
  const p = path.join(DATA_DIR, 'today-topics.json');
  if (!fs.existsSync(p)) throw new Error('today-topics.json not found');
  const data = JSON.parse(fs.readFileSync(p, 'utf-8'));
  const topic = data.topics.find(t => t.n === n);
  if (!topic) throw new Error(`Topic ${n} not found in today-topics.json`);
  return topic;
}

function markTriggered(n, platform) {
  const p = path.join(DATA_DIR, 'today-topics.json');
  const data = JSON.parse(fs.readFileSync(p, 'utf-8'));
  const topic = data.topics.find(t => t.n === n);
  if (topic) {
    if (!topic.triggered || typeof topic.triggered === 'boolean') {
      topic.triggered = {};
    }
    topic.triggered[platform] = true;
  }
  fs.writeFileSync(p, JSON.stringify(data, null, 2));
}

// ─── Schema Stats ─────────────────────────────────────────────────────────────
function loadSkillStats(topicTitle) {
  const qbPath = path.join(ROOT, 'schema/questions/master_sat_ontology_v3.jsonl');
  if (!fs.existsSync(qbPath)) return null;

  const lines = fs.readFileSync(qbPath, 'utf-8').split('\n').filter(l => l.trim());

  // Detect which skill the topic is about
  let targetSkill = null;
  if (/inference/i.test(topicTitle)) targetSkill = 'Inferences';
  else if (/words in context/i.test(topicTitle)) targetSkill = 'Words in Context';
  else if (/cross.text/i.test(topicTitle)) targetSkill = 'Cross-Text Connections';
  else if (/text structure/i.test(topicTitle)) targetSkill = 'Text Structure';
  if (!targetSkill) return null;

  const matched = [];
  for (const line of lines) {
    try {
      const q = JSON.parse(line);
      if (q.skill && q.skill.includes(targetSkill)) matched.push(q);
    } catch { /* skip */ }
  }

  const hard = matched.filter(q => q.difficulty === 'Hard');
  const hardPct = matched.length ? Math.round((hard.length / matched.length) * 100) : 0;

  const example = hard.find(q => q.passage && q.passage.length > 100);

  return {
    skill: targetSkill,
    total: matched.length,
    hard: hard.length,
    hardPct,
    example: example ? {
      id: example.id,
      passage: (example.passage || '').slice(0, 300),
      question: example.question || '',
    } : null,
  };
}

// ─── Claude API (dynamic import for ESM compat) ───────────────────────────────
async function callClaude(prompt, maxTokens = 2500) {
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const resp = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: prompt }],
  });
  return resp.content[0]?.text || '';
}

// ─── Blog Generation ──────────────────────────────────────────────────────────
async function generateBlog(topic, platform, stats) {
  const today  = new Date().toISOString().slice(0, 10);
  const persona    = safeRead(path.join(ROOT, '.claude/skills/superfastsat-persona.md'));
  const voiceGuide = safeRead(path.join(SKILLS, 'voice-guide.md'));

  const statsBlock = stats ? `
## 실제 집계 데이터 (schema/questions/master_sat_ontology_v3.jsonl 직접 분석)
- ${stats.skill} 총 문항: ${stats.total}개
- Hard 문항: ${stats.hard}개 (${stats.hardPct}%) — 전체 RW 스킬 중 최고
${stats.example ? `- Hard 문항 예시 ID: ${stats.example.id}
  지문: "${stats.example.passage.slice(0, 200)}..."
  질문: ${stats.example.question}` : ''}` : '';

  // Step 1: Skeleton
  const skeletonPrompt = `당신은 SuperfastSAT 블로그 에디터입니다. 아래 주제로 Skeleton Gate를 작성하세요.

## 주제
제목: ${topic.title}
근거: ${topic.rationale}
포인트: ${topic.point}
데이터: ${topic.source_data}
${statsBlock}

## Skeleton 형식으로만 응답:

[단일 주장]: (독자 인식을 A→B로 이동하는 한 문장)
[독자 현재 위치]: (지금 갖는 오해/믿음 한 문장)
[발견의 이유]: ("저희가 언제, 무엇을 보고 알았는가" 한 문장)

[인식 흐름]:
  1. 질문: ___ → 해소: ___
  2. 질문: ___ → 해소: ___
  3. 질문: ___ → 해소: ___ (메커니즘)
  4. 질문: ___ → 해소: ___

[끝맺음]: (독자 머릿속에 남는 것 한 문장)

[주장 추적표]:
  주장 → 근거(출처)
  주장 → 근거(출처)

FM-A(흐름): Pass
FM-B(설득): Pass
FM-C(정합): Pass`;

  const skeleton = await callClaude(skeletonPrompt, 800);
  console.log('[1/2] Skeleton 완료');

  // Step 2: Full blog
  const ctaRule = platform === 'ghost'
    ? 'CTA 및 외부 링크 완전 금지'
    : '전략형이므로 마지막 문단 1회 CTA 허용 (https://superfastsat.com/diagnosis)';

  const blogPrompt = `당신은 SuperfastSAT 블로그 에디터입니다. 아래 Skeleton을 바탕으로 ${platform === 'ghost' ? 'Ghost 블로그' : '랜딩 페이지'}용 포스팅을 작성하세요.

## Skeleton
${skeleton}

## 주제 데이터
${topic.source_data}
${statsBlock}

## 페르소나 (핵심)
${persona.slice(0, 1500)}

## 문체 규칙 (핵심)
${voiceGuide.slice(0, 2000)}

## 출력: YAML frontmatter + 마크다운 본문만. 다른 설명 없이.

---
title: "(60자 이내, 구체적)"
date: ${today}
platform: ${platform}
slug: "(소문자 영어, 하이픈, 날짜 없음, 15자 이내)"
focus_keyword: "(핵심 SEO 키워드)"
category: "SAT 전략"
tags: ${platform === 'ghost' ? '["SAT RW 자료"]' : '["SAT 전략", "SAT RW", "Inferences"]'}
author: "SuperfastSAT"
description: "(155자 이내 메타 설명)"
---

(본문 — 도입부 산문 2~3문장 + 본문 H2 섹션들 + ## 이것 기억하세요)

## 레퍼런스

1. College Board Question Bank — Inferences, SuperfastSAT 분석 (2026)

## 필수 규칙
- 합니다/입니다 체. ~다/~이다 금지
- 한 문단 3문장 이하. 강조 문장은 단독 줄
- TL;DR 박스, FAQ, 목차, 구조 신호 레이블 금지
- 독자 호칭: "학생"
- ${ctaRule}
- 수치 반드시 포함: ${stats ? `${stats.skill} ${stats.total}문항, Hard ${stats.hard}개(${stats.hardPct}%)` : topic.source_data.slice(0, 80)}
- 1인칭 고백형 금지`;

  const blog = await callClaude(blogPrompt, 3500);
  console.log('[2/2] 본문 완료');

  return { skeleton, blog };
}

// ─── Frontmatter Parser ───────────────────────────────────────────────────────
function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]+?)\n---\n?([\s\S]*)$/);
  if (!match) return { meta: {}, body: content };

  const meta = {};
  for (const line of match[1].split('\n')) {
    const colon = line.indexOf(':');
    if (colon === -1) continue;
    const key = line.slice(0, colon).trim();
    let val = line.slice(colon + 1).trim();
    if (/^["']/.test(val) && /["']$/.test(val)) val = val.slice(1, -1);
    if (val.startsWith('[')) {
      try { val = JSON.parse(val); } catch { val = [val]; }
    }
    meta[key] = val;
  }

  return { meta, body: match[2].trim() };
}

// ─── Markdown → HTML ──────────────────────────────────────────────────────────
function mdToHtml(md) {
  return md
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+?)\*/g, '<em>$1</em>')
    .replace(/^---$/gm, '<hr>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .split(/\n\n+/)
    .map(block => {
      const t = block.trim();
      if (!t) return '';
      if (/^<(h[23]|hr)/.test(t)) return t;
      return `<p>${t.replace(/\n/g, ' ')}</p>`;
    })
    .filter(Boolean)
    .join('\n');
}

// ─── HTTP helper ──────────────────────────────────────────────────────────────
function httpPost(hostname, path, headers, bodyStr) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      { hostname, path, method: 'POST', headers: { ...headers, 'Content-Length': Buffer.byteLength(bodyStr) } },
      (res) => {
        let data = '';
        res.on('data', c => { data += c; });
        res.on('end', () => resolve({ status: res.statusCode, body: data }));
      }
    );
    req.on('error', reject);
    req.write(bodyStr);
    req.end();
  });
}

// ─── Ghost Publish ────────────────────────────────────────────────────────────
function ghostJwt() {
  const [id, secret] = (process.env.GHOST_ADMIN_KEY || '').split(':');
  const header  = Buffer.from(JSON.stringify({ alg: 'HS256', kid: id, typ: 'JWT' })).toString('base64url');
  const now     = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(JSON.stringify({ iat: now, exp: now + 300, aud: '/admin/' })).toString('base64url');
  const sig     = crypto.createHmac('sha256', Buffer.from(secret, 'hex')).update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${sig}`;
}

async function publishGhost({ title, html, excerpt, slug, metaTitle, metaDesc, tags }) {
  const ghostUrl = process.env.GHOST_URL || '';
  const body = JSON.stringify({
    posts: [{
      title, html,
      custom_excerpt: excerpt,
      slug,
      meta_title: metaTitle,
      meta_description: metaDesc,
      tags: (tags || ['SAT RW 자료']).map(t => ({ name: t })),
      status: 'published',
    }],
  });

  const url = new URL(`${ghostUrl}/ghost/api/admin/posts/?source=html`);
  const { status, body: res } = await httpPost(url.hostname, url.pathname + url.search, {
    Authorization: `Ghost ${ghostJwt()}`,
    'Content-Type': 'application/json',
  }, body);

  if (status !== 201) throw new Error(`Ghost ${status}: ${res.slice(0, 300)}`);
  const post = JSON.parse(res).posts[0];
  return { url: post.url, title: post.title };
}

// ─── Landing Publish ──────────────────────────────────────────────────────────
async function publishLanding({ id, title, content, excerpt, desc, category, tags, date, focusKeyword }) {
  const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

  const body = JSON.stringify({
    id, title, content, excerpt,
    description: desc,
    featured_image: null,
    category: category || 'SAT 전략',
    tags: tags || [],
    author: 'SuperfastSAT',
    date, focus_keyword: focusKeyword || null,
    cta_featured: false, is_published: true,
  });

  const url = new URL(`${SUPA_URL}/rest/v1/posts`);
  const { status, body: res } = await httpPost(url.hostname, url.pathname, {
    apikey: SUPA_KEY,
    Authorization: `Bearer ${SUPA_KEY}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  }, body);

  if (status !== 201) throw new Error(`Landing ${status}: ${res.slice(0, 300)}`);
  const post = JSON.parse(res)[0];
  return { url: `https://superfastsat.com/blog/${post.id}`, title: post.title };
}

// ─── Slack ────────────────────────────────────────────────────────────────────
async function slackPost(channel, text, threadTs) {
  const body = JSON.stringify({ channel, text, ...(threadTs ? { thread_ts: threadTs } : {}) });
  await httpPost('slack.com', '/api/chat.postMessage', {
    Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
    'Content-Type': 'application/json',
  }, body);
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`[write-and-publish] topic=${TOPIC_N} platform=${PLATFORM}`);

  // 1. Topic
  const topic = getTopic(TOPIC_N);
  console.log(`[주제] ${topic.title}`);

  // 중복 방지
  const triggered = topic.triggered;
  if (triggered && typeof triggered === 'object' && triggered[PLATFORM]) {
    const msg = `이미 ${TOPIC_N}번 주제(${PLATFORM})가 작성되었습니다: ${topic.title}`;
    console.log(msg);
    if (THREAD_TS) await slackPost(CHANNEL, msg, THREAD_TS);
    return;
  }

  // 2. Schema stats
  const stats = loadSkillStats(topic.title);
  if (stats) console.log(`[스키마] ${stats.skill}: ${stats.total}문항, Hard ${stats.hard}(${stats.hardPct}%)`);

  // 3. Generate
  const { blog } = await generateBlog(topic, PLATFORM, stats);

  // 4. Parse & save
  const { meta, body } = parseFrontmatter(blog);
  const slug  = (meta.slug || `topic-${TOPIC_N}-${PLATFORM}`).slice(0, 80);
  const title = meta.title || topic.title;
  const date  = meta.date  || new Date().toISOString().slice(0, 10);

  const filename = `${date}-${slug}-${PLATFORM}.md`;
  const filepath = path.join(ROOT, 'content/posts', filename);
  fs.writeFileSync(filepath, blog);
  console.log(`[저장] ${filename}`);

  // 5. Publish
  const html = mdToHtml(body);
  let result;

  if (PLATFORM === 'ghost') {
    const allowed = ['SAT Math 자료', 'SAT RW 자료', '미국 입시 뉴스', '커리큘럼 소개'];
    const tags = (Array.isArray(meta.tags) ? meta.tags : []).filter(t => allowed.includes(t));
    if (!tags.length) tags.push('SAT RW 자료');

    result = await publishGhost({
      title, html,
      excerpt: (meta.description || body).slice(0, 200),
      slug, metaTitle: title,
      metaDesc: (meta.description || body).slice(0, 155),
      tags,
    });
  } else {
    result = await publishLanding({
      id: slug, title, content: html,
      excerpt: body.slice(0, 200),
      desc: (meta.description || body).slice(0, 155),
      category: meta.category || 'SAT 전략',
      tags: Array.isArray(meta.tags) ? meta.tags : [],
      date, focusKeyword: meta.focus_keyword || null,
    });
  }

  console.log(`[발행] ${result.url}`);

  // 6. Mark triggered & Slack report
  markTriggered(TOPIC_N, PLATFORM);

  if (THREAD_TS) {
    const label = PLATFORM === 'ghost' ? 'Ghost 블로그' : '랜딩 페이지';
    await slackPost(CHANNEL,
      `✅ *${label} 포스팅 완료*\n제목: ${title}\nURL: ${result.url}\n슬러그: \`${slug}\``,
      THREAD_TS
    );
    console.log('[Slack 보고 완료]');
  }
}

main().catch(async (err) => {
  console.error('[오류]', err.message, err.stack);
  if (THREAD_TS) {
    await slackPost(CHANNEL, `❌ 블로그 작성 오류: ${err.message}`, THREAD_TS).catch(() => {});
  }
  process.exit(1);
});
