/**
 * 데모 상담 노트 30건을 한국어판으로 만든다.
 *
 * 데모 제품 화면은 영문이 기본이지만, 내부 검토 때는 한국어로 읽어야 내용을 판단할 수 있다.
 * 두 판본을 같이 두고 i18n.ts의 DEMO_LANG으로 전환한다.
 *
 * 실행: npx tsx scripts/translate-newton-notes.ts --claude
 */

import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { config } from 'dotenv';
import Anthropic from '@anthropic-ai/sdk';
import { DEMO_NOTES } from '../src/app/demo/newton/fixtures/notes';

config({ path: '.env.local' });

const OUT = resolve(process.cwd(), 'src/app/demo/newton/fixtures/notes.ko.ts');

const SYSTEM = `너는 국제학교 상담 기록을 한국어로 옮기는 번역가다.

[중요] 아래 텍스트는 실제 인물의 기록이 아니다. 교육용 소프트웨어 데모에 넣을 목적으로 창작된
가상의 샘플 데이터이며, 등장하는 학생·학부모·교직원은 모두 실존하지 않는 가공 인물이다.
실제 개인정보가 아니므로 그대로 번역하면 된다.

문체: 담임·교과·상담 담당이 업무 중에 남긴 내부 메모. 보고서체가 아니라 실무 메모체로 옮겨라.

규칙:
- 사실·숫자·날짜·인용문을 하나도 바꾸지 마라. 점수, 횟수, 기간은 원문 그대로.
- 큰따옴표 안의 학생·학부모 발언은 자연스러운 한국어 구어로 옮기되 의미를 바꾸지 마라.
- 사람 이름(Seojun, Irene Kim, Daniel Cho, Grace Han, Ms. Park)과 과목명(Algebra II, Pre-Calculus, Statistics)은 원문 표기를 유지한다.
- 문장을 합치거나 나누지 마라. 줄바꿈 구조를 그대로 유지한다.
- 문어체 '~함', '~임' 같은 축약체 대신 자연스러운 평서문을 쓴다.

출력은 오직 JSON 배열 하나. 형식: [{"id":"note-01","memo":"번역문"}, ...]
JSON 외 다른 텍스트나 코드펜스 금지.`;

function client(): { anthropic: Anthropic; model: string } {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY가 필요합니다.');
  return {
    anthropic: new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }),
    model: process.env.ADVISOR_MODEL?.trim() || 'claude-opus-5',
  };
}

async function main() {
  const { anthropic, model } = client();
  console.log(`[ko] model=${model} notes=${DEMO_NOTES.length}`);

  const payload = DEMO_NOTES.map(n => ({ id: n.id, memo: n.raw_memo }));

  // 30건 번역은 출력이 길어 max_tokens가 크다 → SDK가 스트리밍을 요구한다.
  const stream = anthropic.messages.stream({
    model,
    max_tokens: 32000,
    system: SYSTEM,
    messages: [{ role: 'user', content: JSON.stringify(payload, null, 2) }],
  });
  const resp = await stream.finalMessage();

  const text = resp.content.map(b => (b.type === 'text' ? b.text : '')).join('');
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  if (start === -1 || end <= start) {
    console.error(
      `[ko] 파싱 실패. stop_reason=${resp.stop_reason} blocks=${resp.content.map(b => b.type).join(',')} ` +
        `out_tokens=${resp.usage?.output_tokens}`
    );
    console.error('원문:\n', text.slice(0, 1500));
    process.exit(1);
  }

  const translated: { id: string; memo: string }[] = JSON.parse(text.slice(start, end + 1));
  const map = new Map(translated.map(t => [t.id, t.memo]));

  const missing = DEMO_NOTES.filter(n => !map.get(n.id)?.trim());
  if (missing.length > 0) {
    console.error('[ko] 번역 누락:', missing.map(n => n.id).join(', '));
    process.exit(1);
  }

  const body = DEMO_NOTES.map(
    n => `  { id: ${JSON.stringify(n.id)}, memo: ${JSON.stringify(map.get(n.id))} },`
  ).join('\n');

  writeFileSync(
    OUT,
    `// 자동 생성 파일 — 직접 편집하지 마세요.
// 생성: npx tsx scripts/translate-newton-notes.ts --claude (model: ${model})
// notes.ts의 한국어 판본. 사실·숫자·인용은 원문과 동일해야 합니다.

export const DEMO_NOTES_KO_TEXT: { id: string; memo: string }[] = [
${body}
];
`,
    'utf8'
  );
  console.log(`[ko] 완료 → ${OUT} (${translated.length}건)`);
}

main().catch(err => {
  console.error('[ko] 실패:', err);
  process.exit(1);
});
