import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAuthenticated } from '@/lib/server-auth';
import type { BusinessTargetCurrency, BusinessTargetSegment } from '@/lib/business-targets';

// Business 페이지 "목표 대비 실적" 그래프용 월별 목표. 튜터링/글로벌은 완전히 분리된
// segment지만 통화는 둘 다 원화(KRW)로 통일한다 — 글로벌 실적(달러 매출)은 집계 시점에
// 1$=1,400원으로 환산해서 비교하므로 목표 자체를 USD로 들고 있을 이유가 없다.
export interface BusinessMonthlyTarget {
  id: string;
  month: string; // YYYY-MM-01
  segment: BusinessTargetSegment;
  target_amount: number;
  currency: BusinessTargetCurrency;
  created_at: string;
  updated_at: string;
}

const VALID_SEGMENTS: BusinessTargetSegment[] = ['tutoring', 'global'];
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

  const { data, error } = await supabaseAdmin
    .from('business_monthly_targets')
    .select('*')
    .eq('segment', segment)
    .order('month', { ascending: true });

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

  let body: { segment?: string; month?: string; target_amount?: number };
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

  const segment = body.segment as BusinessTargetSegment;
  const { data, error } = await supabaseAdmin
    .from('business_monthly_targets')
    .upsert(
      {
        month: `${body.month}-01`,
        segment,
        target_amount: body.target_amount,
        currency: currencyOf(segment),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'month,segment' },
    )
    .select()
    .single();

  if (error) {
    console.error('[monthly-targets PUT]', error);
    return NextResponse.json({ error: '목표 저장에 실패했습니다.' }, { status: 500 });
  }

  return NextResponse.json({ data: data as BusinessMonthlyTarget });
}
