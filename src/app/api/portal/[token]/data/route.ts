import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { cookies } from 'next/headers';
import type { ConsultationEntry } from '@/types/crm';

/**
 * GET /api/portal/[token]/data
 * Returns published consultation entries and diagnostic test result.
 * Requires valid session cookie.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const cookieStore = await cookies();
  const session = cookieStore.get(`portal_session_${token}`);
  if (!session || session.value !== 'authenticated') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: student, error } = await supabaseAdmin
    .from('students')
    .select(`
      id, name, portal_name, grade, school_type, desired_subjects,
      target_score, target_test_date,
      previous_rw_score, previous_math_score,
      preferred_language,
      consultation_timeline,
      diagnostic_result_id,
      created_at
    `)
    .eq('portal_token', token)
    .single();

  if (error || !student) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Only published entries, only ai_purified content (never raw_memo)
  const publishedMemos = ((student.consultation_timeline ?? []) as ConsultationEntry[])
    .filter((e) => e.published && e.ai_purified)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .map((e) => ({
      id: e.id,
      created_at: e.created_at,
      content: e.ai_purified,
    }));

  let diagnosticResult = null;
  if (student.diagnostic_result_id) {
    const { data: result } = await supabaseAdmin
      .from('diagnostic_test_results')
      .select('id, submitted_at, test_id, total_time_seconds, answers')
      .eq('id', student.diagnostic_result_id)
      .single();
    if (result) {
      const answerCount = result.answers ? Object.keys(result.answers).length : 0;
      diagnosticResult = {
        id: result.id,
        submitted_at: result.submitted_at,
        test_id: result.test_id,
        total_time_seconds: result.total_time_seconds,
        question_count: answerCount,
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
      previous_rw_score: student.previous_rw_score,
      previous_math_score: student.previous_math_score,
      preferred_language: student.preferred_language ?? null,
      created_at: student.created_at ?? null,
    },
    publishedMemos,
    diagnosticResult,
  });
}
