#!/usr/bin/env node
'use strict';
/**
 * SuperfastSAT 블로그 작성 CLI
 * Slack 파이프라인(blog-writer.ts)과 동일한 로직 — OpenAI gpt-5.6-luna + Qwen RAG
 *
 * 사용법:
 *   node blog-agent/scripts/write-blog-cli.js \
 *     --title "9월 SAT 분석" \
 *     --rationale "8월 vs 9월 문제 1073개 비교 분석" \
 *     --point "유형은 같았고 방식이 달라졌다" \
 *     --platform landing \
 *     [--source-data /path/to/resource.txt]
 */

const path = require('path');
const fs = require('fs');
const { marked } = require('marked');
require('dotenv').config({ path: path.join(__dirname, '../../.env.local') });

// ─── CLI args ─────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const getArg = (name) => {
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 ? args[idx + 1] : null;
};

const TITLE       = getArg('title') || '';
const RATIONALE   = getArg('rationale') || '';
const POINT       = getArg('point') || '';
const PLATFORM    = getArg('platform') || 'both';
const SOURCE_DATA = getArg('source-data');

if (!TITLE) {
  console.error('❌ --title 이 필요합니다.');
  process.exit(1);
}

// ─── Prompts (blog-prompts.ts와 동일) ─────────────────────────────────────────
const SKELETON_SYSTEM = `당신은 SuperfastSAT 블로그 포스팅 골격(Skeleton) 설계 전문가입니다.
주어진 주제로 아래 양식을 JSON으로 채워 반환하세요.

## 포스팅 유형 5종
- 현상형: 독자가 모르는 패턴/사실을 데이터로 보여줄 때. 끝맺음=구체 예시(HOW 없음). 메커니즘 주어=CB/출제설계/문법규칙 (학생 주어 금지).
- 전략형: 공부법/풀이법 제시. 끝맺음=구체 행동.
- 개념형: 헷갈리는 개념 구분. 끝맺음=판단 기준 1줄.
- 비교형: A vs B 선택 기준. 끝맺음=독자 자기 판단 유도.
- 오류수정형: 자주 하는 실수 교정. 끝맺음=확인 행동.

## 반환 JSON 형식
{
  "type": "현상형|전략형|개념형|비교형|오류수정형",
  "focus_keyword": "핵심 SEO 키워드 1개",
  "meta_title": "60자 이내 제목 (핵심 키워드 앞 배치)",
  "meta_description": "155자 이내 설명 (수치 포함, answer-first)",
  "keywords": ["키워드1", "키워드2", "키워드3", "키워드4", "키워드5"],
  "single_claim": "독자의 생각을 A에서 B로 옮기는 방향 — 한 문장",
  "reader_position": "독자가 지금 갖고 있는 구체적 오해 또는 믿음 — 한 문장",
  "discovery_reason": "나는 언제, 무엇을 보고 이것을 알았는가 — 한 문장",
  "awareness_flow": [
    {"question": "독자가 이 시점에 갖는 질문/혼란", "resolution": "이를 해소하는 데이터 또는 사실"},
    {"question": "독자가 이 시점에 갖는 질문/혼란", "resolution": "이를 해소하는 데이터 또는 사실"},
    {"question": "독자가 이 시점에 갖는 질문/혼란", "resolution": "이를 해소하는 데이터 또는 사실"}
  ],
  "mechanism_at_step": 2,
  "closing_sentence": "독자가 글을 닫을 때 머릿속에 남아야 하는 것 — 한 문장",
  "closing_type": "구체 예시|구체 행동|판단 기준 1줄|독자 자기 판단|확인 행동",
  "category": "SAT RW|SAT Math|학습코치|입시뉴스"
}

## 카테고리 규칙 (반드시 아래 4개 중 하나만 선택)
- SAT RW: RW 영역 스킬·전략·분석
- SAT Math: Math 영역 스킬·전략·분석
- 학습코치: 학습법, 습관, 코칭 방법론
- 입시뉴스: 시험 일정, 점수 정책, 시험 분석, College Board 발표`;

