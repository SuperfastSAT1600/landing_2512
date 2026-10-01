import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAuthenticated } from '@/lib/server-auth';
import type { BusinessTargetCurrency, BusinessTargetSegment, BusinessTargetPaymentType } from '@/lib/business-targets';

export interface BusinessMonthlyTarget {
  id: string;
  month: string; // YYYY-MM-01
  segment: BusinessTargetSegment;
  payment_type: BusinessTargetPaymentType;
  target_amount: number;
  currency: BusinessTargetCurrency;
  created_at: string;
  updated_at: string;
}

const VALID_SEGMENTS: BusinessTargetSegment[] = ['tutoring', 'global'];
const VALID_PAYMENT_TYPES: BusinessTargetPaymentType[] = ['all', 'first', 're'];
const MONTH_RE = /^\d{4}-\d{2}$/;

function currencyOf(_segment: BusinessTargetSegment): BusinessTargetCurrency {
  return 'KRW';
}

export async function GET(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const segment = request.nextUrl.searchParams.get('segment');
  if (!segment || !VALID_SEGMENTS.includes(segment as BusinessTargetSegment)) {
    return NextResponse.json({ error: 'segment은 tutoring|global 중 하나여야 합니다.' }, { status: 400 });
  }

  const paymentTypeParam = request.nextUrl.searchParams.get('payment_type');

  let query = supabaseAdmin
    .from('business_monthly_targets')
    .select('*')
    .eq('segment', segment)
    .order('month', { ascending: true });

  if (paymentTypeParam && VALID_PAYMENT_TYPES.includes(paymentTypeParam as BusinessTargetPaymentType)) {
    query = query.eq('payment_type', paymentTypeParam);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[monthly-targets GET]', error);
    return NextResponse.json({ error: '목표 목록을 불러오지 못했습니다.' }, { status: 500 });
  }

  return NextResponse.json({ data: data as BusinessMonthlyTarget[] });
}

export async function PUT(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { segment?: string; month?: string; target_amount?: number; payment_type?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.segment || !VALID_SEGMENTS.includes(body.segment as BusinessTargetSegment)) {
    return NextResponse.json({ error: 'segment은 tutoring|global 중 하나여야 합니다.' }, { status: 400 });
  }
  if (!body.month || !MONTH_RE.test(body.month)) {
    return NextResponse.json({ error: 'month는 YYYY-MM 형식이어야 합니다.' }, { status: 400 });
  }
  if (typeof body.target_amount !== 'number' || !(body.target_amount > 0)) {
    return NextResponse.json({ error: '목표 금액은 0보다 큰 숫자여야 합니다.' }, { status: 400 });
  }

  const paymentType: BusinessTargetPaymentType =
    body.payment_type && VALID_PAYMENT_TYPES.includes(body.payment_type as BusinessTargetPaymentType)
      ? (body.payment_type as BusinessTargetPaymentType)
      : 'all';

  const segment = body.segment as BusinessTargetSegment;
  const { data, error } = await supabaseAdmin
    .from('business_monthly_targets')
    .upsert(
      {
        month: `${body.month}-01`,
        segment,
        payment_type: paymentType,
        target_amount: body.target_amount,
        currency: currencyOf(segment),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'month,segment,payment_type' },
    )
    .select()
    .single();

  if (error) {
    console.error('[monthly-targets PUT]', error);
    return NextResponse.json({ error: '목표 저장에 실패했습니다.' }, { status: 500 });
  }

  return NextResponse.json({ data: data as BusinessMonthlyTarget });
}
