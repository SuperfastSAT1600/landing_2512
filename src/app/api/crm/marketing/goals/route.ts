import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAuthenticated } from '@/lib/server-auth';
import { mondayOf } from '@/lib/marketing-week';

// 마케팅 주차별 리드 목표 — 주차당 총합 1건. 소스별 목표는 없다(소스는 자동 집계 현황).
// 행이 없으면 "목표 미설정", target_count 0 은 "의도한 0개 목표"로 서로 다른 상태다.
export interface MarketingWeeklyGoal {
  id: string;
  week_start: string;
  target_count: number;
  created_at: string;
  updated_at: string;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const COLUMNS = 'id, week_start, target_count, created_at, updated_at';

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

/** 주차 키가 오염되면 조회가 조용히 빈 결과를 내므로 경계에서 막는다. */
function invalidWeekStart(value: string | null | undefined): string | null {
  if (!value || !DATE_RE.test(value)) return 'week_start 는 YYYY-MM-DD 형식이어야 합니다.';
  if (mondayOf(value) !== value) return 'week_start 는 해당 주 월요일이어야 합니다.';
  return null;
}

export async function GET(request: NextRequest) {
  if (!isAuthenticated(request)) return unauthorized();

  const params = request.nextUrl.searchParams;
  const weekStart = params.get('week_start');
  const from = params.get('from');
  const to = params.get('to');

  // DB 를 건드리기 전에 검증한다.
  if (weekStart) {
    const error = invalidWeekStart(weekStart);
    if (error) return badRequest(error);
  } else if (from && to) {
    if (!DATE_RE.test(from) || !DATE_RE.test(to)) {
      return badRequest('from/to 는 YYYY-MM-DD 형식이어야 합니다.');
    }
  } else {
    return badRequest('week_start 또는 from/to 가 필요합니다.');
  }

  const base = supabaseAdmin.from('marketing_weekly_goals').select(COLUMNS);
  const query = weekStart
    ? base.eq('week_start', weekStart)
    : base.gte('week_start', from!).lte('week_start', to!);

  const { data, error } = await query.order('week_start', { ascending: true });

  if (error) {
    console.error('[marketing/goals GET]', error);
    return NextResponse.json({ error: '목표를 불러오지 못했습니다.' }, { status: 500 });
  }

  return NextResponse.json({ data: data as MarketingWeeklyGoal[] });
}

export async function PUT(request: NextRequest) {
  if (!isAuthenticated(request)) return unauthorized();

  let body: { week_start?: string; target_count?: unknown };
  try {
    body = await request.json();
  } catch {
    return badRequest('Invalid JSON body');
  }

  const weekError = invalidWeekStart(body.week_start);
  if (weekError) return badRequest(weekError);

  const target = body.target_count;
  if (typeof target !== 'number' || !Number.isInteger(target) || target < 0) {
    return badRequest('target_count 는 0 이상의 정수여야 합니다.');
  }

  const { data, error } = await supabaseAdmin
    .from('marketing_weekly_goals')
    .upsert(
      {
        week_start: body.week_start,
        target_count: target,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'week_start' },
    )
    .select()
    .single();

  if (error) {
    console.error('[marketing/goals PUT]', error);
    return NextResponse.json({ error: '목표 저장에 실패했습니다.' }, { status: 500 });
  }

  return NextResponse.json({ data: data as MarketingWeeklyGoal });
}

/** 목표를 "미설정" 상태로 되돌린다 (0 으로 저장하는 것과 다르다). */
export async function DELETE(request: NextRequest) {
  if (!isAuthenticated(request)) return unauthorized();

  const weekStart = request.nextUrl.searchParams.get('week_start');
  const weekError = invalidWeekStart(weekStart);
  if (weekError) return badRequest(weekError);

  const { error } = await supabaseAdmin
    .from('marketing_weekly_goals')
    .delete()
    .eq('week_start', weekStart);

  if (error) {
    console.error('[marketing/goals DELETE]', error);
    return NextResponse.json({ error: '목표 삭제에 실패했습니다.' }, { status: 500 });
  }

  return NextResponse.json({ data: { week_start: weekStart } });
}
