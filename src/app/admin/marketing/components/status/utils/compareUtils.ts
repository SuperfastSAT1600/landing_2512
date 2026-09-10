import type { MarketingGroup } from '@/lib/marketing-groups';

export interface ChannelComparison {
  channel: MarketingGroup;
  current: number;
  previous: number;
  delta: number;
  deltaRate: number | null;
}

export interface PeriodComparison {
  currentLabel: string;
  previousLabel: string;
  channels: ChannelComparison[];
  totalCurrent: number;
  totalPrevious: number;
  totalDelta: number;
  totalDeltaRate: number | null;
}

export function calcDeltaRate(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

export function getMonthRange(year: number, month: number): { from: string; to: string } {
  const pad = (n: number) => String(n).padStart(2, '0');
  const from = `${year}-${pad(month)}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const to = `${year}-${pad(month)}-${pad(lastDay)}`;
  return { from, to };
}

export function getQuarterRange(
  year: number,
  quarter: 1 | 2 | 3 | 4
): { from: string; to: string } {
  const startMonth = (quarter - 1) * 3 + 1;
  const endMonth = startMonth + 2;
  const { from } = getMonthRange(year, startMonth);
  const { to } = getMonthRange(year, endMonth);
  return { from, to };
}

export function getCurrentQuarter(date: Date): { year: number; quarter: 1 | 2 | 3 | 4 } {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const quarter = (Math.ceil(month / 3)) as 1 | 2 | 3 | 4;
  return { year, quarter };
}

export function getPreviousQuarter(
  year: number,
  quarter: 1 | 2 | 3 | 4
): { year: number; quarter: 1 | 2 | 3 | 4 } {
  if (quarter === 1) return { year: year - 1, quarter: 4 };
  return { year, quarter: (quarter - 1) as 1 | 2 | 3 | 4 };
}

export function getMonthLabel(year: number, month: number): string {
  return `${year}년 ${month}월`;
}

export function getQuarterLabel(year: number, quarter: number): string {
  return `${year}년 Q${quarter}`;
}
