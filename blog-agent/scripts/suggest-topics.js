#!/usr/bin/env node
/**
 * 매일 블로그 주제 5개를 제안하고 Slack으로 전송
 * 소스: question bank 통계 + 입시 뉴스 + 학생 오답 데이터 + 캘린더
 */

import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { config } from 'dotenv';

config({ path: '.env.local' });

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '../..');
const DATA_DIR = join(__dirname, '../data');

const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
const V2_URL = process.env.SUPERFASTSAT_V2_SUPABASE_URL;
const V2_KEY = process.env.SUPERFASTSAT_V2_SUPABASE_SERVICE_KEY;
const SLACK_CHANNEL = 'C0A28EJQA7P';

// ─── 유틸 ────────────────────────────────────────────────────────────────────

function diffDays(targetDateStr, fromDate = new Date()) {
  const target = new Date(targetDateStr);
  const from = new Date(fromDate);
  from.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.round((target - from) / (1000 * 60 * 60 * 24));
}

function loadPostedTopics() {
  const path = join(DATA_DIR, 'posted-topics.json');
  if (!existsSync(path)) { writeFileSync(path, '[]', 'utf-8'); return []; }
  return JSON.parse(readFileSync(path, 'utf-8'));
}

function isAlreadyPosted(title, postedTopics) {
  return postedTopics.some(p => p.title.toLowerCase().trim() === title.toLowerCase().trim());
}

function formatDate(date = new Date()) {
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
  });
}

// ─── 소스 1: Question Bank 통계 ──────────────────────────────────────────────

function loadQuestionBankStats() {
  const qbPath = join(ROOT, 'schema/questions/master_sat_ontology_v3.jsonl');
  if (!existsSync(qbPath)) return null;

  const lines = readFileSync(qbPath, 'utf-8').split('\n').filter(l => l.trim());
  const skillStats = {};
  const hardSamples = {};

  for (const line of lines) {
    let q;
    try { q = JSON.parse(line); } catch { continue; }
    if (q.domain !== 'Reading and Writing') continue;

    const skill = q.skill || 'unknown';
    if (!skillStats[skill]) skillStats[skill] = { total: 0, hard: 0, topics: new Set() };
    skillStats[skill].total++;

    if (q.difficulty === 'Hard') {
      skillStats[skill].hard++;
      const topic = q.topic_category || q.knowledge_graph?.passage_topic || '';
      if (topic) skillStats[skill].topics.add(topic);

      // 스킬별 Hard 샘플 최대 2개
      if (!hardSamples[skill]) hardSamples[skill] = [];
      if (hardSamples[skill].length < 2) {
        hardSamples[skill].push({
          id: q.id,
          question: (q.question || '').slice(0, 120),
          choices: q.choices ? Object.entries(q.choices).map(([k, v]) => `${k}: ${v}`).join(' / ') : '',
          correct: q.correct_answer || '',
          rationale: (q.rationale || '').slice(0, 200),
          topic: q.topic_category || '',
          passage_flow: q.analysis?.passage_logical_flow || '',
          synonyms: q.analysis?.synonyms_for_correct_answer?.join(', ') || '',
        });
      }
    }
  }

  // 직렬화 (Set → Array)
  const stats = Object.entries(skillStats)
    .map(([skill, v]) => ({
      skill,
      total: v.total,
      hard: v.hard,
      hardPct: Math.round((v.hard / v.total) * 100),
      topics: [...v.topics].slice(0, 3),
    }))
    .sort((a, b) => b.hard - a.hard);

  return { stats, hardSamples };
}

// ─── 소스 2: 학생 오답 통계 (Supabase) ──────────────────────────────────────

async function loadStudentErrorStats() {
  if (!V2_URL || !V2_KEY) return null;
  try {
    const supabase = createClient(V2_URL, V2_KEY);
    const since = new Date();
    since.setDate(since.getDate() - 14);

    const { data, error } = await supabase
      .from('diagnostic_test_results')
      .select('skill_scores, created_at')
      .gte('created_at', since.toISOString())
      .limit(200);

    if (error || !data?.length) return null;

    const skillErrors = {};
    for (const row of data) {
      const scores = row.skill_scores;
      if (!scores || typeof scores !== 'object') continue;
      for (const [skill, score] of Object.entries(scores)) {
        if (!skillErrors[skill]) skillErrors[skill] = { total: 0, errors: 0 };
        skillErrors[skill].total++;
        if (typeof score === 'number' && score < 0.6) skillErrors[skill].errors++;
      }
    }

    return Object.entries(skillErrors)
      .filter(([, v]) => v.total >= 3)
      .map(([skill, v]) => ({ skill, errorRate: Math.round((v.errors / v.total) * 100) }))
      .sort((a, b) => b.errorRate - a.errorRate)
      .slice(0, 5);
  } catch {
    return null;
  }
}

