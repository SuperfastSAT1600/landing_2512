import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAuthenticated } from '@/lib/server-auth';
import { hasReachedStage } from '@/lib/funnel-stats';
import { getMarketingGroup, MARKETING_GROUPS } from '@/lib/marketing-groups';
import type { MarketingGroup } from '@/lib/marketing-groups';
import { netAmount } from '@/lib/payment-utils';

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

// ── 타입 ──────────────────────────────────────────────────────────────────────

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

// ── 집계 헬퍼 ────────────────────────────────────────────────────────────────

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

// 날짜 문자열(YYYY-MM-DD)이 [from, to] 범위에 속하는지 확인
function inRange(dateStr: string, from: string, to: string): boolean {
  return dateStr >= from && dateStr <= to;
}

function getInquiryDate(s: Pick<StudentRow, 'inquiry_date'>): string {
  return s.inquiry_date!.slice(0, 10);
}

// ── GET handler ───────────────────────────────────────────────────────────────

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

  // ── REQ-001/002: 날짜 범위 계산 (12주 + YoY) ─────────────────────────────
  // 12주 hist: week-1 ~ week-12
  let histFrom = weekStart;
  let histTo = weekStart; // 이번 주 시작 전날
  for (let i = 1; i <= 12; i++) {
    let w = week - i;
    let y = year;
    if (w <= 0) {
      y -= 1;
      const dec28 = new Date(Date.UTC(y, 11, 28));
      w = getISOWeekNumber(dec28) + w;
    }
    const { start, end } = getISOWeekBounds(y, w);
    if (i === 1) { histTo = end; histFrom = start; }
    else if (start < histFrom) histFrom = start;
  }

  // 12주 전 월요일 ~ 지난 주 일요일을 커버하는 단일 범위
  // (이번 주 시작 직전 = weekStart - 1일)
  const prevSunday = new Date(weekStart);
  prevSunday.setUTCDate(prevSunday.getUTCDate() - 1);
  const histRangeEnd = prevSunday.toISOString().slice(0, 10);

  // 12주 시작일: 이번 주차에서 12주 전
  let histYear = year;
  let histWeekNum = week - 12;
  if (histWeekNum <= 0) {
    histYear -= 1;
    const dec28 = new Date(Date.UTC(histYear, 11, 28));
    histWeekNum = getISOWeekNumber(dec28) + histWeekNum;
  }
  const { start: histRangeStart } = getISOWeekBounds(histYear, histWeekNum);

  // YoY 범위
  const { start: yoyStart, end: yoyEnd } = getISOWeekBounds(year - 1, week);

  // ── REQ-002: 모든 쿼리 병렬 실행 ─────────────────────────────────────────
  const [
    thisWeekLeads,
    thisWeekPayments,
    thisWeekSpends,
    histLeads,
    yoyLeads,
  ] = await Promise.all([
    // 이번 주 리드 (월~오늘) — inquiry_date 기준만 사용
    supabaseAdmin
      .from('students')
      .select('id, name, funnel_stage, stage_history, traffic_source, inquiry_date, created_at, retry_strategy_id')
      .gte('inquiry_date', weekStart)
      .lte('inquiry_date', todayStr)
      .then(({ data }) => (data ?? []) as StudentRow[]),

    // 이번 주 결제
    supabaseAdmin
      .from('payments')
      .select('student_id, student_name, amount, payment_type, paid_at, tax_type')
      .gte('paid_at', `${weekStart}T00:00:00`)
      .lte('paid_at', `${todayStr}T23:59:59`)
      .then(({ data }) => data ?? []),

    // 이번 주 광고비
    supabaseAdmin
      .from('marketing_ad_spend')
      .select('amount, channel_group')
      .gte('date', weekStart)
      .lte('date', todayStr)
      .then(({ data }) => data ?? []),

    // REQ-001: 12주 전체를 단일 쿼리 — inquiry_date 기준만 사용
    supabaseAdmin
      .from('students')
      .select('id, traffic_source, inquiry_date, created_at')
      .gte('inquiry_date', histRangeStart)
      .lte('inquiry_date', histRangeEnd)
      .then(({ data }) => (data ?? []) as Pick<StudentRow, 'id' | 'traffic_source' | 'inquiry_date' | 'created_at'>[]),

    // YoY: 작년 동기 주 — inquiry_date 기준만 사용
    supabaseAdmin
      .from('students')
      .select('id, traffic_source, inquiry_date, created_at')
      .gte('inquiry_date', yoyStart)
      .lte('inquiry_date', yoyEnd)
      .then(({ data }) => (data ?? []) as Pick<StudentRow, 'id' | 'traffic_source' | 'inquiry_date' | 'created_at'>[]),
  ]);

  // ── 이번 주 집계 ──────────────────────────────────────────────────────────
  const thisWeek = countByGroup(thisWeekLeads);
  const thisWeekTotal = thisWeekLeads.length;
  const pacePrediction = Math.floor((thisWeekTotal / daysElapsed) * 7);

  const thisWeekContacted = thisWeekLeads.filter(
    (s) => !s.retry_strategy_id && hasReachedStage(s, '2')
  ).length;

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

  const thisWeekAdSpend = thisWeekSpends.reduce((sum, s) => sum + s.amount, 0);
  const thisWeekRoas = thisWeekAdSpend > 0
    ? Math.round((thisWeekRevenue / thisWeekAdSpend) * 100) / 100
    : null;

  // ── REQ-001: 12주 hist — JS에서 주차별 그루핑 ────────────────────────────
  // 각 리드를 ISO 주차 키(YYYY-WW)로 분류
  const weekBuckets = new Map<string, Record<MarketingGroup, number>>();

  for (let i = 1; i <= 12; i++) {
    let w = week - i;
    let y = year;
    if (w <= 0) {
      y -= 1;
      const dec28 = new Date(Date.UTC(y, 11, 28));
      w = getISOWeekNumber(dec28) + w;
    }
    weekBuckets.set(`${y}-${w}`, Object.fromEntries(
      [...MARKETING_GROUPS, '미분류' as const].map((g) => [g, 0])
    ) as Record<MarketingGroup, number>);
  }

  for (const s of histLeads) {
    const dateStr = getInquiryDate(s);
    const d = new Date(dateStr + 'T12:00:00Z');
    const wKey = `${d.getUTCFullYear() === year - 1 && getISOWeekNumber(d) > 50 ? d.getUTCFullYear() : d.getUTCFullYear()}-${getISOWeekNumber(d)}`;
    const bucket = weekBuckets.get(wKey);
    if (bucket) {
      const group = getMarketingGroup(s.traffic_source);
      bucket[group] = (bucket[group] ?? 0) + 1;
    }
  }

  const validWeeks = weekBuckets.size;
  const histTotals = Object.fromEntries(
    [...MARKETING_GROUPS, '미분류' as const].map((g) => [g, 0])
  ) as Record<MarketingGroup, number>;

  for (const bucket of weekBuckets.values()) {
    for (const [g, cnt] of Object.entries(bucket)) {
      histTotals[g as MarketingGroup] += cnt;
    }
  }

  const histAvg = Object.fromEntries(
    Object.entries(histTotals).map(([g, total]) => [
      g,
      validWeeks > 0 ? Math.round((total / validWeeks) * 10) / 10 : 0,
    ])
  ) as Record<MarketingGroup, number>;

  const histAvgTotal = validWeeks > 0
    ? Math.round((Object.values(histTotals).reduce((a, b) => a + b, 0) / validWeeks) * 10) / 10
    : 0;

  // ── YoY 집계 ──────────────────────────────────────────────────────────────
  const yoyGrouped = yoyLeads.length > 0
    ? countByGroup(yoyLeads as StudentRow[])
    : null;

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
      ? Math.round((thisWeekContacted / thisWeekTotal) * 10000) / 100 : 0,
    this_week_paid: thisWeekPaid,
    this_week_conversion_rate: thisWeekTotal > 0
      ? Math.round((thisWeekPaid / thisWeekTotal) * 10000) / 100 : 0,
    this_week_revenue: thisWeekRevenue,
    this_week_ad_spend: thisWeekAdSpend,
    this_week_roas: thisWeekRoas,
    pace_prediction: pacePrediction,
    yoy_week: yoyGrouped,
    yoy_week_total: yoyLeads.length > 0 ? yoyLeads.length : null,
    yoy_week_label: yoyLeads.length > 0 ? getWeekLabel(year - 1, week) : null,
    hist_weekly_avg: histAvg,
    hist_weekly_avg_total: histAvgTotal,
  };

  return NextResponse.json({ data: result });
}
