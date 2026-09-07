/** 마케팅 페이지 공용 표시 헬퍼. */

export function fmt(n: number): string {
  return n.toLocaleString('ko-KR');
}

export function fmtRate(n: number): string {
  return `${n.toFixed(1)}%`;
}

export function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export type Signal = '🟢' | '🟡' | '🔴' | '—';

/**
 * 기준값 대비 판정. 기준값이 null(목표 미설정) 또는 0이면 판정하지 않는다.
 * 채널별 표는 목표를 기준값으로 넘기고, 목표가 없으면 기대치(최근 12주 평균)로 폴백한다.
 */
export function getSignal(actual: number, benchmark: number | null): Signal {
  if (benchmark === null || benchmark === 0) return '—';
  if (actual >= benchmark * 0.9) return '🟢';
  if (actual >= benchmark * 0.5) return '🟡';
  return '🔴';
}

/** 달성률(%) — 목표가 없거나 0이면 계산하지 않는다. */
export function achievementRate(actual: number, goal: number | null): number | null {
  if (goal === null || goal === 0) return null;
  return Math.round((actual / goal) * 100);
}
