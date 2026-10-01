import type { StageHistoryEntry } from '@/lib/enrollment-state';

/**
 * 단계 이동 이력에 항목을 추가한 새 배열을 반환한다 (순수 함수, 입력 불변).
 * 직전 항목과 같은 단계면 추가하지 않는다 — 같은 단계 PATCH가 연달아 와도(더블클릭·중복 전송)
 * 체류 기간 통계가 오염되지 않는다. 5a → 6 → 5a처럼 되돌아오는 이동은 정상이므로 그대로 추가한다.
 */
export function appendStageHistory(
  history: StageHistoryEntry[] | null | undefined,
  stage: string,
  label: string,
  enteredAt: string
): StageHistoryEntry[] {
  const current = Array.isArray(history) ? history : [];
  if (current.length > 0 && current[current.length - 1].stage === stage) return current;
  return [...current, { stage, label, entered_at: enteredAt }];
}
