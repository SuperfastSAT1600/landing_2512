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
      'school_type, desired_subjects, ot_datetime, parent_timezone'
    )
    .eq('id', crmStudentId)
    .single();

  if (error || !crmStudent) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { data: diagnostic } = await supabaseAdmin
    .from('diagnostic_test_results')
    .select('submitted_at, previous_rw_score, previous_math_score')
    .ilike('student_name', `%${(crmStudent as unknown as { name: string }).name}%`)
    .order('submitted_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return NextResponse.json({
    profile: null,
    crmStudent,
    diagnostic: diagnostic ?? null,
  });
}
