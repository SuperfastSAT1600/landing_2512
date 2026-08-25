import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAuthenticated } from '@/lib/server-auth';
import { getWeekDef } from '@/lib/week-definitions';
import { RENEWAL_OPEN_STAGES } from '@/types/crm';

// RenewalTargetStudent(types/crm.ts)와 동일한 집합을 유지한다.
const STUDENT_FIELDS = 'id, name, grade, parent_phone, is_vip, needs_attention, traffic_source, lead_type';

export async function GET(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
      { status: 401 }
    );
  }

  const sp = new URL(request.url).searchParams;
  const weekStart = sp.get('week_start');
  // scope=open — 결과가 확정되지 않은 대상만(코호트 무관). 일상 운영 보드가 쓴다.
  const openOnly = sp.get('scope') === 'open';

  let query = supabaseAdmin
    .from('renewal_targets')
    .select(`*, student:students(${STUDENT_FIELDS})`)
    .order('stage_updated_at', { ascending: false });

  if (weekStart) {
    query = query.eq('week_start', weekStart);
  }
  if (openOnly) {
    query = query.in('stage', RENEWAL_OPEN_STAGES);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[renewal-targets GET]', error);
    return NextResponse.json(
      { error: { code: 'FETCH_FAILED', message: '목록을 불러오지 못했습니다.' } },
      { status: 500 }
    );
  }

  return NextResponse.json({ data: data ?? [] });
}

export async function POST(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
      { status: 401 }
    );
  }

  let body: { student_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: 'INVALID_JSON', message: 'Invalid JSON body' } },
      { status: 400 }
    );
  }

  const studentId = body.student_id?.trim();
  if (!studentId) {
    return NextResponse.json(
      { error: { code: 'MISSING_FIELDS', message: 'student_id is required' } },
      { status: 400 }
    );
  }

  const weekDef = getWeekDef(new Date().toISOString().slice(0, 10));
  if (!weekDef) {
    return NextResponse.json(
      { error: { code: 'WEEK_OUT_OF_RANGE', message: '현재 날짜에 대한 주차 정의가 없습니다.' } },
      { status: 500 }
    );
  }

  const { data: existing, error: existingError } = await supabaseAdmin
    .from('renewal_targets')
    .select('id')
    .eq('student_id', studentId)
    .in('stage', RENEWAL_OPEN_STAGES);

  if (existingError) {
    console.error('[renewal-targets POST] existing check', existingError);
    return NextResponse.json(
      { error: { code: 'FETCH_FAILED', message: '중복 여부 확인에 실패했습니다.' } },
      { status: 500 }
    );
  }

  if ((existing ?? []).length > 0) {
    return NextResponse.json(
      { error: { code: 'ALREADY_OPEN', message: '이미 재결제 파이프라인에 있습니다' } },
      { status: 409 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from('renewal_targets')
    .insert({
      student_id: studentId,
      week_start: weekDef.start,
      stage: '1',
      stage_updated_at: new Date().toISOString(),
    })
    .select(`*, student:students(${STUDENT_FIELDS})`)
    .single();

  if (error) {
    console.error('[renewal-targets POST]', error);
    return NextResponse.json(
      { error: { code: 'INSERT_FAILED', message: '생성에 실패했습니다.' } },
      { status: 500 }
    );
  }

  return NextResponse.json({ data }, { status: 201 });
}
