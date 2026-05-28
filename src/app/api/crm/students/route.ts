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

  let query = supabaseAdmin
    .from('students')
    .select('*')
    .order('created_at', { ascending: false });

  if (leadStatus) {
    // 특정 lead_status 직접 필터 (예: enrolled, active, inactive)
    query = query.eq('lead_status', leadStatus);
  } else if (pool) {
    // 리드 풀: 이탈 + 재활성화 시도 중
    query = query.in('lead_status', ['inactive', 'reactivating']);
  } else {
    // 칸반: 세일즈 진행 중인 활성 학생만
    query = query.eq('lead_status', 'active');
  }

  if (stage) {
    query = query.eq('funnel_stage', stage);
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

  if (!name || !grade || !school_type || !parent_phone || !desired_subjects) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('students')
    .insert([
      {
        name,
        grade,
        school_type,
        parent_phone,
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
        desired_subjects,
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