const GHOST_PROSE_SYSTEM = `당신은 SuperfastSAT 공식 블로그(Ghost) 작성 전문가입니다.
골격(Skeleton JSON)을 따라 Ghost 블로그 포스팅을 작성합니다.

## SAT 용어 규칙 (절대 준수)
SAT 영역명·스킬명은 영어 원문 그대로 사용한다. 한국어로 번역 금지.
- 영역: Reading and Writing (RW), Math
- 스킬 예시: Inferences, Words in Context, Central Ideas and Details, Command of Evidence, Cross-text Connections, Rhetorical Synthesis, Transitions, Boundaries, Form Structure and Sense, Advanced Math, Linear Equations, Nonlinear Functions, Geometry, Trigonometry, Probability 등
- 틀린 예: "읽기쓰기 영역", "추론", "고급 수학" → 올바른 예: "RW", "Inferences", "Advanced Math"

## 독자 수준 전제 (절대 준수)
이 블로그의 독자는 SAT를 이미 알고 있는 학생·학부모입니다. 아래 내용은 "전문가" 페르소나에 부합하지 않으므로 본문에 설명하지 않습니다.
- SAT가 무엇인지, 총점이 몇 점인지, 영역이 몇 개인지 등 기초 설명 금지
- "RW와 Math 두 영역의 점수를 합산해 총점을 계산하며, 각 영역은 200~800점" 같은 뻔한 점수 체계 설명 금지
- SAT를 처음 접하는 독자를 위한 기초 안내가 필요하다면, 본문에 설명하지 말고 "## 함께 읽기" 섹션에서 별도 입문 포스팅 링크로 안내합니다.
- 전문가가 쓴 글이라면 독자가 이미 알고 있는 사실을 반복하지 않습니다.

## 절대 문체 규칙
- 합니다/입니다 체 전체 준수. ~다/~이다 종결 금지.
- 한 문단 2~4줄. 강조 문장은 단독 줄 + 앞뒤 빈 줄. 3문장 이상 이어진 단락 금지.
- 독자 호칭: "학생" 또는 "학생, 학부모님"
- 1인칭 고백형 금지: "저도 처음엔 그랬습니다"

## 금지 표현 (있으면 다시 작성)
"살펴보겠습니다" / "중요합니다" / "~해야 합니다" 반복 / "실전에서는" / "이번 섹션에서는 X에 대해 알아보겠습니다" / "~인 것입니다" / "~라고 할 수 있습니다" / "이를 통해" / "따라서" 연속 사용 / "본 포스팅에서는" / "정리하면" / "결론적으로" / "이처럼" 반복

## 본문에 절대 넣지 않는 것
- TL;DR 박스, 요약 박스, "바쁘시면 이것만 보세요" 박스
- "이런 분들에게 도움이 됩니다" 섹션
- 목차 (## 목차, 1. 2. 3. 번호 목차)
- ## FAQ / ## 자주 하는 질문 섹션
- "여기서 반전", "핵심은 이것" 같은 구조 신호 레이블
- CTA (구독, 시작하기 등 전환 유도 문구) — Ghost는 완전 금지
- [UNIQUE INSIGHT], [ORIGINAL DATA], [PERSONAL EXPERIENCE] 등 대괄호 마커 — 출력에 절대 포함 금지

## 현상형일 때: 메커니즘 섹션 주어는 반드시 College Board / 출제 설계 / 문법 규칙 (학생 주어 금지)

## 출력 형식 (이 순서 고정)
1. YAML Frontmatter (---로 감싸기): title/description/slug/date/author/category/keywords/focus_keyword
2. 도입부 요약 — 자연스러운 산문 2~3문장 (박스나 레이블 없이). 이 글의 핵심 발견 또는 주장 한 문장 + 읽어야 할 이유 한 문장.
3. 본문 — 골격의 awareness_flow를 따라 자연스럽게 전개. H2 헤딩은 흐름이 필요할 때만.
4. ## 이것 기억하세요 — 끝맺음 섹션 (골격의 closing_sentence 기반, 독립 단락)
5. ## 함께 읽기 — 관련 포스팅 링크 2~3개 (실제 존재하는 것만. 없으면 섹션 생략)
6. ## 레퍼런스 — 본문에서 인용한 출처만 (최소 1개). "College Board Question Bank — [범위], SuperfastSAT 분석 (2026)" 형식

## 본문 흐름 규칙
- awareness_flow의 각 단계는 반드시 H2(##) 헤딩으로 시작합니다. H2 없이 단계를 넘어가는 것은 금지입니다. 최소 2개 이상의 H2 섹션이 본문에 있어야 합니다.
- mechanism_at_step에 해당하는 단계에서 "왜 그런가"의 인과 설명 반드시 포함
- 핵심 주장에는 데이터(수치·비율) 또는 메커니즘(인과 설명) 중 하나 필수
- 사례 단독으로는 주장이 되지 않음

## Qwen/AI 특유 표현 절대 금지 (아래 표현이 출력에 있으면 다시 작성)
"~인 것입니다" / "~라고 할 수 있습니다" / "이를 통해" / "따라서" 연속 사용 / "본 포스팅에서는" / "정리하면" / "결론적으로" / "이처럼" 반복 / "~에 대해 알아보겠습니다"

## 데이터 출처: "College Board Question Bank — [범위], SuperfastSAT 분석 (2026)"

## 글자 수: 3,000~6,000자`;

