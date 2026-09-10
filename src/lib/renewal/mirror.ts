// 재결제 결과(좋은/나쁜 재결제·이탈)를 학생 상담 타임라인과 슬랙에 남길 때 쓰는 문구.
// 분석 정본은 renewal_targets 이고 여기서 만드는 것은 사람이 읽는 흔적이다.
// 선례: src/lib/winback/mirror.ts (윈백 발송 미러) — 같은 구조를 따른다.

import { getRenewalOutcomeQualityLabel, type RenewalOutcomeQuality, type RenewalStage } from '@/types/crm';

export const RENEWAL_OUTCOME_MEMO_HEADER = '🔁 재결제 결과';

export interface RenewalOutcomeMemoInput {
  stage: RenewalStage;
  quality: RenewalOutcomeQuality;
  /** 품질별 목록에서 고른 사유 태그. */
  reasonTag: string;
  /** 자유 메모 — 선택. */
  reasonNote?: string | null;
}

/**
 * 타임라인·슬랙에 같은 본문을 쓴다 — 두 곳의 문구가 갈라지면 대조가 안 된다.
 *
 * 🔁 재결제 결과 · 나쁜 재결제
 * 사유: 할인·조건 요구
 *
 * 20% 깎아주면 연장하겠다고 함
 */
export function buildRenewalOutcomeMemo(input: RenewalOutcomeMemoInput): string {
  const label = getRenewalOutcomeQualityLabel(input.stage, input.quality);
  const note = input.reasonNote?.trim();
  const head = `${RENEWAL_OUTCOME_MEMO_HEADER} · ${label}\n사유: ${input.reasonTag}`;
  return note ? `${head}\n\n${note}` : head;
}
