import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAuthenticated } from '@/lib/server-auth';
import { getWeekDefByStart, weekByOffset } from '@/lib/week-definitions';
import {
  WEEKLY_PLAN_METRIC_KEYS,
  isRetroFilled,
  type WeeklyPlanMetricKey,
  type WeeklyPlanResponse,
  type WeeklyPlanSegment,
} from '@/types/crm';
import { buildPlanPatch, normalizePlanRow } from './sanitize';
import { fetchWeeklyExecution } from './fetch-execution';

const VALID_SEGMENTS = ['b2c', 'b2b'] as const;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// stats overview 필드 → 목표 지표 매핑 (b2c/b2b overview 공통 필드명)
const OVERVIEW_MAP: Record<WeeklyPlanMetricKey, string> = {
  leads: 'total_leads',
  contacted: 'contacted',
  paid: 'paid',
  revenue: 'total_revenue',
  net_revenue: 'total_net_revenue',
};

/** 같은 주차의 실제치를 기존 stats 라우트에서 계산(목표 vs 실적 일관성 보장). */
async function fetchActuals(
  origin: string,
  adminKey: string,
  segment: WeeklyPlanSegment,
  from: string,
  to: string,
): Promise<Partial<Record<WeeklyPlanMetricKey, number>>> {
  const path = segment === 'b2b' ? '/api/crm/b2b/stats' : '/api/crm/stats';
  try {
    const res = await fetch(`${origin}${path}?from=${from}&to=${to}`, {
      headers: { 'x-admin-key': adminKey },
    });
    if (!res.ok) return {};
    const json = await res.json();
    const o = json?.data?.overview ?? {};
    const out: Partial<Record<WeeklyPlanMetricKey, number>> = {};
    for (const key of WEEKLY_PLAN_METRIC_KEYS) {
      const v = o[OVERVIEW_MAP[key]];
      if (typeof v === 'number') out[key] = v;
    }
    return out;
  } catch {
    return {};
  }
}

/** 직전 주차의 회고 작성 여부 — '지난주 회고 쓰기' 배너 판정용. */
async function fetchPrevMeta(segment: WeeklyPlanSegment, weekStart: string) {
  const prev = weekByOffset(weekStart, -1);
  if (!prev) return null;
  const { data } = await supabaseAdmin
    .from('weekly_plans')
    .select('retrospective')
    .eq('segment', segment)
    .eq('week_start', prev.start)
    .maybeSingle();
  const retro = normalizePlanRow({ ...(data ?? {}), segment, week_start: prev.start })?.retrospective;
  return { week_start: prev.start, week_label: prev.label, retro_filled: isRetroFilled(retro) };
}

// GET /api/crm/weekly-plan?segment=&week_start=
export async function GET(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sp = request.nextUrl.searchParams;
  const segment = sp.get('segment') as WeeklyPlanSegment | null;
  const weekStart = sp.get('week_start');

  if (!segment || !(VALID_SEGMENTS as readonly string[]).includes(segment)) {
    return NextResponse.json({ error: 'segment은 b2c|b2b 중 하나여야 합니다.' }, { status: 400 });
  }
  if (!weekStart || !DATE_RE.test(weekStart)) {
    return NextResponse.json({ error: 'week_start는 YYYY-MM-DD 형식이어야 합니다.' }, { status: 400 });
  }
  const week = getWeekDefByStart(weekStart);
  if (!week) {
    return NextResponse.json({ error: '주차 정의에 없는 week_start입니다.' }, { status: 400 });
  }

  const { data: row } = await supabaseAdmin
    .from('weekly_plans')
    .select('*')
    .eq('segment', segment)
    .eq('week_start', weekStart)
    .maybeSingle();

  const plan = normalizePlanRow(row);
  const adminKey = request.headers.get('x-admin-key') ?? '';

  const [actuals, execution, prev] = await Promise.all([
    fetchActuals(request.nextUrl.origin, adminKey, segment, week.start, week.end),
    fetchWeeklyExecution(segment, { start: week.start, end: week.end }, plan?.focus_strategies ?? []),
    fetchPrevMeta(segment, weekStart),
  ]);

  const body: WeeklyPlanResponse = {
    plan,
    actuals,
    week: { start: week.start, end: week.end, label: week.label },
    execution,
    prev,
  };
  return NextResponse.json({ data: body });
}

// PUT /api/crm/weekly-plan — body에 있는 필드만 업서트 (팀 공용 last-write-wins)
export async function PUT(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const segment = body.segment as string | undefined;
  const week_start = body.week_start as string | undefined;
  if (!segment || !(VALID_SEGMENTS as readonly string[]).includes(segment)) {
    return NextResponse.json({ error: 'segment은 b2c|b2b 중 하나여야 합니다.' }, { status: 400 });
  }
  if (!week_start || !DATE_RE.test(week_start) || !getWeekDefByStart(week_start)) {
    return NextResponse.json({ error: 'week_start가 올바르지 않습니다.' }, { status: 400 });
  }

  const patch = buildPlanPatch(body);
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: '저장할 내용이 없습니다.' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('weekly_plans')
    .upsert(
      { segment, week_start, ...patch, updated_at: new Date().toISOString() },
      { onConflict: 'segment,week_start' },
    )
    .select()
    .single();

  if (error) {
    console.error('[weekly-plan PUT]', error);
    return NextResponse.json({ error: '주차 계획 저장에 실패했습니다.' }, { status: 500 });
  }

  return NextResponse.json({ data: normalizePlanRow(data) });
}
