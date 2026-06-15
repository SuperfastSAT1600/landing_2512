import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { supabaseSFv2 } from '@/lib/supabase-sfv2';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ profileId: string }> }
) {
  const { profileId } = await params;

  const [{ data: profile }, { data: crmStudent }] = await Promise.all([
    supabaseSFv2.from('profiles').select('id, full_name, email, phone, grade, role').eq('id', profileId).single(),
    supabaseAdmin.from('students').select(
      'id, name, grade, consultation_timeline, funnel_stage, sfv2_profile_id, ' +
      'previous_rw_score, previous_math_score, target_score, target_test_date, ' +
      'school_type, desired_subjects, ot_datetime, parent_timezone, comm_language'
    ).eq('sfv2_profile_id', profileId).maybeSingle(),
  ]);

  let diagnostic = null;
  const studentName = (crmStudent as { name?: string } | null)?.name;
  if (studentName) {
    const { data } = await supabaseAdmin
      .from('diagnostic_test_results')
      .select('submitted_at, previous_rw_score, previous_math_score')
      .ilike('student_name', `%${studentName}%`)
      .order('submitted_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    diagnostic = data ?? null;
  }

  return NextResponse.json({
    profile: profile ?? null,
    crmStudent: crmStudent ?? null,
    diagnostic,
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ profileId: string }> }
) {
  const { profileId } = await params;
  const body = await req.json();
  const { comm_language } = body as { comm_language?: string };

  if (!['ko', 'en'].includes(comm_language ?? '')) {
    return NextResponse.json({ error: 'Invalid comm_language' }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from('students')
    .update({ comm_language } as Record<string, unknown>)
    .eq('sfv2_profile_id', profileId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