const LANDING_PROSE_SYSTEM = `당신은 SuperfastSAT 랜딩 페이지 블로그 전문 작성가입니다.
골격(Skeleton JSON)에서 직접 랜딩 페이지 블로그를 작성합니다.
Ghost 블로그와 같은 주제지만, 어조가 조금 더 직접적이고 실전 지향적입니다.

## Ghost vs 랜딩의 차이
- Ghost: Google 검색 유입 독자. SEO 최적화. CTA 없음.
- 랜딩: superfastsat.com 방문자. 전환 지향. CTA 1회 허용 (전략형·비교형·오류수정형만. 현상형은 금지).

## SAT 용어 규칙 (절대 준수)
SAT 영역명·스킬명은 영어 원문 그대로 사용한다. 한국어로 번역 금지.
- 영역: Reading and Writing (RW), Math
- 스킬 예시: Inferences, Words in Context, Central Ideas and Details, Command of Evidence, Cross-text Connections, Rhetorical Synthesis, Transitions, Boundaries, Form Structure and Sense, Advanced Math, Linear Equations, Nonlinear Functions, Geometry, Trigonometry, Probability 등
- 틀린 예: "읽기쓰기 영역", "추론", "고급 수학" → 올바른 예: "RW", "Inferences", "Advanced Math"

## 본문에 절대 넣지 않는 것
- TL;DR 박스, 요약 박스, "바쁘시면 이것만 보세요" 박스
- "이런 분들에게 도움이 됩니다" 섹션
- 목차 (## 목차, 1. 2. 3. 번호 목차)
- ## FAQ / ## 자주 하는 질문 섹션
- "여기서 반전", "핵심은 이것" 같은 구조 신호 레이블
- [UNIQUE INSIGHT], [ORIGINAL DATA], [PERSONAL EXPERIENCE] 등 대괄호 마커 — 출력에 절대 포함 금지

## 출력 형식 (이 순서 고정, YAML frontmatter 없음)

### 1. H1 제목 (골격의 meta_title 사용)

### 2. 도입부 — 자연스러운 산문 2~3문장 (박스나 레이블 없이)
- 골격의 discovery_reason에서 오프닝을 시작 (언제, 무엇을 보고 이것을 알았는가)
- 골격의 reader_position으로 이어서 독자의 현재 오해 묘사
- 핵심 주장(single_claim)으로 연결

### 3. 본문 — 골격의 awareness_flow를 따라 자연스럽게 전개
- awareness_flow의 각 단계는 반드시 H2(##) 헤딩으로 시작합니다. H2 없이 단계를 넘어가는 것은 금지입니다. 최소 2개 이상의 H2 섹션이 본문에 있어야 합니다.
- mechanism_at_step 단계에서 "왜 그런가" 인과 설명 필수
- Ghost보다 예시와 구체적 행동 지침을 1~2문단 더 풍부하게
- 전환 언어 허용: "지금 바로", "오늘 풀 때", "실전에서 바로 적용"

### 섹션 깊이 규칙 (랜딩 전용, 절대 준수)
각 H2 섹션은 최소 3개 문단을 작성합니다. 한 섹션에서 주제를 꺼내자마자 다음 H2로 넘어가는 것은 금지입니다.
- 문단 1: 핵심 주장 또는 현상 제시
- 문단 2: 구체적인 예시 또는 데이터로 뒷받침
- 문단 3: 독자가 실제로 적용할 수 있는 행동 또는 판단 기준
- 필요하면 문단 4 추가 (반례, 주의사항, 심화 설명)
섹션을 빨리 끝내고 다음으로 넘어가는 것보다, 한 섹션을 독자가 충분히 이해하고 다음으로 넘어가는 것이 더 중요합니다.

### 4. ## 이것 기억하세요 — 끝맺음 섹션 (골격의 closing_sentence 기반)

### 5. CTA 섹션 (전략형·비교형·오류수정형만, 현상형은 완전 생략)
마지막 문단 1회만. 자연스럽게 다음 행동으로 이어지는 문장.
[→ 지금 시작하기](https://superfastsat.com/learn)

### 6. ## 레퍼런스 — 본문에서 인용한 출처만 (최소 1개)

## 독자 수준 전제 (절대 준수)
이 블로그의 독자는 SAT를 이미 알고 있는 학생·학부모입니다. 아래 내용은 "전문가" 페르소나에 부합하지 않으므로 본문에 설명하지 않습니다.
- SAT가 무엇인지, 총점이 몇 점인지, 영역이 몇 개인지 등 기초 설명 금지
- "RW와 Math 두 영역의 점수를 합산해 총점을 계산하며, 각 영역은 200~800점" 같은 뻔한 점수 체계 설명 금지
- SAT를 처음 접하는 독자를 위한 기초 안내가 필요하다면, 본문에 설명하지 말고 별도 입문 포스팅 링크로 안내합니다.
- 전문가가 쓴 글이라면 독자가 이미 알고 있는 사실을 반복하지 않습니다.

## 문체 규칙
- 합니다/입니다 체 전체 준수. ~다/~이다 종결 금지.
- 한 문단 2~4줄. 강조 문장은 단독 줄 + 앞뒤 빈 줄. 3문장 이상 이어진 단락 금지.
- 독자 호칭: "학생" 또는 "학생, 학부모님"
- 1인칭 고백형 금지: "저도 처음엔 그랬습니다"

## 금지 표현 (있으면 다시 작성)
"살펴보겠습니다" / "중요합니다" / "~해야 합니다" 반복 / "이번 섹션에서는 X에 대해 알아보겠습니다" / "~인 것입니다" / "~라고 할 수 있습니다" / "이를 통해" / "따라서" 연속 사용 / "본 포스팅에서는" / "정리하면" / "결론적으로" / "이처럼" 반복

## 현상형일 때: 메커니즘 섹션 주어는 반드시 College Board / 출제 설계 / 문법 규칙

## 끝맺음
골격의 closing_type에 따라 작성. 마지막 문장: "이것 기억하세요."

## 데이터 출처
"College Board Question Bank — [범위], SuperfastSAT 분석 (2026)"

## 글자 수: 6,000자 이상 (섹션당 최소 600자)`;

