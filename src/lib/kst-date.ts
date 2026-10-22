const KST_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** KST 기준 날짜 (YYYY-MM-DD) */
export function kstDate(date: Date): string {
  return new Date(date.getTime() + KST_MS).toISOString().slice(0, 10);
}

export const yesterdayKstDate = (now: Date): string => kstDate(new Date(now.getTime() - DAY_MS));

/** YYYY-MM-DD 형식이고 실제 존재하는 날짜인지 */
export function isValidDateString(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}
