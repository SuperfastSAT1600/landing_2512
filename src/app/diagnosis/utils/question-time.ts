/** 한 문제에 머문 시간(초). 시험 제한 시간을 넘는 값은 잘라서 기록한다. */
export function questionElapsedSeconds(
  questionStartMs: number,
  nowMs: number,
  timeLimitMinutes: number | null | undefined
): number {
  const raw = Math.max(0, Math.floor((nowMs - questionStartMs) / 1000));
  return timeLimitMinutes ? Math.min(raw, timeLimitMinutes * 60) : raw;
}