// ─── OpenAI client (동적 import 대신 fetch 직접 사용) ─────────────────────────
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!OPENAI_API_KEY) { console.error('❌ OPENAI_API_KEY 없음'); process.exit(1); }
if (!DASHSCOPE_API_KEY) { console.error('❌ DASHSCOPE_API_KEY 없음'); process.exit(1); }

const OPENAI_MODEL = 'gpt-5.6-luna';

// ─── OpenAI call ─────────────────────────────────────────────────────────────
async function openAiChat(system, userMsg, maxTokens) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      max_completion_tokens: maxTokens,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userMsg },
      ],
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI API 오류: ${res.status} ${err}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? '';
}

// ─── Qwen embedding (RAG) ─────────────────────────────────────────────────────
async function generateEmbedding(text) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  const res = await fetch(
    'https://dashscope-intl.aliyuncs.com/api/v1/services/embeddings/text-embedding/text-embedding',
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${DASHSCOPE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'text-embedding-v3',
        input: { texts: [text.slice(0, 8000)] },
        parameters: { dimension: 1024 },
      }),
    }
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data.output?.embeddings?.[0]?.embedding ?? null;
}

async function matchRelatedPosts(queryText) {
  try {
    const embedding = await generateEmbedding(queryText);
    if (!embedding) return [];
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/match_posts`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query_embedding: embedding, match_threshold: 0.65, match_count: 3 }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    return data.map(row => ({
      title: row.title,
      slug: row.id,
      excerpt: row.excerpt || row.description || '',
    }));
  } catch {
    return [];
  }
}

function buildRelatedContext(posts) {
  if (!posts.length) return '';
  const BASE = 'https://superfastsat.com/blog';
  const lines = posts.map(p => `- [${p.title}](${BASE}/${p.slug})${p.excerpt ? ` — ${p.excerpt.slice(0, 60).replace(/\n/g, ' ')}` : ''}`);
  return `\n## 관련 기존 포스팅 (내부 링크로 활용)\n${lines.join('\n')}\n`;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
async function generateSkeleton(topic, sourceData) {
  const today = new Date().toISOString().slice(0, 10);
  let userMsg = `주제: ${topic.title}\n근거: ${topic.rationale || '없음'}\n핵심 포인트: ${topic.point || '없음'}\n오늘 날짜: ${today}\n\n골격 JSON을 반환해주세요.`;
  if (sourceData) userMsg += `\n\n## 분석 자료\n${sourceData}`;
  const text = await openAiChat(SKELETON_SYSTEM, userMsg, 2000);
  const stripped = text.replace(/```(?:json)?\s*/g, '').replace(/```/g, '');
  const start = stripped.indexOf('{'), end = stripped.lastIndexOf('}');
  if (start === -1 || end <= start) return {};
  try { return JSON.parse(stripped.slice(start, end + 1)); } catch { return {}; }
}

// ─── Prose ────────────────────────────────────────────────────────────────────
async function generateProse(topic, skeleton, relatedContext, system, maxTokens, sourceData) {
  const today = new Date().toISOString().slice(0, 10);
  const sysPrompt = relatedContext ? system + relatedContext : system;
  let userMsg = `주제: ${topic.title}\n오늘 날짜: ${today}\n\n골격:\n${JSON.stringify(skeleton, null, 2)}\n\n위 골격을 따라 블로그 포스팅을 마크다운으로 작성해주세요.`;
  if (sourceData) userMsg += `\n\n## 분석 자료 (이 데이터를 근거로 사용할 것)\n${sourceData}`;
  return openAiChat(sysPrompt, userMsg, maxTokens);
}

// ─── Thumbnail (thumbnail-generator.ts와 동일) ────────────────────────────────
async function extractThumbnailSubjects(title) {
  const res = await fetch(
    'https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions',
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${DASHSCOPE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'qwen-turbo',
        max_tokens: 120,
        messages: [{
          role: 'user',
          content: `Extract thumbnail illustration subjects from this Korean SAT blog title. Return in English.

Context: This blog targets Korean parents and students preparing for the SAT exam.

Rules:
- primary: ONE human figure in a positive, confident, or focused pose (e.g. "a student smiling and looking at a paper", "a parent nodding with a calm smile", "a student raising a hand with a bright expression", "a person sitting upright with a confident look"). Must be a PERSON. Expression must be POSITIVE — never worried, never frowning, never stressed.
- supporting: 2 concrete objects or silhouette figures that represent the options or context (short noun phrases, e.g. "profile silhouette of a young tutor", "score report paper")
- If the title is about SELECTING or COMPARING, primary = the person deciding with a thoughtful but calm expression, supporting = what they are choosing between
- If the title is about STRATEGY or METHOD, primary = student in action with a focused positive expression, supporting = the tools/documents
- Return JSON only: {"primary":"...","supporting":["...","..."]}

Title: ${title}`,
        }],
      }),
    }
  );
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content ?? '';
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('소재 추출 JSON 파싱 실패: ' + text);
  return JSON.parse(match[0]);
}

