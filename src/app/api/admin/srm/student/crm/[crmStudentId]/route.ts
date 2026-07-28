import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAuthenticated } from '@/lib/server-auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ crmStudentId: string }> }
) {
  if (!isAuthenticated(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { crmStudentId } = await params;

  const { data: crmStudent, error } = await supabaseAdmin
    .from('students')
    .select(
      'id, name, grade, consultation_timeline, funnel_stage, sfv2_profile_id, ' +
      'previous_rw_score, previous_math_score, target_score, target_test_date, ' +
      'school_type, desired_subjects, ot_datetime, parent_timezone, comm_language, service_status'
    )
    .eq('id', crmStudentId)
    .single();

  if (error || !crmStudent) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const [{ data: diagnostic }, { data: summerPayment }] = await Promise.all([
    supabaseAdmin
      .from('diagnostic_test_results')
      .select('submitted_at, previous_rw_score, previous_math_score')
      .ilike('student_name', `%${(crmStudent as unknown as { name: string }).name}%`)
      .order('submitted_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabaseAdmin
      .from('payments')
      .select('id')
      .eq('student_id', crmStudentId)
      .ilike('product', '%여름방학%')
      .gte('paid_at', '2026-01-01')
      .limit(1)
      .maybeSingle(),
  ]);

  return NextResponse.json({
    profile: null,
    crmStudent,
    diagnostic: diagnostic ?? null,
    hasSummerProgram: !!summerPayment,
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ crmStudentId: string }> }
) {
  if (!isAuthenticated(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { crmStudentId } = await params;
  const body = await req.json() as { comm_language?: string; service_status?: string };
  const updates: Record<string, unknown> = {};

  if (body.comm_language !== undefined) {
    if (!['ko', 'en'].includes(body.comm_language)) {
      return NextResponse.json({ error: 'Invalid comm_language' }, { status: 400 });
    }
    updates.comm_language = body.comm_language;
  }

  if (body.service_status !== undefined) {
    if (!['active', 'partial_end', 'ended'].includes(body.service_status)) {
      return NextResponse.json({ error: 'Invalid service_status' }, { status: 400 });
    }
    updates.service_status = body.service_status;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from('students')
    .update(updates)
    .eq('id', crmStudentId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
