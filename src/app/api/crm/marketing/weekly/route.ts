import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAuthenticated } from '@/lib/server-auth';
import { hasReachedStage } from '@/lib/funnel-stats';
import { getMarketingGroup, MARKETING_GROUPS } from '@/lib/marketing-groups';
import type { MarketingGroup } from '@/lib/marketing-groups';

function netAmount(p: { amount: number; tax_type?: string | null }): number {
  return p.tax_type === '과세' ? Math.round(p.amount * 0.9) : p.amount;
}

export const WEEKLY_TARGET = 35;

// ── ISO 주차 유틸 ─────────────────────────────────────────────────────────────

function getISOWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function getISOWeekBounds(year: number, week: number): { start: string; end: string } {
  // ISO 1주차의 목요일이 해당 연도에 속함 → 1월 4일이 항상 1주차
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Day = jan4.getUTCDay() || 7;
  const monday = new Date(jan4);
  monday.setUTCDate(jan4.getUTCDate() - jan4Day + 1 + (week - 1) * 7);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  return {
    start: monday.toISOString().slice(0, 10),
    end: sunday.toISOString().slice(0, 10),
  };
}

function getDaysElapsed(weekStart: string, today: string): number {
  const start = new Date(weekStart);
  const end = new Date(today);
  const diff = Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;
  return Math.max(1, Math.min(diff, 7));
}

function getWeekLabel(year: number, week: number): string {
  return `${year}년 ${week}주차`;
}

// ── 학생 집계 헬퍼 ────────────────────────────────────────────────────────────

type StudentRow = {
  id: string;
  name: string;
  funnel_stage: string;
  stage_history: { stage: string; label: string; entered_at: string }[] | null;
  traffic_source: string | null;
  inquiry_date: string | null;
  created_at: string;
  retry_strategy_id: string | null;
};

function countByGroup(students: StudentRow[]): Record<MarketingGroup, number> {
  const counts = Object.fromEntries(
    [...MARKETING_GROUPS, '미분류' as const].map((g) => [g, 0])
  ) as Record<MarketingGroup, number>;

  for (const s of students) {
    const group = getMarketingGroup(s.traffic_source);
    counts[group] = (counts[group] ?? 0) + 1;
  }
  return counts;
}

async function fetchLeadsInRange(from: string, to: string): Promise<StudentRow[]> {
  const { data } = await supabaseAdmin
    .from('students')
    .select('id, name, funnel_stage, stage_history, traffic_source, inquiry_date, created_at, retry_strategy_id')
    .or(`inquiry_date.gte.${from},and(inquiry_date.is.null,created_at.gte.${from})`)
    .or(`inquiry_date.lte.${to},and(inquiry_date.is.null,created_at.lte.${to})`);
  return data ?? [];
}

// ── GET handler ───────────────────────────────────────────────────────────────

export interface WeeklyStats {
  week_label: string;
  week_number: number;
  year: number;
  week_start: string;
  week_end: string;
  days_elapsed: number;
  weekly_target: number;
  this_week: Record<MarketingGroup, number>;
  this_week_total: number;
  this_week_contacted: number;
  this_week_contact_rate: number;  // 0~100
  this_week_paid: number;
  this_week_conversion_rate: number; // 0~100
  this_week_revenue: number;
  this_week_ad_spend: number;
  this_week_roas: number | null; // null if no ad spend
  pace_prediction: number;
  yoy_week: Record<MarketingGroup, number> | null;
  yoy_week_total: number | null;
  yoy_week_label: string | null;
  hist_weekly_avg: Record<MarketingGroup, number>;
  hist_weekly_avg_total: number;
}

