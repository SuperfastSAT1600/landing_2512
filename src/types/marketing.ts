import type { MarketingGroup } from '@/lib/marketing-groups';

export type { MarketingGroup };

export interface AdSpend {
  id: string;
  date: string; // YYYY-MM-DD
  channel_group: 'META' | '구글 SEO';
  amount: number; // 원 단위
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface MarketingSourceStats {
  source: string;
  leads: number;
  contacted: number;
  contact_rate: number; // 0~100
  paid: number;
  conversion_rate: number; // 0~100
  revenue: number;
  net_revenue: number;
}

export interface MarketingGroupStats {
  group: MarketingGroup;
  leads: number;
  contacted: number;
  contact_rate: number;
  paid: number;
  conversion_rate: number;
  revenue: number;
  net_revenue: number;
  sources: MarketingSourceStats[];
  // ROI/ROAS — populated on client after ad spend merge
  ad_spend?: number;
  roas?: number;
  roi?: number;
}

export interface MarketingDailyRow {
  date: string; // YYYY-MM-DD
  group: MarketingGroup;
  leads: number;
}

export interface MarketingStatsResponse {
  groups: MarketingGroupStats[];
  daily: MarketingDailyRow[];
}

export interface WeeklyStats {
  week_label: string;
  week_number: number;
  year: number;
  week_start: string;
  week_end: string;
  days_elapsed: number;
  /** 주차 총합 리드 목표. null = 목표 미설정. */
  weekly_target: number | null;
  this_week: Record<MarketingGroup, number>;
  this_week_total: number;
  this_week_contacted: number;
  this_week_contact_rate: number;
  this_week_paid: number;
  this_week_conversion_rate: number;
  this_week_revenue: number;
  this_week_ad_spend: number;
  this_week_roas: number | null;
  pace_prediction: number;
  yoy_week: Record<MarketingGroup, number> | null;
  yoy_week_total: number | null;
  yoy_week_label: string | null;
  hist_weekly_avg: Record<MarketingGroup, number>;
  hist_weekly_avg_total: number;
}
