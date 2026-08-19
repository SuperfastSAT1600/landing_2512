import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAuthenticated } from '@/lib/server-auth';

// 튜터링(CRM students/payments)과 무관한 별도 상품 라인의 단순 매출 기록 — USD.
export type GlobalSalePaymentType = '최초결제' | '재결제';

export interface GlobalSaleEntry {
  id: string;
  student_name: string;
  payment_type: GlobalSalePaymentType;
  amount_usd: number;
  sale_date: string; // YYYY-MM-DD
  created_at: string;
}

const VALID_PAYMENT_TYPES: GlobalSalePaymentType[] = ['최초결제', '재결제'];

export async function GET(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from('global_sales')
    .select('*')
    .order('sale_date', { ascending: false });

  if (error) {
    console.error('[global-sales GET]', error);
    return NextResponse.json({ error: '글로벌 매출 목록을 불러오지 못했습니다.' }, { status: 500 });
  }

  return NextResponse.json({ data: data as GlobalSaleEntry[] });
}

export async function POST(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: {
    student_name?: string;
    payment_type?: string;
    amount_usd?: number;
    sale_date?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.student_name?.trim()) {
    return NextResponse.json({ error: '학생 이름을 입력해주세요.' }, { status: 400 });
  }
  if (!body.payment_type || !VALID_PAYMENT_TYPES.includes(body.payment_type as GlobalSalePaymentType)) {
    return NextResponse.json({ error: '유형은 최초결제|재결제 중 하나여야 합니다.' }, { status: 400 });
  }
  if (typeof body.amount_usd !== 'number' || !(body.amount_usd > 0)) {
    return NextResponse.json({ error: '금액은 0보다 큰 숫자여야 합니다.' }, { status: 400 });
  }
  if (!body.sale_date?.trim()) {
    return NextResponse.json({ error: '판매일을 입력해주세요.' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('global_sales')
    .insert({
      student_name: body.student_name.trim(),
      payment_type: body.payment_type,
      amount_usd: body.amount_usd,
      sale_date: body.sale_date,
    })
    .select()
    .single();

  if (error) {
    console.error('[global-sales POST]', error);
    return NextResponse.json({ error: '글로벌 매출 기록에 실패했습니다.' }, { status: 500 });
  }

  return NextResponse.json({ data: data as GlobalSaleEntry }, { status: 201 });
}
