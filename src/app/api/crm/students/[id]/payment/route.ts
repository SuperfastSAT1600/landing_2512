import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAuthenticated } from '@/lib/server-auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { product: string; product_category?: string | null; product_subcategory?: string | null; hours?: number | null; amount: number; paid_at?: string; tax_type?: '면세' | '과세'; is_vip?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { product, product_category, product_subcategory, hours, amount, paid_at, tax_type, is_vip } = body;

  if (!product || !amount || amount <= 0) {
    return NextResponse.json({ error: '상품과 금액은 필수입니다.' }, { status: 400 });
  }

  // student_name, stage_history 조회 (payments 테이블 기록 + 이력 추가)
  const { data: studentRow } = await supabaseAdmin
    .from('students')
    .select('name, stage_history')
    .eq('id', id)
    .single();

  const { data: payment, error: payErr } = await supabaseAdmin
    .from('payments')
    .insert({
      student_id: id,
      student_name: studentRow?.name ?? '',
      product,
      product_category: product_category ?? null,
      product_subcategory: product_subcategory ?? null,
      hours: hours ?? null,
      amount,
      tax_type: tax_type ?? '면세',
      paid_at: paid_at ?? new Date().toISOString().slice(0, 10),
    })
    .select()
    .single();

  if (payErr) {
    console.error('[payment POST]', payErr);
    return NextResponse.json({ error: payErr.message ?? '결제 기록 저장 실패' }, { status: 500 });
  }

  const now = new Date().toISOString();
  const updatedHistory = [
    ...(Array.isArray(studentRow?.stage_history) ? studentRow.stage_history : []),
    { stage: '8', label: '수업 중', entered_at: now },
  ];

  const { data: student, error: stuErr } = await supabaseAdmin
    .from('students')
    .update({
      lead_status: 'enrolled',
      funnel_stage: '8',
      funnel_stage_updated_at: now,
      stage_history: updatedHistory,
      ...(is_vip !== undefined && { is_vip }),
    })
    .eq('id', id)
    .select()
    .single();

  if (stuErr) {
    console.error('[payment POST] student update', stuErr);
    return NextResponse.json({ error: '학생 상태 업데이트 실패' }, { status: 500 });
  }

  return NextResponse.json({ data: { payment, student } }, { status: 201 });
}
