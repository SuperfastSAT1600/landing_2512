import { MARKETING_GROUPS } from '@/lib/marketing-groups';
import type { MarketingGroup } from '@/lib/marketing-groups';
import type { WeeklyStats } from '@/types/marketing';

const ALL: MarketingGroup[] = [...MARKETING_GROUPS, '미분류'];

export function zeroCounts(over: Partial<Record<MarketingGroup, number>> = {}) {
  return {
    ...(Object.fromEntries(ALL.map((g) => [g, 0])) as Record<MarketingGroup, number>),
    ...over,
  };
}

export function weeklyStats(over: Partial<WeeklyStats> = {}): WeeklyStats {
  return {
    week_label: '2026년 36주차',
    week_number: 36,
    year: 2026,
    week_start: '2026-08-31',
    week_end: '2026-09-06',
    days_elapsed: 4,
    weekly_target: null,
    this_week: zeroCounts(),
    this_week_total: 0,
    this_week_contacted: 0,
    this_week_contact_rate: 0,
    this_week_paid: 0,
    this_week_conversion_rate: 0,
    this_week_revenue: 0,
    this_week_ad_spend: 0,
    this_week_roas: null,
    pace_prediction: 0,
    yoy_week: null,
    yoy_week_total: null,
    yoy_week_label: null,
    hist_weekly_avg: zeroCounts(),
    hist_weekly_avg_total: 0,
    ...over,
  };
}
