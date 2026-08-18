import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAuthenticated } from '@/lib/server-auth';
import { getWeekDefByStart } from '@/lib/week-definitions';
import {
  WEEKLY_PLAN_METRIC_KEYS,
  type WeeklyPlanMetricKey,
  type WeeklyPlanResponse,
  type WeeklyPlanTarget,
  type WeeklyPlanAction,
} from '@/types/crm';

const VALID_SEGMENTS = ['b2c', 'b2b'] as const;
type Segment = (typeof VALID_SEGMENTS)[number];
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
  segment: Segment,
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

// GET /api/crm/weekly-plan?segment=&week_start=
export async function GET(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sp = request.nextUrl.searchParams;
  const segment = sp.get('segment') as Segment | null;
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

  const { data: plan } = await supabaseAdmin
    .from('weekly_plans')
    .select('*')
    .eq('segment', segment)
    .eq('week_start', weekStart)
    .maybeSingle();

  const adminKey = request.headers.get('x-admin-key') ?? '';
  const actuals = await fetchActuals(request.nextUrl.origin, adminKey, segment, week.start, week.end);

  const body: WeeklyPlanResponse = {
    plan: plan ?? null,
    actuals,
    week: { start: week.start, end: week.end, label: week.label },
    execution: [],
    prev: null,
  };
  return NextResponse.json({ data: body });
}

// PUT /api/crm/weekly-plan — targets + actions 업서트 (팀 공용 last-write-wins)
export async function PUT(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { segment?: string; week_start?: string; targets?: WeeklyPlanTarget[]; actions?: WeeklyPlanAction[] };
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { segment, week_start } = body;
  if (!segment || !(VALID_SEGMENTS as readonly string[]).includes(segment)) {
    return NextResponse.json({ error: 'segment은 b2c|b2b 중 하나여야 합니다.' }, { status: 400 });
  }
  if (!week_start || !DATE_RE.test(week_start) || !getWeekDefByStart(week_start)) {
    return NextResponse.json({ error: 'week_start가 올바르지 않습니다.' }, { status: 400 });
  }

  // targets 정제: 유효 metric key만, target_value 숫자화
  const targets: WeeklyPlanTarget[] = (Array.isArray(body.targets) ? body.targets : [])
    .filter((t) => WEEKLY_PLAN_METRIC_KEYS.includes(t?.key))
    .map((t) => ({ key: t.key, label: String(t.label ?? ''), target_value: Number(t.target_value) || 0 }));

  // actions 정제
  const actions: WeeklyPlanAction[] = (Array.isArray(body.actions) ? body.actions : [])
    .filter((a) => a && typeof a.id === 'string' && typeof a.text === 'string')
    .map((a) => ({
      id: a.id,
      text: a.text,
      done: !!a.done,
      done_at: a.done ? (a.done_at ?? new Date().toISOString()) : null,
      owner: a.owner ?? null,
    }));

  const { data, error } = await supabaseAdmin
    .from('weekly_plans')
    .upsert(
      { segment, week_start, targets, actions, updated_at: new Date().toISOString() },
      { onConflict: 'segment,week_start' },
    )
    .select()
    .single();

  if (error) {
    console.error('[weekly-plan PUT]', error);
    return NextResponse.json({ error: '주차 계획 저장에 실패했습니다.' }, { status: 500 });
  }

  return NextResponse.json({ data });
}
