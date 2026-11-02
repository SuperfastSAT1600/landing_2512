#!/usr/bin/env node
'use strict';
/**
 * SuperfastSAT 블로그 검수 CLI
 * Slack 파이프라인(blog-reviewer.ts)과 동일한 로직 — Qwen qwen-turbo 3파트 검수
 *
 * 사용법:
 *   node blog-agent/scripts/review-blog-cli.js \
 *     --file content/posts/2026-09-18-my-post-landing.md \
 *     [--title "포스팅 제목"] \
 *     [--keyword "focus_keyword"]
 */

const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../../.env.local') });

// ─── CLI args ─────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const getArg = (name) => {
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 ? args[idx + 1] : null;
};

const FILE    = getArg('file');
const TITLE   = getArg('title');
const KEYWORD = getArg('keyword');

if (!FILE) {
  console.error('❌ --file 이 필요합니다.');
  console.error('사용법: node blog-agent/scripts/review-blog-cli.js --file content/posts/xxx.md');
  process.exit(1);
}

const filePath = path.isAbsolute(FILE) ? FILE : path.join(__dirname, '../../', FILE);
if (!fs.existsSync(filePath)) {
  console.error(`❌ 파일을 찾을 수 없습니다: ${filePath}`);
  process.exit(1);
}

const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY;
if (!DASHSCOPE_API_KEY) { console.error('❌ DASHSCOPE_API_KEY 없음'); process.exit(1); }

const QWEN_URL = 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions';

// ─── Qwen call (blog-reviewer.ts와 동일) ──────────────────────────────────────
async function qwenReview(prompt) {
  const res = await fetch(QWEN_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${DASHSCOPE_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'qwen-turbo',
      max_tokens: 800,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`Qwen API 오류: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() ?? '';
}

// ─── Extract title/keyword from frontmatter ───────────────────────────────────
function extractFromFrontmatter(content) {
  const titleMatch = content.match(/^title:\s*["']?(.+?)["']?\s*$/m);
  const kwMatch    = content.match(/^focus_keyword:\s*["']?(.+?)["']?\s*$/m);
  const h1Match    = content.match(/^#\s+(.+)$/m);
  return {
    title:   titleMatch?.[1] || h1Match?.[1] || path.basename(FILE, '.md'),
    keyword: kwMatch?.[1] || '',
  };
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const markdown = fs.readFileSync(filePath, 'utf-8');
  const extracted = extractFromFrontmatter(markdown);

  const title   = TITLE   || extracted.title;
  const keyword = KEYWORD || extracted.keyword || title;

  console.log(`\n📋 검수 대상: ${path.basename(filePath)}`);
  console.log(`   제목: ${title}`);
  console.log(`   키워드: ${keyword}`);
  console.log('\n검수 중 (Qwen 3파트 병렬 실행)...\n');

  // blog-reviewer.ts와 동일한 3개 프롬프트
  const [content, seo, factCheck] = await Promise.all([
    qwenReview(`다음 블로그 포스팅 초안을 검수해줘. 항목별로 ✅ 또는 ⚠️ 이모지와 한 줄 코멘트로만 답해.

검수 항목:
1. SAT 스킬명·영역명 한국어 번역 여부 (RW, Math, Inferences 등을 한국어로 쓰면 ⚠️)
2. 금지 표현 포함 여부 ("중요합니다", "살펴보겠습니다", "이를 통해", "따라서" 연속, "정리하면", "결론적으로" 등)
3. 합니다/입니다 체 준수 여부 (~다/~이다 종결 있으면 ⚠️)
4. H2(##) 섹션 2개 이상 존재 여부
5. Ghost 포스팅에 CTA 포함 여부 (있으면 ⚠️)
6. 한 문단 4줄 초과 여부
7. [UNIQUE INSIGHT], [ORIGINAL DATA], [PERSONAL EXPERIENCE] 등 대괄호 마커 포함 여부 (있으면 ⚠️)

포스팅 제목: ${title}
본문(앞 2000자):
${markdown.slice(0, 2000)}`),

    qwenReview(`다음 블로그 포스팅의 SEO를 검수해줘. 항목별로 ✅ 또는 ⚠️ 이모지와 한 줄 코멘트로만 답해.

검수 항목:
1. 제목 20자 이내 여부 (현재: "${title}", ${title.length}자)
2. focus_keyword("${keyword}")가 제목에 포함되어 있는지
3. focus_keyword가 본문 앞 200자 내에 등장하는지
4. H2 헤딩이 2개 이상인지
5. 메타 디스크립션(description 또는 첫 문단)이 155자 이내인지

포스팅 제목: ${title}
focus_keyword: ${keyword}
본문 앞 500자:
${markdown.slice(0, 500)}`),

    qwenReview(`당신은 SAT 전문가입니다. 다음 블로그 포스팅에서 사실과 다르거나 출처 없이 단정하는 주장을 찾아주세요.

판단 기준:
- 구체적인 수치(%, 점수, 문항 수 등)를 출처 없이 단정하면 ⚠️
- College Board 공식 정책과 다른 내용이면 ⚠️
- SAT 시험 구조·채점 방식에 대한 잘못된 설명이면 ⚠️
- 사실처럼 서술했지만 실제로는 확인 불가능한 주장이면 ⚠️
- 출처가 명시된 수치이거나 일반적으로 알려진 사실이면 ✅

각 항목은 "⚠️ [의심 문장 요약] — 이유" 또는 "✅ 사실 관계 이상 없음" 형식으로만 답해.
의심 항목이 없으면 "✅ 사실 관계 이상 없음"만 출력.

포스팅 제목: ${title}
본문 전체:
${markdown.slice(0, 3000)}`),
  ]);

  const hasWarning = (text) => text.includes('⚠️');

  console.log('─────────────────────────────────────────');
  console.log('📝 문체 / 포맷 검수');
  console.log(content);

  console.log('\n─────────────────────────────────────────');
  console.log('🔍 SEO 검수');
  console.log(seo);

  console.log('\n─────────────────────────────────────────');
  console.log('✔️  팩트 체크');
  console.log(factCheck);

  console.log('\n─────────────────────────────────────────');
  const allClear = !hasWarning(content) && !hasWarning(seo) && !hasWarning(factCheck);
  if (allClear) {
    console.log('✅ 검수 완료 — 경고 없음. 발행 가능합니다.');
  } else {
    console.log('⚠️  경고 항목이 있습니다. 발행 전 수정을 권장합니다.');
  }
}

main().catch(err => { console.error('❌', err.message); process.exit(1); });
