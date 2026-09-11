import { MARKETING_GROUPS } from '@/lib/marketing-groups';
import type { MarketingGroup } from '@/lib/marketing-groups';
import type { MarketingDailyRow } from '@/types/marketing';

export interface WeekRow {
  key: string;
  label: string;
  weekStart: string;
  weekEnd: string;
  channels: Record<MarketingGroup, number>;
  total: number;
  mix: Record<MarketingGroup, number>;
  spend: number;
  cpl: number | null;
}

export interface MonthRow {
  key: string;
  label: string;
  channels: Record<MarketingGroup, number>;
  total: number;
  mix: Record<MarketingGroup, number>;
  spend: number;
  cpl: number | null;
}

const ALL_GROUPS: MarketingGroup[] = [...MARKETING_GROUPS, '미분류'];

function zeroChannels(): Record<MarketingGroup, number> {
  return Object.fromEntries(ALL_GROUPS.map((g) => [g, 0])) as Record<MarketingGroup, number>;
}

function calcMix(channels: Record<MarketingGroup, number>, total: number): Record<MarketingGroup, number> {
  if (total === 0) return zeroChannels();
  return Object.fromEntries(
    ALL_GROUPS.map((g) => [g, Math.round((channels[g] / total) * 100)])
  ) as Record<MarketingGroup, number>;
}

/** ISO 월요일 기준 weekStart (YYYY-MM-DD) */
function getWeekStart(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

/** 해당 월 기준 몇 번째 월요일 주인지 (1-based) */
function weekOfMonth(weekStartStr: string): number {
  const ws = new Date(weekStartStr + 'T00:00:00');
  const year = ws.getFullYear();
  const month = ws.getMonth();
  // 해당 월 1일의 첫 번째 월요일 주 시작
  let count = 0;
  for (let d = new Date(year, month, 1); d <= ws; d.setDate(d.getDate() + 7)) {
    // 이 날이 속한 주의 월요일
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const monDate = new Date(d);
    monDate.setDate(monDate.getDate() + diff);
    if (monDate.getMonth() <= month) count++;
  }
  return count;
}

function makeWeekLabel(weekStart: string, weekEnd: string): string {
  const ws = new Date(weekStart + 'T00:00:00');
  const year = ws.getFullYear();
  const month = ws.getMonth() + 1;
  const wNum = weekOfMonth(weekStart);
  const sM = new Date(weekStart + 'T00:00:00').getMonth() + 1;
  const sD = new Date(weekStart + 'T00:00:00').getDate();
  const eM = new Date(weekEnd + 'T00:00:00').getMonth() + 1;
  const eD = new Date(weekEnd + 'T00:00:00').getDate();
  const range = `${sM}/${sD}~${eM}/${eD}`;
  return `${year}년 ${month}월 W${wNum} (${range})`;
}

export function groupByWeek(rows: MarketingDailyRow[], spendByDate: Record<string, number> = {}): WeekRow[] {
  const map = new Map<string, { channels: Record<MarketingGroup, number>; weekEnd: string }>();

  for (const row of rows) {
    const ws = getWeekStart(row.date);
    if (!map.has(ws)) {
      map.set(ws, { channels: zeroChannels(), weekEnd: addDays(ws, 6) });
    }
    const entry = map.get(ws)!;
    entry.channels[row.group] = (entry.channels[row.group] ?? 0) + row.leads;
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([weekStart, { channels, weekEnd }]) => {
      const total = ALL_GROUPS.reduce((s, g) => s + channels[g], 0);
      const spend = sumSpendInRange(spendByDate, weekStart, weekEnd);
      return {
        key: weekStart,
        label: makeWeekLabel(weekStart, weekEnd),
        weekStart,
        weekEnd,
        channels,
        total,
        mix: calcMix(channels, total),
        spend,
        cpl: total > 0 && spend > 0 ? Math.round(spend / total) : null,
      };
    });
}

export function groupByMonth(rows: MarketingDailyRow[], spendByDate: Record<string, number> = {}): MonthRow[] {
  const map = new Map<string, Record<MarketingGroup, number>>();

  for (const row of rows) {
    const key = row.date.slice(0, 7); // "YYYY-MM"
    if (!map.has(key)) map.set(key, zeroChannels());
    const ch = map.get(key)!;
    ch[row.group] = (ch[row.group] ?? 0) + row.leads;
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, channels]) => {
      const [y, m] = key.split('-');
      const total = ALL_GROUPS.reduce((s, g) => s + channels[g], 0);
      const monthStart = key + '-01';
      const lastDay = new Date(parseInt(y), parseInt(m), 0).getDate();
      const monthEnd = `${key}-${String(lastDay).padStart(2, '0')}`;
      const spend = sumSpendInRange(spendByDate, monthStart, monthEnd);
      return {
        key,
        label: `${y}년 ${parseInt(m)}월`,
        channels,
        total,
        mix: calcMix(channels, total),
        spend,
        cpl: total > 0 && spend > 0 ? Math.round(spend / total) : null,
      };
    });
}

function sumSpendInRange(spendByDate: Record<string, number>, start: string, end: string): number {
  let total = 0;
  for (const [date, amount] of Object.entries(spendByDate)) {
    if (date >= start && date <= end) total += amount;
  }
  return total;
}
