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
