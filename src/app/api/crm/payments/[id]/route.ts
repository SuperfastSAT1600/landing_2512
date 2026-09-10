import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAuthenticated } from '@/lib/server-auth';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { error } = await supabaseAdmin.from('payments').delete().eq('id', id);

  if (error) {
    console.error('[payments DELETE]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return new NextResponse(null, { status: 204 });
}

/**
 * PATCH /api/crm/payments/[id]
 * 결제 담당자(created_by)·유형·세금·금액·시간 수동 수정.
 * 금액은 가결제(0원) → 실입금액 보정에 쓰인다.
 * Body: { created_by?, payment_type?, tax_type?, amount?, hours? }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: {
    created_by?: string | null;
    payment_type?: string;
    tax_type?: string;
    amount?: number;
    hours?: number | null;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const updates: Record<string, string | number | null> = {};
  if ('created_by' in body) updates.created_by = body.created_by?.trim() || null;
  if ('payment_type' in body) {
    // 환불은 변경 불가(금액 부호와 연동). 최초/재결제/원포인트만 허용.
    if (!['최초결제', '재결제', '원포인트'].includes(body.payment_type ?? '')) {
      return NextResponse.json({ error: '허용되지 않는 결제 유형입니다.' }, { status: 400 });
    }
    updates.payment_type = body.payment_type!;
  }
  if ('tax_type' in body) {
    if (!['면세', '과세'].includes(body.tax_type ?? '')) {
      return NextResponse.json({ error: '허용되지 않는 세금 유형입니다.' }, { status: 400 });
    }
    updates.tax_type = body.tax_type!;
  }
  if ('hours' in body) {
    const hours = body.hours;
    if (hours !== null && (!Number.isInteger(hours) || (hours as number) <= 0)) {
      return NextResponse.json({ error: '시간은 1 이상의 정수여야 합니다.' }, { status: 400 });
    }
    updates.hours = hours ?? null;
  }
  if ('amount' in body) {
    if (!Number.isInteger(body.amount)) {
      return NextResponse.json({ error: '금액은 정수여야 합니다.' }, { status: 400 });
    }
    // 부호 규칙은 결과 결제 유형 기준. 요청에 유형이 없으면 현재 값을 읽는다.
    let effectiveType = updates.payment_type as string | undefined;
    if (!effectiveType) {
      const { data: current } = await supabaseAdmin
        .from('payments')
        .select('payment_type')
        .eq('id', id)
        .single();
      if (!current) {
        return NextResponse.json({ error: '결제 기록을 찾을 수 없습니다.' }, { status: 404 });
      }
      effectiveType = current.payment_type;
    }
    const amount = body.amount!;
    if (effectiveType === '환불' ? amount >= 0 : amount < 0) {
      return NextResponse.json(
        { error: effectiveType === '환불' ? '환불 금액은 음수여야 합니다.' : '금액은 0 이상이어야 합니다.' },
        { status: 400 }
      );
    }
    updates.amount = amount;
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: '수정할 항목이 없습니다.' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('payments')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('[payments PATCH]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}
