import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAuthenticated } from '@/lib/server-auth';
import { getKstDateString } from '@/lib/week-definitions';
import { enrollStudentOnPayment } from '@/lib/enroll-on-payment';
import { isPaymentMethod, PAYMENT_METHODS } from '@/types/crm';
import { apiError, unauthorized } from '@/lib/api-response';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!isAuthenticated(request)) return unauthorized();

  let body: { product: string; product_category?: string | null; product_subcategory?: string | null; hours?: number | null; amount: number; paid_at?: string; tax_type?: '면세' | '과세'; payment_type?: string; payment_method?: string | null; is_vip?: boolean; created_by?: string | null; b2b_partner?: string | null };
  try {
    body = await request.json();
  } catch {
    return apiError('BAD_REQUEST', 'Invalid JSON body', 400);
  }

  const { product, product_category, product_subcategory, hours, amount, paid_at, tax_type, payment_type, payment_method, is_vip, created_by, b2b_partner } = body;
  // 모달에서 보낸 결제 유형. 미지정 시 '최초결제'(DB 기본값과 동일).
  const resolvedPaymentType = payment_type === '재결제' ? '재결제' : '최초결제';

  // 결제수단은 선택 입력 — 안 고르면 NULL("기록되지 않음")로 남긴다.
  if (payment_method != null && payment_method !== '' && !isPaymentMethod(payment_method)) {
    return apiError('BAD_REQUEST', `결제수단은 ${PAYMENT_METHODS.join(' / ')} 중 하나여야 합니다.`, 400);
  }

  // 0원은 가결제(수업 시작, 실입금 전)로 허용. 음수는 환불 전용 경로에서만 처리한다.
  if (!product || typeof amount !== 'number' || !Number.isFinite(amount) || amount < 0) {
    return apiError('BAD_REQUEST', '상품과 금액(0 이상)은 필수입니다.', 400);
  }

  // 시간은 소수 허용(예: 41.5). 시간 단위가 아닌 상품은 null/미지정으로 온다.
  if (hours !== undefined && hours !== null &&
      (typeof hours !== 'number' || !Number.isFinite(hours) || hours <= 0)) {
    return apiError('BAD_REQUEST', '시간은 0보다 큰 숫자여야 합니다.', 400);
  }

  // student_name 조회 (payments 테이블 기록용)
  const { data: studentRow } = await supabaseAdmin
    .from('students')
    .select('name')
    .eq('id', id)
    .single();

  if (!studentRow) {
    return apiError('NOT_FOUND', '학생을 찾을 수 없습니다.', 404);
  }

  const { data: payment, error: payErr } = await supabaseAdmin
    .from('payments')
    .insert({
      student_id: id,
      student_name: studentRow.name,
      product,
      product_category: product_category ?? null,
      product_subcategory: product_subcategory ?? null,
      hours: hours ?? null,
      amount,
      tax_type: tax_type ?? '면세',
      payment_type: resolvedPaymentType,
      payment_method: isPaymentMethod(payment_method) ? payment_method : null,
      paid_at: paid_at ?? getKstDateString(),
      created_by: created_by ?? null,
    })
    .select()
    .single();

  if (payErr) {
    console.error('[payment POST]', payErr);
    return apiError('INTERNAL_ERROR', payErr.message ?? '결제 기록 저장 실패', 500);
  }

  // 결제 → "수업 중" 전환 (모든 결제 경로 공유 헬퍼). is_vip, b2b_partner가 오면 함께 반영.
  const extra: Record<string, unknown> = {};
  if (is_vip !== undefined) extra.is_vip = is_vip;
  if (b2b_partner) extra.b2b_partner = b2b_partner;
  const student = await enrollStudentOnPayment(id, undefined, Object.keys(extra).length ? extra : undefined);
  if (!student) {
    // 결제 행은 이미 저장됐다. 클라이언트가 같은 결제를 다시 보내지 않고 전환만 재시도하도록 구분해서 알린다.
    return apiError(
      'ENROLL_FAILED',
      '결제는 기록됐지만 학생을 "수업 중"으로 바꾸지 못했습니다. 결제를 다시 입력하지 말고 전환만 다시 시도해 주세요.',
      500,
      { data: { payment } }
    );
  }

  return NextResponse.json({ data: { payment, student } }, { status: 201 });
}
