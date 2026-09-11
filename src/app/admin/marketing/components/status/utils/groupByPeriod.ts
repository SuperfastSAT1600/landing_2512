import { MARKETING_GROUPS } from '@/lib/marketing-groups';
import type { MarketingGroup } from '@/lib/marketing-groups';
import type { MarketingDailyRow } from '@/types/marketing';
import { monthWeekLabel } from '@/lib/marketing-week';
import { WEEK_DEFINITIONS } from '@/lib/week-definitions';

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

/** week-definitions.ts 룩업 — 날짜가 속한 주 정의 반환. 표 범위 밖이면 null. */
function findWeekDef(dateStr: string) {
  return WEEK_DEFINITIONS.find((d) => dateStr >= d.start && dateStr <= d.end) ?? null;
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** 표 범위 밖 날짜용 ISO 월요일 계산 */
function getWeekStart(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}

function makeWeekLabel(weekStart: string, weekEnd: string): string {
  const label = monthWeekLabel(weekStart);
  const sM = new Date(weekStart + 'T00:00:00Z').getUTCMonth() + 1;
  const sD = new Date(weekStart + 'T00:00:00Z').getUTCDate();
  const eM = new Date(weekEnd + 'T00:00:00Z').getUTCMonth() + 1;
  const eD = new Date(weekEnd + 'T00:00:00Z').getUTCDate();
  return `${label} (${sM}/${sD}~${eM}/${eD})`;
}

export function groupByWeek(rows: MarketingDailyRow[], spendByDate: Record<string, number> = {}): WeekRow[] {
  const map = new Map<string, { channels: Record<MarketingGroup, number>; weekEnd: string; defLabel: string | null }>();

  for (const row of rows) {
    const def = findWeekDef(row.date);
    const ws = def ? def.start : getWeekStart(row.date);
    if (!map.has(ws)) {
      const weekEnd = def ? def.end : addDays(ws, 6);
      map.set(ws, { channels: zeroChannels(), weekEnd, defLabel: def ? def.label : null });
    }
    const entry = map.get(ws)!;
    entry.channels[row.group] = (entry.channels[row.group] ?? 0) + row.leads;
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([weekStart, { channels, weekEnd, defLabel }]) => {
      const total = ALL_GROUPS.reduce((s, g) => s + channels[g], 0);
      const spend = sumSpendInRange(spendByDate, weekStart, weekEnd);
      const baseLabel = defLabel ?? monthWeekLabel(weekStart);
      const sM = new Date(weekStart + 'T00:00:00Z').getUTCMonth() + 1;
      const sD = new Date(weekStart + 'T00:00:00Z').getUTCDate();
      const eM = new Date(weekEnd + 'T00:00:00Z').getUTCMonth() + 1;
      const eD = new Date(weekEnd + 'T00:00:00Z').getUTCDate();
      return {
        key: weekStart,
        label: `${baseLabel} (${sM}/${sD}~${eM}/${eD})`,
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
