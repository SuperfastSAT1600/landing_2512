import { supabaseAdmin } from '@/lib/supabase-admin';
import { buildEnrollmentUpdate } from '@/lib/enrollment-state';

/**
 * 결제가 기록되면 학생을 "수업 중"으로 전환한다.
 * 모든 결제 생성 경로가 공유 — 결제 유형/입력 경로와 무관하게 단계 전환을 보장한다.
 * (환불·음수 결제는 호출하지 않는다. 환불은 별도 churn 처리.)
 * @param extra 전환과 함께 학생 레코드에 병합할 추가 필드(예: is_vip)
 * @returns 갱신된 student row, 또는 실패 시 null
 */
export async function enrollStudentOnPayment(
  studentId: string,
  enrolledAt?: string,
  extra?: Record<string, unknown>
) {
  const at = enrolledAt ?? new Date().toISOString();

  const { data: studentRow, error: fetchErr } = await supabaseAdmin
    .from('students')
    .select('stage_history')
    .eq('id', studentId)
    .single();

  if (fetchErr || !studentRow) {
    console.error('[enrollStudentOnPayment] student fetch failed', fetchErr);
    return null;
  }

  const update = { ...buildEnrollmentUpdate(studentRow.stage_history, at), ...(extra ?? {}) };

  const { data, error } = await supabaseAdmin
    .from('students')
    .update(update)
    .eq('id', studentId)
    .select()
    .single();

  if (error) {
    console.error('[enrollStudentOnPayment] student update failed', error);
    return null;
  }
  return data;
}
