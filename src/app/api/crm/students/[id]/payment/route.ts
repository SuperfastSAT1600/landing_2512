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

  let body: { product: string; hours?: number | null; amount: number; paid_at?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { product, hours, amount, paid_at } = body;

  if (!product || !amount || amount <= 0) {
    return NextResponse.json({ error: '상품과 금액은 필수입니다.' }, { status: 400 });
  }

  const { data: payment, error: payErr } = await supabaseAdmin
    .from('payments')
    .insert({
      student_id: id,
      product,
      hours: hours ?? null,
      amount,
      paid_at: paid_at ?? new Date().toISOString().slice(0, 10),
    })
    .select()
    .single();

  if (payErr) {
    console.error('[payment POST]', payErr);
    return NextResponse.json({ error: '결제 기록 저장 실패' }, { status: 500 });
  }

  const { data: student, error: stuErr } = await supabaseAdmin
    .from('students')
    .update({ lead_status: 'enrolled' })
    .eq('id', id)
    .select()
    .single();

  if (stuErr) {
    console.error('[payment POST] student update', stuErr);
    return NextResponse.json({ error: '학생 상태 업데이트 실패' }, { status: 500 });
  }

  return NextResponse.json({ data: { payment, student } }, { status: 201 });
}
