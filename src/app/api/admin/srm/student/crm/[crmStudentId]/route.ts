import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';


export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ crmStudentId: string }> }
) {
  const { crmStudentId } = await params;

  const { data: crmStudent, error } = await supabaseAdmin
    .from('students')
    .select(
      'id, name, grade, consultation_timeline, funnel_stage, sfv2_profile_id, ' +
      'previous_rw_score, previous_math_score, target_score, target_test_date, ' +
      'school_type, desired_subjects, ot_datetime, parent_timezone, comm_language'
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
  const { crmStudentId } = await params;
  const body = await req.json();
  const { comm_language } = body as { comm_language?: string };

  if (!['ko', 'en'].includes(comm_language ?? '')) {
    return NextResponse.json({ error: 'Invalid comm_language' }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from('students')
    .update({ comm_language } as Record<string, unknown>)
    .eq('id', crmStudentId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
