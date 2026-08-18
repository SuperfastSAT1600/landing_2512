import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { supabaseSFv2 } from '@/lib/supabase-sfv2';
import { isAuthenticated } from '@/lib/server-auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ profileId: string }> }
) {
  if (!isAuthenticated(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { profileId } = await params;

  const [{ data: profile }, { data: crmStudent }] = await Promise.all([
    supabaseSFv2.from('profiles').select('id, full_name, email, phone, grade, role').eq('id', profileId).single(),
    supabaseAdmin.from('students').select(
      'id, name, grade, consultation_timeline, funnel_stage, sfv2_profile_id, ' +
      'previous_rw_score, previous_math_score, target_score, target_test_date, ' +
      'school_type, desired_subjects, ot_datetime, parent_timezone, comm_language, portal_token'
    ).eq('sfv2_profile_id', profileId).maybeSingle(),
  ]);

  let diagnostic = null;
  let hasSummerProgram = false;
  const studentName = (crmStudent as { name?: string } | null)?.name;
  const crmId = (crmStudent as { id?: string } | null)?.id;

  await Promise.all([
    studentName
      ? supabaseAdmin
          .from('diagnostic_test_results')
          .select('submitted_at, previous_rw_score, previous_math_score')
          .ilike('student_name', `%${studentName}%`)
          .order('submitted_at', { ascending: false })
          .limit(1)
          .maybeSingle()
          .then(({ data }) => { diagnostic = data ?? null; })
      : Promise.resolve(),
    crmId
      ? supabaseAdmin
          .from('payments')
          .select('id')
          .eq('student_id', crmId)
          .ilike('product', '%여름방학%')
          .gte('paid_at', '2026-01-01')
          .limit(1)
          .maybeSingle()
          .then(({ data }) => { hasSummerProgram = !!data; })
      : Promise.resolve(),
  ]);

  return NextResponse.json({
    profile: profile ?? null,
    crmStudent: crmStudent ?? null,
    diagnostic,
    hasSummerProgram,
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ profileId: string }> }
) {
  if (!isAuthenticated(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
