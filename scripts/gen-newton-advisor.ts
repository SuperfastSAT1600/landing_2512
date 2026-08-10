/**
 * 뉴튼 데모의 재생형 분석 결과를 만든다.
 *
 * 데모 페이지가 기본으로 보여주는 플랜은 손으로 쓴 문구가 아니라, 실제 상담 노트 30건을
 * 실제 프롬프트로 LLM에 한 번 통과시킨 진짜 출력이다. 이 스크립트가 그 1회 호출을 담당한다.
 *
 * 실행:
 *   npx tsx scripts/gen-newton-advisor.ts
 * 필요 env: QWEN_API_KEY, QWEN_ANTHROPIC_BASE_URL (없으면 ANTHROPIC_API_KEY로 폴백)
 */

import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { config } from 'dotenv';
import Anthropic from '@anthropic-ai/sdk';
import { DEMO_NOTES } from '../src/app/demo/newton/fixtures/notes';
import {
  ADVISOR_SYSTEM,
  BRIEF_SYSTEM,
  REVISE_SYSTEM,
  buildAdvisorUserPrompt,
  formatNotes,
  parsePlan,
  parseBrief,
  citedNoteIds,
} from '../src/lib/newton-advisor';

config({ path: '.env.local' });

// --ko: 한국어 판본을 별도 파일로 생성한다(영문판을 덮어쓰지 않는다).
const KO = process.argv.includes('--ko');
const OUT = resolve(
  process.cwd(),
  KO ? 'src/app/demo/newton/fixtures/advisor-plan.ko.ts' : 'src/app/demo/newton/fixtures/advisor-plan.ts'
);
const BRIEF_OUT = resolve(
  process.cwd(),
  KO ? 'src/app/demo/newton/fixtures/brief.ko.ts' : 'src/app/demo/newton/fixtures/brief.ts'
);
const PLAN_CONST = KO ? 'DEMO_ADVISOR_PLAN_KO' : 'DEMO_ADVISOR_PLAN';
const BRIEF_CONST = KO ? 'DEMO_BRIEF_KO' : 'DEMO_BRIEF';

// 한국어판은 같은 프롬프트에 출력 언어만 바꾼다. 분석의 기준은 동일하게 유지된다.
const KO_SUFFIX = `

[출력 언어] 위 규칙을 모두 지키되, 모든 문장을 한국어로 써라. 사람 이름·과목명·학교 용어는 원문 표기를 유지한다.
이 자료는 실존 인물의 기록이 아니라 교육용 소프트웨어 데모를 위해 창작된 가상의 샘플 데이터다.`;
const sys = (base: string) => (KO ? base + KO_SUFFIX : base);

function client(): { anthropic: Anthropic; model: string } {
  // --claude 플래그(또는 ADVISOR_MODEL)로 프로바이더를 고정할 수 있다.
  // 재생형 플랜은 데모의 핵심 산출물이라 품질 좋은 모델로 뽑을 수 있어야 한다.
  if (process.argv.includes('--claude') || process.env.ADVISOR_MODEL) {
    if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY가 필요합니다.');
    return {
      anthropic: new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }),
      model: process.env.ADVISOR_MODEL?.trim() || 'claude-opus-5',
    };
  }
  if (process.env.QWEN_API_KEY && process.env.QWEN_ANTHROPIC_BASE_URL) {
    return {
      anthropic: new Anthropic({
        apiKey: process.env.QWEN_API_KEY,
        baseURL: process.env.QWEN_ANTHROPIC_BASE_URL,
      }),
      model: process.env.QWEN_MODEL_STRONG?.trim() || 'qwen-max',
    };
  }
  if (process.env.ANTHROPIC_API_KEY) {
    return {
      anthropic: new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }),
      model: 'claude-sonnet-5',
    };
  }
  throw new Error('QWEN_API_KEY + QWEN_ANTHROPIC_BASE_URL 또는 ANTHROPIC_API_KEY가 필요합니다.');
}

