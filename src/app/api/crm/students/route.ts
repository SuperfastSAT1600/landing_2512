import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAuthenticated } from '@/lib/server-auth';
import type { CreateStudentInput } from '@/types/crm';
import { isActionDoneToday, todaysMemos } from '@/types/crm';
import { toKSTNaive } from '@/lib/sheets-sync-utils';

/**
 * GET /api/crm/students
 * Returns full student list. Optional ?stage= filter for funnel_stage.
 * Requires admin authentication.
 */
export async function GET(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const stage = searchParams.get('stage');
  const pool = searchParams.get('pool') === 'true';
  const leadStatus = searchParams.get('lead_status');
  const search = searchParams.get('search')?.trim();
  const nameSearch = searchParams.get('name_search')?.trim();
  const statsOnly = searchParams.get('stats_only') === 'true';
  const retryStrategyId = searchParams.get('retry_strategy_id');
  const isVip = searchParams.get('is_vip') === 'true' ? true : null;

  // 동명이인 감지 + 소개자 검색용 — lead_status 무관 모든 상태에서 이름 검색
  if (nameSearch) {
    const { data, error } = await supabaseAdmin
      .from('students')
      .select('id, name, parent_phone, grade, inquiry_date')
      .ilike('name', `%${nameSearch}%`)
      .order('name', { ascending: true })
      .limit(10);
    if (error) return NextResponse.json({ error: 'Failed to search' }, { status: 500 });
    return NextResponse.json({ data: data ?? [] });
  }

  // 카운트만 반환 (초기 로드용)
  if (statsOnly && pool) {
    const [inactiveRes, reactivatingRes] = await Promise.all([
      supabaseAdmin.from('students').select('id', { count: 'exact', head: true }).eq('lead_status', 'inactive'),
      supabaseAdmin.from('students').select('id', { count: 'exact', head: true }).eq('lead_status', 'reactivating'),
    ]);
    return NextResponse.json({
      data: {
        inactive: inactiveRes.count ?? 0,
        reactivating: reactivatingRes.count ?? 0,
      },
    });
  }

  if (statsOnly && leadStatus) {
    const { count } = await supabaseAdmin
      .from('students')
      .select('id', { count: 'exact', head: true })
      .eq('lead_status', leadStatus);
    return NextResponse.json({ data: { count: count ?? 0 } });
  }

  // "오늘 할 일" — 오늘 취한 액션: lead_status 무관하게 오늘(KST) 메모 작성 또는
  // 완료 체크한 학생 전체를 반환한다. 기본 목록은 active만 주므로 재활성화·이탈
  // 리드풀 학생에게 남긴 상담 메모가 누락된다 — 그 사각지대를 메우는 전용 경로.
  if (searchParams.get('today_actions') === 'true') {
    const nowMs = Date.now();
    const BATCH = 1000;
    // 1차: 판정에 필요한 최소 컬럼만 전체 배치 조회 → 오늘 액션이 있는 id만 추린다.
    const { count } = await supabaseAdmin
      .from('students')
      .select('id', { count: 'exact', head: true });
    const batches = Math.max(1, Math.ceil((count ?? 0) / BATCH));
    const scans = await Promise.all(
      Array.from({ length: batches }, (_, i) =>
        supabaseAdmin
          .from('students')
          .select('id, consultation_timeline, daily_action_done_at')
          .order('created_at', { ascending: false })
          .range(i * BATCH, (i + 1) * BATCH - 1)
      )
    );
    const scanFailed = scans.find((r) => r.error);
    if (scanFailed?.error) {
      console.error('[crm/students GET today_actions scan]', scanFailed.error);
      return NextResponse.json({ error: 'Failed to fetch students' }, { status: 500 });
    }
    const ids = scans
      .flatMap((r) => r.data ?? [])
      .filter((s) => isActionDoneToday(s, nowMs) || todaysMemos(s, nowMs).length > 0)
      .map((s) => s.id);
    if (ids.length === 0) return NextResponse.json({ data: [] });
    // 2차: 추려진 소수의 학생만 전체 컬럼으로 (패널 클릭 시 전체 정보 필요).
    const { data, error } = await supabaseAdmin.from('students').select('*').in('id', ids);
    if (error) {
      console.error('[crm/students GET today_actions full]', error);
      return NextResponse.json({ error: 'Failed to fetch students' }, { status: 500 });
    }
    return NextResponse.json({ data });
  }

  // 필터를 적용한 새 쿼리를 만든다 (배치 조회 시 매번 새로 빌드)
  const buildQuery = (forCount = false) => {
    let q = forCount
      ? supabaseAdmin.from('students').select('id', { count: 'exact', head: true })
      : supabaseAdmin.from('students').select('*').order('created_at', { ascending: false });
    if (retryStrategyId) {
      q = q.eq('retry_strategy_id', retryStrategyId);
    } else if (leadStatus) {
      q = q.eq('lead_status', leadStatus);
    } else if (pool) {
      q = q.in('lead_status', ['inactive', 'reactivating']);
    } else {
      // active 리드 + 결제완료(stage 8) 학생(최초 세일즈 칸반 8번 컬럼용).
      // 회원가입 완료(signup_done_at) 필터는 클라이언트에서 — 신규 컬럼 미적용 환경에서도 깨지지 않게.
      q = q.or('lead_status.eq.active,funnel_stage.eq.8');
    }
    if (stage) q = q.eq('funnel_stage', stage);
    if (search) q = q.ilike('name', `%${search}%`);
    if (isVip) q = q.eq('is_vip', true);
    return q;
  };

  // 리드풀(이탈/재활성화)은 전체를 반환한다. Supabase는 요청당 max-rows=1000 하드 캡이
  // 있어 .range()로도 못 넘기므로, count로 배치 수를 구한 뒤 1,000개씩 병렬 조회한다.
  if (pool) {
    const BATCH = 1000;
    const { count } = await buildQuery(true);
    const batches = Math.max(1, Math.ceil((count ?? 0) / BATCH));
    const results = await Promise.all(
      Array.from({ length: batches }, (_, i) => buildQuery().range(i * BATCH, (i + 1) * BATCH - 1))
    );
    const failed = results.find((r) => r.error);
    if (failed?.error) {
      console.error('[crm/students GET pool batch]', failed.error);
      return NextResponse.json({ error: 'Failed to fetch students' }, { status: 500 });
    }
    return NextResponse.json({ data: results.flatMap((r) => r.data ?? []) });
  }

  const { data, error } = await buildQuery();

  if (error) {
    console.error('[crm/students GET]', error);
    return NextResponse.json({ error: 'Failed to fetch students' }, { status: 500 });
  }

  return NextResponse.json({ data });
}

