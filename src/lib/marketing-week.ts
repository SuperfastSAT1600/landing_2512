/**
 * 마케팅 주차 유틸 — 주차 키는 "해당 주 월요일"(YYYY-MM-DD), 라벨은 ISO 주차.
 *
 * Vercel 서버는 UTC 로 돌기 때문에 `new Date().toISOString()` 을 그대로 쓰면
 * 월요일 00:00~09:00 KST 사이에 아직 일요일로 계산되어 "이번 주"가 지난주로 밀린다.
 * 날짜 경계가 필요한 곳은 반드시 kstDateStr 을 거친다.
 *
 * src/lib/week-definitions.ts 의 고정 주차 테이블(2026-12-27 종료)에는 의존하지 않는다.
 */

const DAY_MS = 86400000;
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** 주차 키/날짜 문자열은 YYYY-MM-DD 만 쓴다. timestamp 가 와도 날짜만 취한다. */
function dateOnly(value: string): string {
  return value.slice(0, 10);
}

function toUtcDate(dateStr: string): Date {
  return new Date(`${dateOnly(dateStr)}T00:00:00Z`);
}

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** 월=1 … 일=7 (ISO). */
function isoDayOfWeek(d: Date): number {
  return d.getUTCDay() || 7;
}

/** 현재 시각의 KST 날짜. */
export function kstDateStr(now: Date): string {
  return new Date(now.getTime() + KST_OFFSET_MS).toISOString().slice(0, 10);
}

/** ISO 주차. year 는 달력 연도가 아니라 ISO 주차 연도(그 주 목요일의 연도)다. */
export function isoWeekOf(dateStr: string): { year: number; week: number } {
  const thursday = toUtcDate(dateStr);
  thursday.setUTCDate(thursday.getUTCDate() + 4 - isoDayOfWeek(thursday));
  const year = thursday.getUTCFullYear();
  const yearStart = Date.UTC(year, 0, 1);
  const week = Math.ceil(((thursday.getTime() - yearStart) / DAY_MS + 1) / 7);
  return { year, week };
}

/** ISO 주차의 월요일~일요일 경계. */
export function isoWeekBounds(year: number, week: number): { start: string; end: string } {
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const monday = new Date(jan4);
  monday.setUTCDate(jan4.getUTCDate() - isoDayOfWeek(jan4) + 1 + (week - 1) * 7);
  const sunday = new Date(monday.getTime() + 6 * DAY_MS);
  return { start: toDateStr(monday), end: toDateStr(sunday) };
}

/** 주차 키 — 해당 날짜가 속한 주의 월요일. */
export function mondayOf(dateStr: string): string {
  const d = toUtcDate(dateStr);
  d.setUTCDate(d.getUTCDate() - isoDayOfWeek(d) + 1);
  return toDateStr(d);
}

/** 주차 종료일 — 해당 주 일요일. */
export function weekEndOf(weekStart: string): string {
  return toDateStr(new Date(toUtcDate(weekStart).getTime() + 6 * DAY_MS));
}

export function isoWeekLabel(year: number, week: number): string {
  return `${year}년 ${week}주차`;
}

/**
 * 팀이 쓰는 "몇월 몇주차" 라벨 — 예: '26년 09월 01주차'.
 *
 * 규칙은 그 주 목요일이 속한 달의 몇 번째 목요일인가다. 그래서 8/31~9/6 주는 9월 01주차가 된다.
 * src/lib/week-definitions.ts 의 수동 주차표 111개 행과 전부 일치하는 것을 확인했고,
 * 계산식이므로 그 표가 끝나는 2026-12-27 이후에도 동작한다.
 */
export function monthWeekLabel(weekStart: string): string {
  const thursday = new Date(toUtcDate(weekStart).getTime() + 3 * DAY_MS);
  const year = thursday.getUTCFullYear();
  const month = thursday.getUTCMonth();

  const firstOfMonth = new Date(Date.UTC(year, month, 1));
  const daysToFirstThursday = (4 - isoDayOfWeek(firstOfMonth) + 7) % 7;
  const firstThursday = new Date(firstOfMonth.getTime() + daysToFirstThursday * DAY_MS);
  const nth = Math.floor((thursday.getTime() - firstThursday.getTime()) / (7 * DAY_MS)) + 1;

  return `${String(year % 100).padStart(2, '0')}년 ${String(month + 1).padStart(2, '0')}월 ${String(nth).padStart(2, '0')}주차`;
}

/** 화면·리포트에서 쓰는 주차 라벨. */
export function weekLabelOf(weekStart: string): string {
  return monthWeekLabel(weekStart);
}

export function shiftWeekStart(weekStart: string, offset: number): string {
  return toDateStr(new Date(toUtcDate(weekStart).getTime() + offset * 7 * DAY_MS));
}

/** 과거 → 현재 순으로 count 개의 주차 키. 마지막 원소가 asOfWeekStart. */
export function recentWeekStarts(count: number, asOfWeekStart: string): string[] {
  return Array.from({ length: count }, (_, i) =>
    shiftWeekStart(asOfWeekStart, i - (count - 1))
  );
}

/** 주차 내 경과 일수 (월요일=1, 일요일=7). 범위를 벗어나면 클램프한다. */
export function daysElapsedInWeek(weekStart: string, todayKst: string): number {
  const diff =
    Math.floor((toUtcDate(todayKst).getTime() - toUtcDate(weekStart).getTime()) / DAY_MS) + 1;
  return Math.max(1, Math.min(diff, 7));
}