// ─── 소스 3: 미 대학 입시 뉴스 (RSS fetch) ───────────────────────────────────

async function fetchCollegeAdmissionsNews() {
  const feeds = [
    'https://blog.collegeboard.org/feed',
    'https://www.commonapp.org/feed',
    'https://www.nacacnet.org/rss.xml',
  ];

  const items = [];
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

  for (const url of feeds) {
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(8000),
        headers: { 'User-Agent': 'SuperfastSAT-BlogBot/1.0' },
      });
      if (!res.ok) continue;
      const xml = await res.text();

      // 간단한 RSS 파싱 (외부 라이브러리 없이)
      const titleMatches = xml.matchAll(/<item[^>]*>[\s\S]*?<title[^>]*><!\[CDATA\[(.*?)\]\]><\/title>|<title[^>]*>(.*?)<\/title>/g);
      const dateMatches = xml.matchAll(/<pubDate>(.*?)<\/pubDate>|<published>(.*?)<\/published>/g);
      const linkMatches = xml.matchAll(/<link[^>]*>(.*?)<\/link>|<link[^>]*href="([^"]*)"[^/]*\/>/g);

      const titles = [...titleMatches].map(m => (m[1] || m[2] || '').trim()).filter(Boolean);
      const dates = [...dateMatches].map(m => (m[1] || m[2] || '').trim()).filter(Boolean);

      for (let i = 0; i < Math.min(titles.length, 5); i++) {
        const pubDate = dates[i] ? new Date(dates[i]).getTime() : Date.now();
        if (pubDate >= sevenDaysAgo) {
          items.push({
            title: titles[i],
            date: dates[i] ? new Date(dates[i]).toLocaleDateString('ko-KR') : '최근',
            source: url.includes('collegeboard') ? 'College Board' :
                    url.includes('commonapp') ? 'Common App' : 'NACAC',
          });
        }
      }
    } catch {
      // feed 실패 시 무시
    }
  }

  return items.slice(0, 6);
}

// ─── 소스 4: SAT 캘린더 ──────────────────────────────────────────────────────

function getCalendarContext() {
  const calPath = join(DATA_DIR, 'sat-calendar.json');
  if (!existsSync(calPath)) return null;
  const calendar = JSON.parse(readFileSync(calPath, 'utf-8'));
  const today = new Date();

  let upcoming = null;
  let recent = null;

  for (const test of calendar.tests) {
    const days = diffDays(test.date, today);
    if (days >= 0 && days <= 60 && !upcoming) {
      upcoming = { name: test.name, date: test.date, days, label: `D-${days}`, isPast: false };
    }
    if (days < 0 && days >= -7 && !recent) {
      recent = { name: test.name, date: test.date, days, label: `D+${Math.abs(days)}`, isPast: true };
    }
  }

  // 예정 시험을 방금 지난 시험보다 항상 우선한다
  return upcoming || recent || null;
}

// ─── Claude Sonnet 주제 생성 ──────────────────────────────────────────────────

