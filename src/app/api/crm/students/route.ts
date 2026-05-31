import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAuthenticated } from '@/lib/server-auth';
import type { CreateStudentInput } from '@/types/crm';

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
  const statsOnly = searchParams.get('stats_only') === 'true';
  const retryStrategyId = searchParams.get('retry_strategy_id');

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

  let query = supabaseAdmin
    .from('students')
    .select('*')
    .order('created_at', { ascending: false });

  if (retryStrategyId) {
    query = query.eq('retry_strategy_id', retryStrategyId);
  } else if (leadStatus) {
    query = query.eq('lead_status', leadStatus);
  } else if (pool) {
    query = query.in('lead_status', ['inactive', 'reactivating']);
  } else {
    query = query.eq('lead_status', 'active');
  }

  if (stage) {
    query = query.eq('funnel_stage', stage);
  }

  if (search) {
    query = query.ilike('name', `%${search}%`);
  }

  const { data, error } = await query;

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
        inquiry_date: inquiry_date ?? null,
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
