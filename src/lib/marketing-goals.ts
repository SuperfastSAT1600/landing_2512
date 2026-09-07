import { supabaseAdmin } from '@/lib/supabase-admin';
import { getMarketingGroup, MARKETING_GROUPS } from '@/lib/marketing-groups';
import type { MarketingGroup } from '@/lib/marketing-groups';
import { mondayOf, shiftWeekStart, weekEndOf, weekLabelOf } from '@/lib/marketing-week';

/**
 * 주차별 마케팅 리드 목표(총합) + 소스별 실적 집계.
 *
 * 목표는 주차당 1건(총합)만 저장한다 — 소스별 목표는 없다.
 * 소스별 유입은 목표가 아니라 자동 집계 현황이며, 리드 정의는 Business 한국비즈니스
 * (crm-stats-service 의 computeCrmStats segment='all')와 동일하다:
 *   students.inquiry_date 가 주차 범위에 든 리드, 업체(company_id) 제외 없음.
 * 이 동일성은 src/lib/__tests__/marketing-goals-parity.test.ts 가 지킨다.
 *
 * 추이 차트/크론이 이 함수를 in-process 로 호출한다 — Vercel 크론이 자기 API 를
 * HTTP 로 되부르면 SSO 페이지를 200 으로 받아 조용히 망가진다.
 */

const ALL_GROUPS: MarketingGroup[] = [...MARKETING_GROUPS, '미분류'];

export interface MarketingWeeklyGoalRecord {
  week_start: string;
  target_count: number;
}

export interface WeeklyGoalRow {
  week_start: string;
  week_end: string;
  week_label: string;
  /** 주차 총합 목표. null = 목표 미설정 (0 은 "의도한 0개 목표"로 다르다). */
  target: number | null;
  actuals: Record<MarketingGroup, number>;
  actual_total: number;
  /** target 이 null 또는 0 이면 null. */
  achievement_rate: number | null;
}

function emptyActuals(): Record<MarketingGroup, number> {
  return Object.fromEntries(ALL_GROUPS.map((g) => [g, 0])) as Record<MarketingGroup, number>;
}

function rate(actual: number, target: number | null): number | null {
  if (target === null || target === 0) return null;
  return Math.round((actual / target) * 100);
}

/** 주차 → 총합 목표. 행이 없으면 null. */
async function loadTargets(weekStarts: string[]): Promise<Map<string, number | null>> {
  const { data, error } = await supabaseAdmin
    .from('marketing_weekly_goals')
    .select('week_start, target_count')
    .gte('week_start', weekStarts[0])
    .lte('week_start', weekStarts[weekStarts.length - 1]);

  if (error) throw new Error(`마케팅 목표 조회 실패: ${error.message}`);

  const byWeek = new Map<string, number | null>(weekStarts.map((w) => [w, null]));
  for (const row of (data ?? []) as MarketingWeeklyGoalRecord[]) {
    const key = row.week_start.slice(0, 10);
    if (byWeek.has(key)) byWeek.set(key, row.target_count);
  }
  return byWeek;
}

/** 주차 → 소스 그룹별 실적. 단일 쿼리 후 JS 에서 월요일 기준 버킷팅. */
async function loadActuals(weekStarts: string[]): Promise<Map<string, Record<MarketingGroup, number>>> {
  const rangeStart = weekStarts[0];
  const rangeEnd = shiftWeekStart(weekStarts[weekStarts.length - 1], 1);

  const { data, error } = await supabaseAdmin
    .from('students')
    .select('traffic_source, inquiry_date')
    .gte('inquiry_date', rangeStart)
    .lt('inquiry_date', rangeEnd);

  if (error) throw new Error(`마케팅 실적 조회 실패: ${error.message}`);

  const byWeek = new Map(weekStarts.map((w) => [w, emptyActuals()]));
  for (const row of (data ?? []) as { traffic_source: string | null; inquiry_date: string | null }[]) {
    if (!row.inquiry_date) continue;
    const week = byWeek.get(mondayOf(row.inquiry_date));
    if (!week) continue;
    week[getMarketingGroup(row.traffic_source)] += 1;
  }
  return byWeek;
}

/** 주차 키 배열(과거 → 현재 순)에 대한 목표·실적 집계. */
export async function fetchWeeklyGoalRows(weekStarts: string[]): Promise<WeeklyGoalRow[]> {
  if (weekStarts.length === 0) return [];

  const targetsByWeek = await loadTargets(weekStarts);
  const actualsByWeek = await loadActuals(weekStarts);

  return weekStarts.map((weekStart) => {
    const target = targetsByWeek.get(weekStart) ?? null;
    const actuals = actualsByWeek.get(weekStart) ?? emptyActuals();
    const actualTotal = ALL_GROUPS.reduce((sum, g) => sum + actuals[g], 0);

    return {
      week_start: weekStart,
      week_end: weekEndOf(weekStart),
      week_label: weekLabelOf(weekStart),
      target,
      actuals,
      actual_total: actualTotal,
      achievement_rate: rate(actualTotal, target),
    };
  });
}

/** 단일 주차의 총합 목표. weekly 라우트가 히어로 위젯용으로 쓴다. */
export async function fetchWeekTarget(weekStart: string): Promise<number | null> {
  const targets = await loadTargets([weekStart]);
  return targets.get(weekStart) ?? null;
}
