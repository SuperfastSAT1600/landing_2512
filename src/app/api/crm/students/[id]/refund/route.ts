import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { ChurnType } from '@/types/crm';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function isAuthenticated(req: NextRequest) {
  return req.headers.get('x-admin-key') === process.env.ADMIN_SECRET_KEY;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { refund_amount: number; refund_reason: string; churn_type: ChurnType; created_by?: string | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { refund_amount, refund_reason, churn_type, created_by } = body;
  if (!refund_amount || refund_amount <= 0 || !refund_reason?.trim()) {
    return NextResponse.json({ error: '환불 금액과 사유가 필요합니다.' }, { status: 400 });
  }

  // 학생 정보 조회
  const { data: student, error: fetchErr } = await supabaseAdmin
    .from('students')
    .select('id, name, lead_status')
    .eq('id', id)
    .single();

  if (fetchErr || !student) {
    return NextResponse.json({ error: 'Student not found' }, { status: 404 });
  }

  // 1. 환불 결제 기록 추가 (음수 금액)
  const { error: paymentErr } = await supabaseAdmin
    .from('payments')
    .insert({
      student_id: id,
      student_name: student.name,
      amount: -refund_amount,
      payment_type: '환불',
      payment_method: '계좌이체',
      product: '환불',
      notes: refund_reason,
      tax_type: '면세',
      paid_at: new Date().toISOString(),
      created_by: created_by ?? null,
    });

  if (paymentErr) {
    return NextResponse.json({ error: paymentErr.message }, { status: 500 });
  }

  // 2. 학생 이탈 처리
  const { data: updatedStudent, error: updateErr } = await supabaseAdmin
    .from('students')
    .update({
      funnel_stage: 'churned',
      lead_status: 'inactive',
      churn_tag: `환불: ${refund_reason}`,
      churn_type,
    })
    .eq('id', id)
    .select()
    .single();

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  return NextResponse.json({ data: updatedStudent });
}