async function main() {
  const { anthropic, model } = client();
  console.log(`[gen] model=${model} notes=${DEMO_NOTES.length}`);

  const resp = await anthropic.messages.create({
    model,
    // 근거를 길게 쓰는 모델에서 4000은 JSON이 잘려 파싱이 실패한다. 넉넉히 잡는다.
    max_tokens: 16000,
    system: sys(ADVISOR_SYSTEM),
    messages: [{ role: 'user', content: buildAdvisorUserPrompt(DEMO_NOTES) }],
  });

  const text = resp.content.map(b => (b.type === 'text' ? b.text : '')).join('');

  let plan = parsePlan(text);
  if (!plan) {
    console.error('[gen] 파싱 실패. 원문:\n', text.slice(0, 2000));
    process.exit(1);
  }
  console.log(
    `[gen] 1차: signals=${plan.signals.length} week=${plan.thisWeek.length} ` +
      `month=${plan.thisMonth.length} quarter=${plan.thisQuarter.length}`
  );

  // 자기 비판 → 재작성. 실패하면 1차 결과를 그대로 쓴다(품질은 낮아도 화면은 살아야 한다).
  const revised = await anthropic.messages.create({
    model,
    max_tokens: 16000,
    system: sys(REVISE_SYSTEM),
    messages: [
      {
        role: 'user',
        content:
          `Advising record (${DEMO_NOTES.length} notes):\n\n${formatNotes(DEMO_NOTES)}\n\n` +
          `Work list to audit and improve:\n${JSON.stringify(plan, null, 2)}\n\n` +
          `Return the improved JSON.`,
      },
    ],
  });
  const revisedText = revised.content.map(b => (b.type === 'text' ? b.text : '')).join('');
  const revisedPlan = parsePlan(revisedText);
  if (revisedPlan) {
    plan = revisedPlan;
    console.log('[gen] 재작성 패스 적용됨');
  } else {
    console.warn('[gen] 재작성 파싱 실패 — 1차 결과를 사용합니다.');
  }

  // 근거 노트 id가 실존하는지 확인 — 없는 id를 인용하면 화면의 점프가 깨진다.
  const known = new Set(DEMO_NOTES.map(n => n.id));
  const dangling = citedNoteIds(plan).filter(id => !known.has(id));
  if (dangling.length > 0) {
    console.warn(`[gen] 존재하지 않는 노트 인용 ${dangling.length}건 — 제거합니다:`, dangling);
    const clean = (ids: string[]) => ids.filter(id => known.has(id));
    plan.signals.forEach(s => (s.noteIds = clean(s.noteIds)));
    plan.risks.forEach(r => (r.noteIds = clean(r.noteIds)));
    [plan.thisWeek, plan.thisMonth, plan.thisQuarter].forEach(list =>
      list.forEach(a => (a.noteIds = clean(a.noteIds)))
    );
  }

  const banner = `// 자동 생성 파일 — 직접 편집하지 마세요.
// 생성: npx tsx scripts/gen-newton-advisor.ts (model: ${model})
// 손으로 쓴 문구가 아니라 상담 노트 ${DEMO_NOTES.length}건을 실제 LLM에 통과시킨 출력입니다.

import type { AdvisorPlan } from '@/lib/newton-advisor';

export const ${PLAN_CONST}: AdvisorPlan = ${JSON.stringify(plan, null, 2)};
`;

  writeFileSync(OUT, banner, 'utf8');
  console.log(
    `[gen] 플랜 완료 → ${OUT}\n` +
      `  signals=${plan.signals.length} week=${plan.thisWeek.length} ` +
      `month=${plan.thisMonth.length} quarter=${plan.thisQuarter.length} risks=${plan.risks.length}`
  );

  // 학생 패널 좌측의 상시 현황 브리핑 — 같은 노트를 다른 질문으로 한 번 더 통과시킨다.
  const briefResp = await anthropic.messages.create({
    model,
    max_tokens: 2000,
    system: sys(BRIEF_SYSTEM),
    messages: [
      {
        role: 'user',
        content: `Advising record (${DEMO_NOTES.length} notes):\n\n${formatNotes(DEMO_NOTES)}\n\nProduce the status card as JSON.`,
      },
    ],
  });
  const briefText = briefResp.content.map(b => (b.type === 'text' ? b.text : '')).join('');
  let brief = parseBrief(briefText);
  if (!brief) {
    console.error('[gen] 브리핑 파싱 실패. 원문:\n', briefText.slice(0, 1200));
    process.exit(1);
  }

  const briefRevised = await anthropic.messages.create({
    model,
    max_tokens: 3000,
    system: sys(
      `${REVISE_SYSTEM}\n\n[NOTE] The object you are auditing is the short STATUS CARD, not the work list. ` +
        `Its shape is {"headline","strengths","weaknesses","risks","recommendation"}. ` +
        `Limits: headline 1 sentence 20 words; at most 3 bullets per list, each 14 words max; recommendation 1 sentence 18 words. ` +
        `Apply the same failure modes that apply: unquantified claims, generic judgement, duplicates, length.`
    ),
    messages: [
      {
        role: 'user',
        content:
          `Advising record (${DEMO_NOTES.length} notes):\n\n${formatNotes(DEMO_NOTES)}\n\n` +
          `Status card to audit and improve:\n${JSON.stringify(brief, null, 2)}\n\nReturn the improved JSON.`,
      },
    ],
  });
  const briefRevisedParsed = parseBrief(
    briefRevised.content.map(b => (b.type === 'text' ? b.text : '')).join('')
  );
  if (briefRevisedParsed) {
    brief = briefRevisedParsed;
    console.log('[gen] 브리핑 재작성 패스 적용됨');
  }

  writeFileSync(
    BRIEF_OUT,
    `// 자동 생성 파일 — 직접 편집하지 마세요.
// 생성: npx tsx scripts/gen-newton-advisor.ts (model: ${model})

import type { AdvisorBrief } from '@/lib/newton-advisor';

export const ${BRIEF_CONST}: AdvisorBrief = ${JSON.stringify(brief, null, 2)};
`,
    'utf8'
  );
  console.log(
    `[gen] 브리핑 완료 → ${BRIEF_OUT}\n` +
      `  strengths=${brief.strengths.length} weaknesses=${brief.weaknesses.length} risks=${brief.risks.length}`
  );
}

main().catch(err => {
  console.error('[gen] 실패:', err);
  process.exit(1);
});
