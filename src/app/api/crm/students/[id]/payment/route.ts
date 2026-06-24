import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAuthenticated } from '@/lib/server-auth';
import { enrollStudentOnPayment } from '@/lib/enroll-on-payment';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { product: string; product_category?: string | null; product_subcategory?: string | null; hours?: number | null; amount: number; paid_at?: string; tax_type?: '면세' | '과세'; payment_type?: string; is_vip?: boolean; created_by?: string | null; b2b_partner?: string | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { product, product_category, product_subcategory, hours, amount, paid_at, tax_type, payment_type, is_vip, created_by, b2b_partner } = body;
  // 모달에서 보낸 결제 유형. 미지정 시 '최초결제'(DB 기본값과 동일).
  const resolvedPaymentType = payment_type === '재결제' ? '재결제' : '최초결제';

  if (!product || !amount || amount <= 0) {
    return NextResponse.json({ error: '상품과 금액은 필수입니다.' }, { status: 400 });
  }

  // student_name 조회 (payments 테이블 기록용)
  const { data: studentRow } = await supabaseAdmin
    .from('students')
    .select('name')
    .eq('id', id)
    .single();

  if (!studentRow) {
    return NextResponse.json({ error: '학생을 찾을 수 없습니다.' }, { status: 404 });
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
      paid_at: paid_at ?? new Date().toISOString().slice(0, 10),
      created_by: created_by ?? null,
    })
    .select()
    .single();

  if (payErr) {
    console.error('[payment POST]', payErr);
    return NextResponse.json({ error: payErr.message ?? '결제 기록 저장 실패' }, { status: 500 });
  }

  // 결제 → "수업 중" 전환 (모든 결제 경로 공유 헬퍼). is_vip, b2b_partner가 오면 함께 반영.
  const extra: Record<string, unknown> = {};
  if (is_vip !== undefined) extra.is_vip = is_vip;
  if (b2b_partner) extra.b2b_partner = b2b_partner;
  const student = await enrollStudentOnPayment(id, undefined, Object.keys(extra).length ? extra : undefined);
  if (!student) {
    return NextResponse.json({ error: '학생 상태 업데이트 실패' }, { status: 500 });
  }

  return NextResponse.json({ data: { payment, student } }, { status: 201 });
}