/**
 * POST /api/crm/students
 * Creates a new student record.
 * Body: CreateStudentInput
 * Requires admin authentication.
 */
export async function POST(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: CreateStudentInput;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const {
    name,
    grade,
    school_type,
    parent_phone,
    contact_type,
    inquiry_date,
    inquiry_channel,
    traffic_source,
    content_author,
    lead_type,
    b2b_partner,
    campaign_tags,
    parent_timezone,
    previous_rw_score,
    previous_math_score,
    previous_score_status,
    target_score,
    target_test_date,
    target_test_date_2,
    desired_subjects,
    entered_by,
  } = body;

  if (!name) {
    return NextResponse.json({ error: '이름은 필수입니다.' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('students')
    .insert([
      {
        name,
        grade: grade || '기타',
        school_type: school_type || '한국 학제',
        parent_phone: parent_phone || '',
        contact_type: contact_type ?? null,
        // 미입력 시 등록 시각(KST)을 인입일로 — 신규 리드가 inquiry_date 없이 생성돼 기간 집계에서 누락되는 것 방지.
        inquiry_date: inquiry_date ?? toKSTNaive(new Date().toISOString()),
        inquiry_channel: inquiry_channel ?? null,
        traffic_source: traffic_source ?? null,
        content_author: content_author ?? null,
        lead_type: lead_type ?? 'B2C',
        b2b_partner: b2b_partner ?? null,
        campaign_tags: campaign_tags ?? [],
        parent_timezone: parent_timezone ?? null,
        previous_rw_score: previous_rw_score ?? null,
        previous_math_score: previous_math_score ?? null,
        previous_score_status: previous_score_status ?? 'never_taken',
        target_score: target_score ?? null,
        target_test_date: target_test_date ?? null,
        target_test_date_2: target_test_date_2 ?? null,
        desired_subjects: desired_subjects || 'Both',
        funnel_stage: '0',
        consultation_timeline: [],
        entered_by: entered_by ?? null,
      },
    ])
    .select()
    .single();

  if (error) {
    console.error('[crm/students POST]', error);
    return NextResponse.json({ error: 'Failed to create student' }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}