async function generateTopicsWithClaude({ qbStats, studentErrors, newsItems, calendarCtx, postedTopics }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const todayStr = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
    timeZone: 'Asia/Seoul',
  });

  const recentTitles = postedTopics.slice(-30).map(t => `- ${t.title}`).join('\n') || '없음';

  // Question Bank 통계 요약
  let qbSection = '';
  if (qbStats) {
    const topSkills = qbStats.stats.slice(0, 6).map(s =>
      `  - ${s.skill}: 총 ${s.total}문항, Hard ${s.hard}개(${s.hardPct}%), 주제: ${s.topics.join('/')}`
    ).join('\n');

    const hardExamples = Object.entries(qbStats.hardSamples).slice(0, 3).map(([skill, samples]) => {
      const s = samples[0];
      return `  [${skill}] ID:${s.id} | 지문토픽:${s.topic} | 패턴:${s.passage_flow}
    문제: ${s.question}
    정답근거: ${s.rationale}`;
    }).join('\n');

    qbSection = `
## 기출 문제은행 데이터 (1,836문항 분석 결과)

### 스킬별 Hard 문제 분포:
${topSkills}

### Hard 문제 샘플 (심화 해설 소재):
${hardExamples}`;
  }

  // 학생 오답 통계
  let errorSection = '';
  if (studentErrors?.length) {
    errorSection = `
## 최근 2주 수강생 오답 통계:
${studentErrors.map(e => `  - ${e.skill}: 오답률 ${e.errorRate}%`).join('\n')}`;
  }

  // 입시 뉴스
  let newsSection = '';
  if (newsItems?.length) {
    newsSection = `
## 최근 미 대학 입시 뉴스 (7일 이내):
${newsItems.map(n => `  - [${n.source}] ${n.title} (${n.date})`).join('\n')}`;
  }

  // 시험 D-day
  let calSection = '';
  if (calendarCtx) {
    if (calendarCtx.isPast) {
      calSection = `\n## 직전 SAT: ${calendarCtx.name} (${calendarCtx.label} — 시험 종료)\n`
        + `이 시험은 이미 끝났습니다. 시험 전 준비 주제(D-day 전략, 막판 공부법 등)는 부적절합니다. `
        + `시험 후 점수 해석, 오답 분석, 재시험 결정 등 사후 주제를 우선하세요.`;
    } else {
      calSection = `\n## 다음 SAT: ${calendarCtx.name} (${calendarCtx.label})`;
    }
  }

  const prompt = `당신은 SuperfastSAT 블로그 에디터입니다. 아래 데이터를 기반으로 오늘의 블로그 주제 5개를 생성하세요.

오늘: ${todayStr}
${calSection}

최근 포스팅 (중복 금지):
${recentTitles}
${qbSection}
${errorSection}
${newsSection}

## QB 데이터 활용 원칙 (반드시 지킬 것):
**금지**: "X 스킬 Hard 비율이 Y%이므로 X가 나올 확률이 높다" 류의 출제 확률 예측
**금지**: "Social Science 지문에 집중하라" 류의 토픽 확률 예측
**허용**: 기출 문제 설계의 시퀀스 발견 ("Contrast 패턴 지문에서 정답은 반전 이후 주절에 있다")
**허용**: 문제·선지 구조의 반복 패턴 분석 ("Hard 선지에서 오답은 항상 지문의 일부 표현을 재사용한다")
**허용**: 특정 단어의 출제 빈도 분석 ("suggests/implies가 질문 동사일 때 정답 선택 기준이 달라진다")

통계는 "무엇이 나올 것인가"가 아니라 "문제가 어떻게 설계되어 있는가"를 드러내는 데 쓴다.

## 주제 유형 (5개를 아래 유형에서 다양하게 섞어서):
1. **deep_dive**: 특정 Hard 문제 심화 해설 — 문제 ID, 정답 근거, 오답 선지 설계 방식을 직접 분해
2. **skill_pattern**: 특정 스킬의 시퀀스·패턴 분석 — "이 스킬 문제는 이렇게 설계된다"는 규칙 발견
3. **timely**: 시험 D-day 시의성 + 지금 당장 교정할 수 있는 풀이 습관 결합
4. **news**: 입시 뉴스 기반 — 수험생/학부모 관점 해설 (뉴스 소스 명시)
5. **coach_insight**: 경쟁사가 쓸 수 없는 문제 구조 분석 관점

## 조건:
- 제목은 한국어 40자 이내, 구체적 패턴명/단어/문제 ID 포함
- rationale에는 반드시 실제 데이터(문항 ID, 패턴 등장 횟수, 선지 구조 관찰 등) 포함
- 중복 금지 목록과 다른 주제

JSON 배열로만 응답 (설명 없이):
[
  {
    "title": "제목 (40자 이내, 구체적 데이터 포함)",
    "type": "deep_dive | skill_pattern | timely | news | coach_insight",
    "source_data": "근거 데이터 요약 (문항 ID, 오답률, 뉴스 제목 등)",
    "rationale": "독자 관점 선택 이유 (1~2문장, 수치 포함)",
    "point": "독자가 얻는 핵심 가치 (1문장)",
    "keyword": "주요 SEO 키워드"
  }
]`;

  const client = new Anthropic({ apiKey });

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const response = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 3000,
        messages: [{ role: 'user', content: prompt }],
      });

      const text = response.content[0]?.text ?? '';
      if (!text) continue;

      let rawJson = null;
      const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (fenceMatch) {
        rawJson = fenceMatch[1].trim();
      } else {
        const arrMatch = text.match(/\[[\s\S]*\]/);
        if (!arrMatch) { console.error(`[Claude] attempt ${attempt}: JSON 없음`); continue; }
        rawJson = arrMatch[0];
      }

      let parsed;
      try { parsed = JSON.parse(rawJson); } catch (e) {
        console.error(`[Claude] attempt ${attempt}: JSON 파싱 실패 — ${e.message}`);
        continue;
      }

      const filtered = parsed
        .filter(t => t.title && !isAlreadyPosted(t.title, postedTopics))
        .slice(0, 5)
        .map(t => ({ ...t, source: t.type || 'claude' }));

      if (filtered.length >= 3) return filtered;
      console.log(`[Claude] attempt ${attempt}: ${filtered.length}개 — 재시도`);
    } catch (err) {
      console.error(`[Claude] attempt ${attempt} 실패:`, err.message);
    }
  }
  return null;
}

