import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAuthenticated } from '@/lib/server-auth';
import { isCountryCode, normalizeCountryCode } from '@/lib/countries';
import { GLOBAL_SALE_BILLING_TYPES, type GlobalSaleBillingType } from '@/lib/global-sales-types';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { error } = await supabaseAdmin.from('global_sales').delete().eq('id', id);

  if (error) {
    console.error('[global-sales DELETE]', error);
    return NextResponse.json({ error: '삭제에 실패했습니다.' }, { status: 500 });
  }

  return NextResponse.json({ data: { id } });
}

/**
 * 국가·결제 방식만 수정한다 — 컬럼 도입 이전 기록을 나중에 채워 넣기 위한 경로.
 * 이름·금액·날짜는 여전히 수정 대상이 아니다(추가·삭제로 처리).
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { country_code?: string | null; billing_type?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // 온 필드만 고친다 — 국가·결제 방식을 따로 또는 함께 바꿀 수 있다.
  const updates: { country_code?: string | null; billing_type?: GlobalSaleBillingType } = {};

  if ('country_code' in body) {
    const countryCode = normalizeCountryCode(body.country_code);
    if (countryCode && !isCountryCode(countryCode)) {
      return NextResponse.json({ error: '알 수 없는 국가 코드입니다.' }, { status: 400 });
    }
    updates.country_code = countryCode;
  }

  if ('billing_type' in body) {
    const billingType = body.billing_type as GlobalSaleBillingType;
    if (!GLOBAL_SALE_BILLING_TYPES.includes(billingType)) {
      return NextResponse.json({ error: '결제 방식은 일회성|구독 중 하나여야 합니다.' }, { status: 400 });
    }
    updates.billing_type = billingType;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: '수정할 필드가 없습니다.' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('global_sales')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('[global-sales PATCH]', error);
    return NextResponse.json({ error: '수정에 실패했습니다.' }, { status: 500 });
  }

  return NextResponse.json({ data });
}
