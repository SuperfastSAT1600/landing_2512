import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAuthenticated } from '@/lib/server-auth';
import { FUNNEL_STAGE_LABELS, type ChurnType } from '@/types/crm';
import { appendStageHistory } from '@/lib/stage-history';
import { apiError, unauthorized } from '@/lib/api-response';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!isAuthenticated(request)) return unauthorized();

  let body: { refund_amount: number; refund_reason: string; churn_type: ChurnType; created_by?: string | null };
  try {
    body = await request.json();
  } catch {
    return apiError('BAD_REQUEST', 'Invalid JSON', 400);
  }

  const { refund_amount, refund_reason, churn_type, created_by } = body;
  if (!refund_amount || refund_amount <= 0 || !refund_reason?.trim()) {
    return apiError('BAD_REQUEST', '환불 금액과 사유가 필요합니다.', 400);
  }

  // 학생 정보 조회
  const { data: student, error: fetchErr } = await supabaseAdmin
    .from('students')
    .select('id, name, lead_status, stage_history')
    .eq('id', id)
    .single();

  if (fetchErr || !student) {
    return apiError('NOT_FOUND', 'Student not found', 404);
  }

  // 1. 환불 결제 기록 추가 (음수 금액)
  const { data: refundRow, error: paymentErr } = await supabaseAdmin
    .from('payments')
    .insert({
      student_id: id,
      student_name: student.name,
      amount: -refund_amount,
      payment_type: '환불',
      // 환불 경로는 실제 수단을 모른다 — 추측해서 채우지 않는다.
      payment_method: null,
      product: '환불',
      notes: refund_reason,
      tax_type: '면세',
      paid_at: new Date().toISOString(),
      created_by: created_by ?? null,
    })
    .select('id')
    .single();

  if (paymentErr || !refundRow) {
    return apiError('INTERNAL_ERROR', paymentErr?.message ?? 'Refund insert failed', 500);
  }

  // 2. 학생 이탈 처리 — 이탈 진입을 단계 이력에도 남긴다(직전이 이미 이탈이면 그대로).
  const history = appendStageHistory(
    student.stage_history,
    'churned',
    FUNNEL_STAGE_LABELS.churned,
    new Date().toISOString()
  );
  const { data: updatedStudent, error: updateErr } = await supabaseAdmin
    .from('students')
    .update({
      funnel_stage: 'churned',
      lead_status: 'inactive',
      churn_tag: `환불: ${refund_reason}`,
      churn_type,
      ...(history !== student.stage_history ? { stage_history: history } : {}),
    })
    .eq('id', id)
    .select()
    .single();

  if (updateErr) {
    // 부분 실패 보상: 방금 추가한 환불 기록만 id로 삭제한다.
    // (delete()에는 order/limit이 적용되지 않아 조건 삭제는 그 학생의 환불 기록을 전부 지운다)
    const { error: rollbackErr } = await supabaseAdmin.from('payments').delete().eq('id', refundRow.id);
    if (rollbackErr) {
      console.error(`[refund] 보상 삭제 실패 payment=${refundRow.id}:`, rollbackErr.message);
    }
    return apiError('INTERNAL_ERROR', updateErr.message, 500);
  }

  return NextResponse.json({ data: updatedStudent });
}