// ─── Slack ───────────────────────────────────────────────────────────────────

async function sendSlackMessage(channelId, text) {
  const res = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ channel: channelId, text }),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(`Slack 오류: ${data.error}`);
  return data;
}

function buildMessage(topics, calendarCtx) {
  const dateStr = formatDate();
  const calLabel = calendarCtx
    ? ` | ${calendarCtx.name} ${calendarCtx.label}${calendarCtx.isPast ? ' (시험 종료)' : ''}`
    : '';
  let msg = `[오늘의 블로그 주제 제안 — ${dateStr}${calLabel}]\n\n`;

  topics.forEach((t, i) => {
    const typeLabel = {
      deep_dive: '심화해설',
      skill_pattern: '스킬분석',
      timely: '시의성',
      news: '입시뉴스',
      coach_insight: '코칭인사이트',
    }[t.type] || t.source || '';

    msg += `${i + 1}. [${typeLabel}] ${t.title}\n`;
    msg += `   근거: ${t.rationale}\n`;
    msg += `   포인트: ${t.point}\n`;
    if (t.source_data) msg += `   데이터: ${t.source_data}\n`;
    if (i < topics.length - 1) msg += '\n';
  });

  msg += '\n\n→ 이 스레드에서:\n';
  msg += '  • "@bot N번 랜딩 써줘" — 랜딩 페이지용\n';
  msg += '  • "@bot N번 네이버 써줘" — 네이버 블로그용\n';
  msg += '  • "@bot N번 고스트 써줘" — Ghost 블로그용';
  return msg;
}

// ─── posted-topics.json 업데이트 ─────────────────────────────────────────────

function appendPostedTopics(newTopics) {
  const path = join(DATA_DIR, 'posted-topics.json');
  const existing = existsSync(path) ? JSON.parse(readFileSync(path, 'utf-8')) : [];
  const today = new Date().toISOString().slice(0, 10);
  const toAdd = newTopics
    .filter(t => !existing.some(e => e.title === t.title))
    .map(t => ({ title: t.title, date: today, source: t.source }));
  writeFileSync(path, JSON.stringify([...existing, ...toAdd], null, 2), 'utf-8');
}

// ─── 메인 ────────────────────────────────────────────────────────────────────

async function main() {
  const postedTopics = loadPostedTopics();

  console.log('[1/4] Question bank 로딩...');
  const qbStats = loadQuestionBankStats();
  console.log(`  → 스킬 ${qbStats?.stats?.length ?? 0}개, Hard 샘플 ${Object.keys(qbStats?.hardSamples ?? {}).length}개`);

  console.log('[2/4] 학생 오답 통계 로딩...');
  const studentErrors = await loadStudentErrorStats();
  console.log(`  → ${studentErrors?.length ?? 0}개 스킬`);

  console.log('[3/4] 입시 뉴스 fetch...');
  const newsItems = await fetchCollegeAdmissionsNews();
  console.log(`  → 뉴스 ${newsItems.length}개`);

  const calendarCtx = getCalendarContext();
  if (calendarCtx) console.log(`  → 다음 시험: ${calendarCtx.name} (${calendarCtx.label})`);

  console.log('[4/4] Claude Sonnet 주제 생성...');
  const topics = await generateTopicsWithClaude({
    qbStats, studentErrors, newsItems, calendarCtx, postedTopics,
  });

  if (!topics || topics.length === 0) {
    console.error('주제 생성 실패');
    if (process.argv.includes('--json')) console.log(JSON.stringify([]));
    return;
  }

  console.log(`생성 완료: ${topics.length}개`);

  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(topics, null, 2));
    return;
  }

  const message = buildMessage(topics, calendarCtx);
  console.log('─'.repeat(60));
  console.log(message);
  console.log('─'.repeat(60));

  if (SLACK_BOT_TOKEN) {
    try {
      await sendSlackMessage(SLACK_CHANNEL, message);
      console.log('Slack 발송 완료');
    } catch (err) {
      console.error('Slack 발송 실패:', err.message);
      process.exit(1);
    }
  } else {
    console.log('SLACK_BOT_TOKEN 없음 — 콘솔 출력만');
  }

  const todayTopicsPath = join(DATA_DIR, 'today-topics.json');
  writeFileSync(todayTopicsPath, JSON.stringify({
    date: new Date().toISOString().slice(0, 10),
    topics: topics.map((t, i) => ({ n: i + 1, ...t, triggered: false })),
  }, null, 2));

  appendPostedTopics(topics);
  console.log('today-topics.json 저장 완료');
}

main();