export async function GET(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED' } }, { status: 401 });
  }

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const year = now.getUTCFullYear();
  const week = getISOWeekNumber(now);

  const { start: weekStart, end: weekEnd } = getISOWeekBounds(year, week);
  const daysElapsed = getDaysElapsed(weekStart, todayStr);

  // ── 이번 주 리드 + 컨택·결제·매출·광고비 ────────────────────────────────────
  const [thisWeekLeads, thisWeekPayments, thisWeekSpends] = await Promise.all([
    fetchLeadsInRange(weekStart, todayStr),
    supabaseAdmin
      .from('payments')
      .select('student_id, student_name, amount, payment_type, paid_at, tax_type')
      .gte('paid_at', `${weekStart}T00:00:00`)
      .lte('paid_at', `${todayStr}T23:59:59`)
      .then(({ data }) => data ?? []),
    supabaseAdmin
      .from('marketing_ad_spend')
      .select('amount, channel_group')
      .gte('date', weekStart)
      .lte('date', todayStr)
      .then(({ data }) => data ?? []),
  ]);

  const thisWeek = countByGroup(thisWeekLeads);
  const thisWeekTotal = thisWeekLeads.length;
  const pacePrediction = Math.floor((thisWeekTotal / daysElapsed) * 7);

  // 컨택 성공 (retry 제외, stage 2 이상 도달)
  const thisWeekContacted = thisWeekLeads.filter(
    (s) => !s.retry_strategy_id && hasReachedStage(s, '2')
  ).length;

  // 결제 집계 (이번 주 paid_at 기준 최초결제)
  const paidStudentIds = new Set<string>();
  const paidStudentNames = new Set<string>();
  let thisWeekRevenue = 0;
  for (const p of thisWeekPayments) {
    thisWeekRevenue += netAmount(p);
    if (p.payment_type === '최초결제') {
      if (p.student_id) paidStudentIds.add(p.student_id);
      if (p.student_name) paidStudentNames.add(p.student_name);
    }
  }
  const thisWeekPaid = thisWeekLeads.filter(
    (s) => paidStudentIds.has(s.id) || paidStudentNames.has(s.name)
  ).length;

  // 광고비 합계
  const thisWeekAdSpend = thisWeekSpends.reduce((sum, s) => sum + s.amount, 0);
  const thisWeekRoas = thisWeekAdSpend > 0 ? Math.round((thisWeekRevenue / thisWeekAdSpend) * 100) / 100 : null;

  // ── 작년 동기 ────────────────────────────────────────────────────────────────
  let yoyWeek: Record<MarketingGroup, number> | null = null;
  let yoyTotal: number | null = null;
  let yoyLabel: string | null = null;

  try {
    const { start: yoyStart, end: yoyEnd } = getISOWeekBounds(year - 1, week);
    const yoyLeads = await fetchLeadsInRange(yoyStart, yoyEnd);
    if (yoyLeads.length > 0) {
      yoyWeek = countByGroup(yoyLeads);
      yoyTotal = yoyLeads.length;
      yoyLabel = getWeekLabel(year - 1, week);
    }
  } catch {
    // YoY 데이터 없어도 계속
  }

  // ── 최근 12주 평균 ──────────────────────────────────────────────────────────
  const histTotals = Object.fromEntries(
    [...MARKETING_GROUPS, '미분류' as const].map((g) => [g, 0])
  ) as Record<MarketingGroup, number>;
  let validWeeks = 0;

  for (let i = 1; i <= 12; i++) {
    let w = week - i;
    let y = year;
    if (w <= 0) {
      y -= 1;
      // 작년 마지막 주차 계산
      const dec28 = new Date(Date.UTC(y, 11, 28));
      w = getISOWeekNumber(dec28) + w;
    }
    try {
      const { start, end } = getISOWeekBounds(y, w);
      const leads = await fetchLeadsInRange(start, end);
      const counts = countByGroup(leads);
      for (const [g, cnt] of Object.entries(counts)) {
        histTotals[g as MarketingGroup] = (histTotals[g as MarketingGroup] ?? 0) + cnt;
      }
      validWeeks++;
    } catch {
      // 개별 주 실패는 무시
    }
  }

  const histAvg = Object.fromEntries(
    Object.entries(histTotals).map(([g, total]) => [
      g,
      validWeeks > 0 ? Math.round((total / validWeeks) * 10) / 10 : 0,
    ])
  ) as Record<MarketingGroup, number>;

  const histAvgTotal =
    validWeeks > 0
      ? Math.round(
          (Object.values(histTotals).reduce((a, b) => a + b, 0) / validWeeks) * 10
        ) / 10
      : 0;

  const result: WeeklyStats = {
    week_label: getWeekLabel(year, week),
    week_number: week,
    year,
    week_start: weekStart,
    week_end: weekEnd,
    days_elapsed: daysElapsed,
    weekly_target: WEEKLY_TARGET,
    this_week: thisWeek,
    this_week_total: thisWeekTotal,
    this_week_contacted: thisWeekContacted,
    this_week_contact_rate: thisWeekTotal > 0
      ? Math.round((thisWeekContacted / thisWeekTotal) * 10000) / 100
      : 0,
    this_week_paid: thisWeekPaid,
    this_week_conversion_rate: thisWeekTotal > 0
      ? Math.round((thisWeekPaid / thisWeekTotal) * 10000) / 100
      : 0,
    this_week_revenue: thisWeekRevenue,
    this_week_ad_spend: thisWeekAdSpend,
    this_week_roas: thisWeekRoas,
    pace_prediction: pacePrediction,
    yoy_week: yoyWeek,
    yoy_week_total: yoyTotal,
    yoy_week_label: yoyLabel,
    hist_weekly_avg: histAvg,
    hist_weekly_avg_total: histAvgTotal,
  };

  return NextResponse.json({ data: result });
}
