// CRM 화면 공용 표시 포매터.

const DAY_MS = 86_400_000;

/** 1200000 → '1,200,000원' */
export const won = (n: number) => `${n.toLocaleString()}원`;

/** 1234567 → '123만' (0은 '0') */
export const manwon = (n: number) => (n === 0 ? '0' : `${Math.round(n / 10000).toLocaleString()}만`);

/** KST 기준 짧은 날짜(월·일). 값이 없으면 '-'. */
export function kstShortDate(s: string | null | undefined): string {
  if (!s) return '-';
  return new Date(s).toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul', month: '2-digit', day: '2-digit' });
}

/** dateStr 이후 경과한 일수(내림). */
export function daysSince(dateStr: string, nowMs: number = Date.now()): number {
  return Math.floor((nowMs - new Date(dateStr).getTime()) / DAY_MS);
}
