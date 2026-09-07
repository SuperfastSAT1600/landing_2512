import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAuthenticated } from '@/lib/server-auth';
import { hasReachedStage } from '@/lib/funnel-stats';
import { getMarketingGroup, MARKETING_GROUPS } from '@/lib/marketing-groups';
import type { MarketingGroup } from '@/lib/marketing-groups';
import { netAmount } from '@/lib/payment-utils';
import type { WeeklyStats } from '@/types/marketing';
import { fetchWeeklyGoalRows } from '@/lib/marketing-goals';
import {
  daysElapsedInWeek,
  isoWeekBounds,
  isoWeekOf,
  monthWeekLabel,
  kstDateStr,
  mondayOf,
  recentWeekStarts,
  weekEndOf,
} from '@/lib/marketing-week';

// 주간 목표는 marketing_weekly_goals 에서 온다. 하드코딩 상수는 없다 —
// 목표 미설정 주차는 weekly_target 이 null 이고 UI 가 "목표 미설정"으로 렌더한다.
const HIST_WEEKS = 12;

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

const ALL_GROUPS: MarketingGroup[] = [...MARKETING_GROUPS, '미분류'];

function countByGroup(students: Pick<StudentRow, 'traffic_source'>[]): Record<MarketingGroup, number> {
  const counts = Object.fromEntries(ALL_GROUPS.map((g) => [g, 0])) as Record<MarketingGroup, number>;
  for (const s of students) counts[getMarketingGroup(s.traffic_source)] += 1;
  return counts;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function rate(part: number, whole: number): number {
  return whole > 0 ? Math.round((part / whole) * 10000) / 100 : 0;
}

export async function GET(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED' } }, { status: 401 });
  }

  // 서버는 UTC 로 돌기 때문에 날짜 경계는 KST 로 계산한다 (월요일 오전에 지난주로 밀리는 문제 방지).
  const todayStr = kstDateStr(new Date());
  const weekStart = mondayOf(todayStr);
  const weekEnd = weekEndOf(weekStart);
  const { year, week } = isoWeekOf(weekStart);
  const daysElapsed = daysElapsedInWeek(weekStart, todayStr);

  // 이번 주 + 직전 12주. 목표와 주차별 실적을 쿼리 2회로 가져온다.
  const goalWeeks = recentWeekStarts(HIST_WEEKS + 1, weekStart);
  const { start: yoyStart, end: yoyEnd } = isoWeekBounds(year - 1, week);

  const [thisWeekLeads, thisWeekPayments, thisWeekSpends, goalRows, yoyLeads] = await Promise.all([
    // 이번 주 리드 (월~오늘) — 컨택/결제 판정에 전체 행이 필요하다
    supabaseAdmin
      .from('students')
      .select('id, name, funnel_stage, stage_history, traffic_source, inquiry_date, created_at, retry_strategy_id')
      .gte('inquiry_date', weekStart)
      .lte('inquiry_date', `${todayStr}T23:59:59`)
      .then(({ data }) => (data ?? []) as StudentRow[]),

    supabaseAdmin
      .from('payments')
      .select('student_id, student_name, amount, payment_type, paid_at, tax_type')
      .gte('paid_at', `${weekStart}T00:00:00+09:00`)
      .lte('paid_at', `${todayStr}T23:59:59.999+09:00`)
      .then(({ data }) => data ?? []),

    supabaseAdmin
      .from('marketing_ad_spend')
      .select('amount, channel_group')
      .gte('date', weekStart)
      .lte('date', todayStr)
      .then(({ data }) => data ?? []),

    // 목표 + 주차별 실적 (주차 버킷팅은 marketing-goals 가 담당 — 여기서 중복 구현하지 않는다)
    fetchWeeklyGoalRows(goalWeeks),

    supabaseAdmin
      .from('students')
      .select('id, traffic_source, inquiry_date, created_at')
      .gte('inquiry_date', yoyStart)
      .lte('inquiry_date', `${yoyEnd}T23:59:59`)
      .then(({ data }) => (data ?? []) as Pick<StudentRow, 'traffic_source'>[]),
  ]);

  const currentWeek = goalRows[goalRows.length - 1];
  const histWeeks = goalRows.slice(0, HIST_WEEKS);

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
  const thisWeekRoas =
    thisWeekAdSpend > 0 ? Math.round((thisWeekRevenue / thisWeekAdSpend) * 100) / 100 : null;

  // ── 12주 평균 ─────────────────────────────────────────────────────────────
  const histAvg = Object.fromEntries(
    ALL_GROUPS.map((g) => [
      g,
      histWeeks.length > 0
        ? round1(histWeeks.reduce((sum, w) => sum + w.actuals[g], 0) / histWeeks.length)
        : 0,
    ])
  ) as Record<MarketingGroup, number>;

  const histAvgTotal =
    histWeeks.length > 0
      ? round1(histWeeks.reduce((sum, w) => sum + w.actual_total, 0) / histWeeks.length)
      : 0;

  // ── YoY ───────────────────────────────────────────────────────────────────
  const yoyGrouped = yoyLeads.length > 0 ? countByGroup(yoyLeads) : null;

  const result: WeeklyStats = {
    week_label: monthWeekLabel(weekStart),
    week_number: week,
    year,
    week_start: weekStart,
    week_end: weekEnd,
    days_elapsed: daysElapsed,
    weekly_target: currentWeek.target,
    this_week: thisWeek,
    this_week_total: thisWeekTotal,
    this_week_contacted: thisWeekContacted,
    this_week_contact_rate: rate(thisWeekContacted, thisWeekTotal),
    this_week_paid: thisWeekPaid,
    this_week_conversion_rate: rate(thisWeekPaid, thisWeekTotal),
    this_week_revenue: thisWeekRevenue,
    this_week_ad_spend: thisWeekAdSpend,
    this_week_roas: thisWeekRoas,
    pace_prediction: pacePrediction,
    yoy_week: yoyGrouped,
    yoy_week_total: yoyLeads.length > 0 ? yoyLeads.length : null,
    yoy_week_label: yoyLeads.length > 0 ? monthWeekLabel(yoyStart) : null,
    hist_weekly_avg: histAvg,
    hist_weekly_avg_total: histAvgTotal,
  };

  return NextResponse.json({ data: result });
}