async function generateQwenImage(prompt, slug) {
  const createRes = await fetch(
    'https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/image-generation/generation',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${DASHSCOPE_API_KEY}`,
        'Content-Type': 'application/json',
        'X-DashScope-Async': 'enable',
      },
      body: JSON.stringify({
        model: 'wan2.7-image-pro',
        input: { messages: [{ role: 'user', content: [{ type: 'text', text: prompt }] }] },
        parameters: { size: '1376*768', n: 1 },
      }),
    }
  );
  if (!createRes.ok) throw new Error(`Qwen 태스크 생성 실패: ${createRes.status} ${await createRes.text()}`);
  const createData = await createRes.json();
  const taskId = createData.output?.task_id;
  if (!taskId) throw new Error('Qwen task_id 없음');

  let imageUrl = null;
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 3000));
    const pollRes = await fetch(`https://dashscope-intl.aliyuncs.com/api/v1/tasks/${taskId}`, {
      headers: { Authorization: `Bearer ${DASHSCOPE_API_KEY}` },
    });
    const pollData = await pollRes.json();
    const status = pollData.output?.task_status;
    if (status === 'SUCCEEDED') {
      const content = pollData.output?.choices?.[0]?.message?.content;
      imageUrl = content?.find(c => c.type === 'image')?.image ?? pollData.output?.results?.[0]?.url ?? null;
      break;
    }
    if (status === 'FAILED') throw new Error('Qwen 이미지 생성 실패: ' + JSON.stringify(pollData));
    process.stdout.write('.');
  }
  if (!imageUrl) throw new Error('Qwen 이미지 URL 없음');
  return imageUrl;
}

