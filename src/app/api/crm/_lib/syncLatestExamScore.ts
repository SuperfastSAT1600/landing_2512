import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * student_exam_scores의 최신 회차 점수를 students 테이블에 동기화한다.
 * 성적이 없으면 previous_rw_score / previous_math_score를 NULL로 설정한다.
 * 동기화 실패는 로그만 남기고 호출부 응답에 영향을 주지 않는다.
 */
export async function syncLatestExamScore(studentId: string): Promise<void> {
  try {
    const { data: latest, error: fetchError } = await supabaseAdmin
      .from('student_exam_scores')
      .select('rw_score, math_score')
      .eq('student_id', studentId)
      .order('exam_month', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchError) {
      console.error('[syncLatestExamScore] fetch error', fetchError);
      return;
    }

    const { error: updateError } = await supabaseAdmin
      .from('students')
      .update({
        previous_rw_score: latest?.rw_score ?? null,
        previous_math_score: latest?.math_score ?? null,
      })
      .eq('id', studentId);

    if (updateError) {
      console.error('[syncLatestExamScore] update error', updateError);
    }
  } catch (err) {
    console.error('[syncLatestExamScore] unexpected error', err);
  }
}
