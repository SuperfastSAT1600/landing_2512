import { kstDate } from '@/lib/kst-date';

const DAY_MS = 24 * 60 * 60 * 1000;

/** 코치 연락 기록은 학생 연락 기록 테이블에 'coach:<코치 key>' 로 구분해 저장한다 */
export const coachContactId = (coachKey: string): string => `coach:${coachKey}`;

/** YYYY-MM-DD 에 일수를 더한다 (UTC 날짜 연산) */
export function addDays(date: string, days: number): string {
  return new Date(new Date(`${date}T00:00:00Z`).getTime() + days * DAY_MS).toISOString().slice(0, 10);
}

export function formatHours(hours: number): string {
  return `${Number(hours.toFixed(1))}h`;
}

export function formatMinutesAsHours(minutes: number): string {
  return formatHours(minutes / 60);
}

export function formatRatio(ratio: number | null): string {
  return ratio === null ? '-' : `${Math.round(ratio)}%`;
}

export function formatDelta(deltaPp: number | null): string {
  if (deltaPp === null) return '-';
  if (Math.abs(deltaPp) < 0.05) return '변동 없음';
  return `${deltaPp > 0 ? '▲' : '▼'}${Math.abs(deltaPp).toFixed(1)}%p`;
}

/** 'M/D' (KST) */
export function formatKstMonthDay(iso: string): string {
  const [, month, day] = kstDate(new Date(iso)).split('-');
  return `${Number(month)}/${Number(day)}`;
}

/** 'M/D HH:mm' (KST) */
export function formatKstDateTime(iso: string): string {
  const kst = new Date(new Date(iso).getTime() + 9 * 60 * 60 * 1000).toISOString();
  return `${Number(kst.slice(5, 7))}/${Number(kst.slice(8, 10))} ${kst.slice(11, 16)}`;
}

/** 마지막 연락이 몇 일 전인지 (KST 날짜 기준, 오늘이면 0) */
export function daysSince(iso: string, now: Date): number {
  const diff = new Date(`${kstDate(now)}T00:00:00Z`).getTime() - new Date(`${kstDate(new Date(iso))}T00:00:00Z`).getTime();
  return Math.round(diff / DAY_MS);
}

export function lastContactLabel(latestIso: string | undefined, now: Date): string {
  if (!latestIso) return '연락 기록 없음';
  const days = daysSince(latestIso, now);
  return days <= 0 ? '마지막 연락 오늘' : `마지막 연락 ${days}일 전`;
}
