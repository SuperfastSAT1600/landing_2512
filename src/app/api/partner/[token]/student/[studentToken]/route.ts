import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { cookies } from 'next/headers';
import type { ConsultationEntry } from '@/types/crm';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string; studentToken: string }> }
) {
  const { token, studentToken } = await params;

  // 파트너 세션 또는 어드민 키 검증
  const cookieStore = await cookies();
  const session = cookieStore.get(`partner_session_${token}`);
  const adminKey = req.headers.get('x-admin-key');
  const isAdmin = adminKey && adminKey === process.env.ADMIN_SECRET_KEY;

  if (!isAdmin && (!session || session.value !== 'authenticated')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 파트너 포털 조회
  const { data: portal, error: portalError } = await supabaseAdmin
    .from('partner_portals')
    .select('name')
    .eq('token', token)
    .single();

  if (portalError || !portal) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // 학생 조회 — 반드시 이 파트너 소속이어야 함
  const { data: student, error } = await supabaseAdmin
    .from('students')
    .select(`
      id, name, portal_name, grade, school_type, desired_subjects,
      target_score, target_test_date, target_score_2, target_test_date_2,
      previous_rw_score, previous_math_score, preferred_language,
      consultation_timeline, diagnostic_result_id, sfv2_profile_id,
      b2b_partner, created_at
    `)
    .eq('portal_token', studentToken)
    .eq('b2b_partner', portal.name as string)
    .single();

  if (error || !student) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const publishedMemos = ((student.consultation_timeline ?? []) as ConsultationEntry[])
    .filter((e) => e.published && e.ai_purified)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .map((e) => ({ id: e.id, created_at: e.created_at, content: e.ai_purified }));

  let diagnosticResult = null;
  if (student.diagnostic_result_id) {
    const { data: result } = await supabaseAdmin
      .from('diagnostic_test_results')
      .select('id, submitted_at, total_time_seconds, answers')
      .eq('id', student.diagnostic_result_id)
      .single();
    if (result) {
      diagnosticResult = {
        id: result.id,
        submitted_at: result.submitted_at,
        total_time_seconds: result.total_time_seconds,
        question_count: result.answers ? Object.keys(result.answers).length : 0,
      };
    }
  }

  return NextResponse.json({
    student: {
      name: student.portal_name || student.name,
      grade: student.grade,
      school_type: student.school_type,
      desired_subjects: student.desired_subjects,
      target_score: student.target_score,
      target_test_date: student.target_test_date,
      target_score_2: student.target_score_2,
      target_test_date_2: student.target_test_date_2,
      previous_rw_score: student.previous_rw_score,
      previous_math_score: student.previous_math_score,
      preferred_language: student.preferred_language ?? null,
      created_at: student.created_at ?? null,
    },
    publishedMemos,
    diagnosticResult,
    hasSrmData: !!student.sfv2_profile_id,
    portalToken: studentToken,
  });
}