async function uploadToSupabase(buffer, slug) {
  if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error('Supabase 환경변수 없음');
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  // Supabase Storage key는 ASCII만 허용 — 한글 슬러그 대비 정규화
  const safeSlug = slug.replace(/[^\w-]/g, '').replace(/-+/g, '-').slice(0, 60) || 'post';
  const filePath = `${year}/${month}/landing-${safeSlug}-${Date.now()}.png`;
  const uploadRes = await fetch(`${SUPABASE_URL}/storage/v1/object/uploads/${filePath}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'image/png',
      'x-upsert': 'false',
    },
    body: buffer,
  });
  if (!uploadRes.ok) throw new Error(`Supabase 업로드 실패: ${uploadRes.status} ${await uploadRes.text()}`);
  return `${SUPABASE_URL}/storage/v1/object/public/uploads/${filePath}`;
}

async function generateLandingThumbnail(title, slug) {
  console.log('[thumbnail] 소재 추출 중...');
  const subjects = await extractThumbnailSubjects(title);
  console.log(`[thumbnail] primary="${subjects.primary}", supporting=[${subjects.supporting.join(', ')}]`);

  const prompt = `A thumbnail illustration.

Composition (strictly follow):
- Primary subject at the exact center: ${subjects.primary}
- Supporting elements around it (one on the left, one on the right${subjects.supporting.length > 2 ? ', one below' : ''}): ${subjects.supporting.join(', ')}
- All figures together must occupy approximately 40% of the total canvas area. The remaining 60% is empty white space.
- Leave 20% margin on the top and 20% on the bottom. Leave visible margins on both left and right sides.
- The figures should feel small and well-spaced within the large white canvas — do not fill the frame.

Style rules:
- Rough hand-drawn doodle icon style.
- Only black lines (#000000) on a white (#FFFFFF) background. No gray, no color, no shading, no fill, no gradient.
- Lines must look like they were drawn quickly in a single stroke — like a marker doodle.
- Avoid perfect circles, perfect straight lines, or any smooth vector feel.
- Line ends may slightly overshoot or leave gaps. Corners may overlap or be slightly misaligned.
- Overall feel: rough, wobbly, hand-scribbled marker sketch.
- Absolutely no text, letters, words, or numbers anywhere in the image.`;

  console.log('[thumbnail] Qwen 이미지 생성 중 (최대 90초)');
  const imageUrl = await generateQwenImage(prompt, slug);
  console.log(`\n[thumbnail] 이미지 URL: ${imageUrl}`);

  const imgRes = await fetch(imageUrl);
  if (!imgRes.ok) throw new Error(`이미지 다운로드 실패: ${imgRes.status}`);
  const buffer = Buffer.from(await imgRes.arrayBuffer());
  const publicUrl = await uploadToSupabase(buffer, slug);
  console.log(`[thumbnail] Supabase 업로드 완료: ${publicUrl}`);
  return publicUrl;
}

// ─── Slug extract ─────────────────────────────────────────────────────────────
function extractSlug(markdown, title) {
  const m = markdown.match(/^slug:\s*(.+)$/m);
  if (m) return m[1].trim().replace(/^["']|["']$/g, '');
  return title.toLowerCase().replace(/[^\w\s가-힣]/g, '').trim()
    .replace(/\s+/g, '-').slice(0, 60) + '-' + Date.now().toString(36);
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const topic = { title: TITLE, rationale: RATIONALE, point: POINT };
  const sourceData = SOURCE_DATA ? fs.readFileSync(SOURCE_DATA, 'utf-8') : null;
  const today = new Date().toISOString().slice(0, 10);
  const postsDir = path.join(__dirname, '../../content/posts');
  if (!fs.existsSync(postsDir)) fs.mkdirSync(postsDir, { recursive: true });

  // 1. RAG
  console.log('[1/4] 관련 포스팅 검색 중...');
  const queryText = `${TITLE}\n${RATIONALE}\n${POINT}`;
  const relatedPosts = await matchRelatedPosts(queryText);
  const relatedContext = buildRelatedContext(relatedPosts);
  if (relatedPosts.length) console.log(`      관련 포스팅: ${relatedPosts.map(p => p.title).join(', ')}`);
  else console.log('      관련 포스팅 없음');

  // 2. Skeleton
  console.log('[2/4] 골격 생성 중 (OpenAI Luna)...');
  const skeleton = await generateSkeleton(topic, sourceData);
  console.log(`      유형: ${skeleton.type || '?'}, 키워드: ${skeleton.focus_keyword || '?'}`);

  // 3. Prose
  const savedFiles = [];
  let slug = null;

  if (PLATFORM === 'ghost' || PLATFORM === 'both') {
    console.log('[3/4] Ghost 본문 생성 중 (OpenAI Luna)...');
    const ghostMd = await generateProse(topic, skeleton, relatedContext, GHOST_PROSE_SYSTEM, 8000, sourceData);
    slug = slug || extractSlug(ghostMd, TITLE);
    const fname = `${today}-${slug}-ghost.md`;
    const fpath = path.join(postsDir, fname);
    fs.writeFileSync(fpath, ghostMd, 'utf-8');
    savedFiles.push(fpath);
    console.log(`      저장: content/posts/${fname}`);
  }

  if (PLATFORM === 'landing' || PLATFORM === 'both') {
    console.log(`[3/4] 랜딩 본문 생성 중 (OpenAI Luna)...`);
    const landingMd = await generateProse(topic, skeleton, relatedContext, LANDING_PROSE_SYSTEM, 10000, sourceData);
    if (!slug) slug = extractSlug(landingMd, TITLE);
    const fname = `${today}-${slug}-landing.md`;
    const fpath = path.join(postsDir, fname);
    // 마크다운 원본 저장
    fs.writeFileSync(fpath, landingMd, 'utf-8');
    // HTML 변환본도 함께 저장 (Supabase 발행용)
    const bodyForHtml = landingMd.replace(/^# .+\n\n?/, '').trim();
    const htmlFname = `${today}-${slug}-landing.html`;
    fs.writeFileSync(path.join(postsDir, htmlFname), marked(bodyForHtml), 'utf-8');
    savedFiles.push(fpath);
    console.log(`      저장: content/posts/${fname}`);
    console.log(`      저장: content/posts/${htmlFname} (HTML 발행용)`);
  }

  // 4. Thumbnail (랜딩만)
  if (PLATFORM === 'landing' || PLATFORM === 'both') {
    const titleForThumb = (skeleton.meta_title || TITLE).trim();
    console.log('[4/4] 랜딩 썸네일 생성 중 (Qwen)...');
    try {
      const thumbUrl = await generateLandingThumbnail(titleForThumb, slug);
      console.log(`\n✅ 썸네일: ${thumbUrl}`);

      // featured_image를 마크다운 파일 상단에 기록
      const landingFile = savedFiles.find(f => f.endsWith('-landing.md'));
      if (landingFile) {
        let content = fs.readFileSync(landingFile, 'utf-8');
        content = `<!-- featured_image: ${thumbUrl} -->\n` + content;
        fs.writeFileSync(landingFile, content, 'utf-8');
      }
    } catch (err) {
      console.error(`\n⚠️ 썸네일 생성 실패 (발행은 계속됩니다): ${err.message}`);
    }
  }

  console.log('\n─────────────────────────────────────────');
  console.log('✅ 작성 완료');
  savedFiles.forEach(f => console.log(`   ${path.relative(path.join(__dirname, '../..'), f)}`));
  console.log('\n다음 단계: node blog-agent/scripts/review-blog-cli.js --file <파일경로>');
}

main().catch(err => { console.error('❌', err.message); process.exit(1); });
