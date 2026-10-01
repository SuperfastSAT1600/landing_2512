// 재결제 주차 통계(/api/crm/renewal-targets/stats)를 카드 한 줄로 접는 순수 함수.
// Business 개요의 '재결제 전환율' 카드가 쓴다.

export interface RenewalWeekRow {
  week_start: string;
  selected: number;
  completed: number;
}

export interface RenewalTotals {
  selected: number;
  completed: number;
  /** 실제로 데이터가 있던 주차 수 — 조회 기간 전체가 아니다. */
  weeks: number;
  firstWeek: string;
  lastWeek: string;
}

/**
 * 주차 행들을 합산한다. 선정 인원이 하나도 없으면 null(카드는 '-' 표시).
 *
 * weeks/firstWeek/lastWeek 를 함께 돌려주는 이유: 조회 기간이 1년이어도 실제 데이터는
 * 몇 주치뿐일 수 있어서, 카드가 "연간 실적"으로 읽히지 않게 범위를 밝혀야 한다.
 */
export function sumRenewalWeeks(rows: RenewalWeekRow[]): RenewalTotals | null {
  if (rows.length === 0) return null;

  let selected = 0;
  let completed = 0;
  let firstWeek = rows[0].week_start;
  let lastWeek = rows[0].week_start;

  for (const r of rows) {
    selected += r.selected;
    completed += r.completed;
    if (r.week_start < firstWeek) firstWeek = r.week_start;
    if (r.week_start > lastWeek) lastWeek = r.week_start;
  }

  if (selected === 0) return null;
  return { selected, completed, weeks: rows.length, firstWeek, lastWeek };
}

/** "5주 · 08-17~09-14" — 카드 부제에 붙일 커버리지 문구. */
export function renewalCoverageLabel(t: RenewalTotals): string {
  const md = (d: string) => d.slice(5).replace('-', '.');
  return t.weeks === 1
    ? `${md(t.firstWeek)} 주`
    : `${t.weeks}주 · ${md(t.firstWeek)}~${md(t.lastWeek)}`;
}
