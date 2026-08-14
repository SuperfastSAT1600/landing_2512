import type { WinbackPlay, WinbackPlayVariant, WinbackTarget } from '@/types/crm';

export interface WinbackDraftStudent {
  name: string;
  grade: string | null;
  parent_phone?: string | null;
  lead_status: string | null;
  churn_tag: string | null;
}

export interface WinbackDraftContext {
  play: Pick<WinbackPlay, 'title' | 'product_brief' | 'product_category' | 'product_price' | 'product_hours' | 'target_exam_date' | 'audience_hint'>;
  variant: Pick<WinbackPlayVariant, 'name' | 'angle'> | null;
  target: Pick<WinbackTarget, 'reason'> & { signals: ReadonlyArray<{ label: string }> };
  student: WinbackDraftStudent;
}

export interface WinbackDraftResult {
  message_draft: string;
}

export const WINBACK_DRAFT_SYSTEM = `당신은 한국 학부모에게 보낼 윈백 카카오톡 문구를 작성하는 세일즈 코치다.
출력은 반드시 JSON 하나만 사용한다. 형식: {"message_draft":"문구"}
문구는 존댓말 한국어 2~4문장, 과장·압박·근거 없는 할인 약속 없이 작성한다. 학생 이름과 상품의 실제 정보만 사용한다. 인사말과 다음 행동 제안을 포함하되, 전화번호나 개인정보를 새로 추측하지 않는다.`;

function value(v: unknown): string {
  return v == null || v === '' ? '-' : String(v);
}

export function buildDraftContext(context: WinbackDraftContext): string {
  const { play, variant, target, student } = context;
  const signals = (target.signals ?? []).map((s) => s.label).filter(Boolean).join(', ');
  return [
    `학생: ${value(student.name)} (${value(student.grade)})`,
    `현재 리드 상태: ${value(student.lead_status)} · 이탈 태그: ${value(student.churn_tag)}`,
    `플레이: ${value(play.title)}`,
    `상품 설명: ${value(play.product_brief)}`,
    `상품 카테고리/가격/시간: ${value(play.product_category)} / ${value(play.product_price)} / ${value(play.product_hours)}`,
    `목표 시험일: ${value(play.target_exam_date)} · 대상 힌트: ${value(play.audience_hint)}`,
    `변형: ${value(variant?.name)} · 접근 각도: ${value(variant?.angle)}`,
    `추천 이유: ${value(target.reason)} · 근거 신호: ${signals || '-'}`,
    '위 정보에 근거해 JSON으로만 답하라.',
  ].join('\n');
}

export function parseDraftResult(text: string): WinbackDraftResult | null {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    const parsed = JSON.parse(text.slice(start, end + 1)) as { message_draft?: unknown };
    const message = typeof parsed.message_draft === 'string' ? parsed.message_draft.trim() : '';
    return message ? { message_draft: message } : null;
  } catch {
    return null;
  }
}
