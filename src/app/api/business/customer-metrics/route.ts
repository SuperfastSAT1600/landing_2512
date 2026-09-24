import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAuthenticated } from '@/lib/server-auth';

export interface CustomerMetrics {
  total_unique_customers: number;
  total_payments: number;
  avg_payments_per_customer: number;
  avg_ltv: number;
  median_ltv: number;
  renewal_rate: number; // 재결제 경험 있는 고객 비율
  cumulative_revenue: number; // 전체 기간 순매출
  first_payment_date: string | null;
}

/**
 * GET /api/business/customer-metrics
 * 전체 기간 고객 지표 (VC 피치용): 총 고객 수, LTV, 결제 빈도, 재구매율
 */
export async function GET(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED' } }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from('payments')
    .select('student_id, student_name, amount, payment_type, paid_at')
    .order('paid_at', { ascending: true });

  if (error) {
    return NextResponse.json({ error: { code: 'FETCH_FAILED', message: error.message } }, { status: 500 });
  }

  // 고객별 집계 (환불 포함해서 합산, 환불은 음수)
  const customerMap = new Map<string, { total: number; count: number; hasRenewal: boolean; firstDate: string }>();

  for (const p of data ?? []) {
    // student_id가 없으면 student_name을 키로 사용
    const key = p.student_id ?? `name:${p.student_name}`;
    const existing = customerMap.get(key);
    if (!existing) {
      customerMap.set(key, {
        total: p.amount,
        count: p.amount > 0 ? 1 : 0,
        hasRenewal: p.payment_type === '재결제',
        firstDate: p.paid_at,
      });
    } else {
      existing.total += p.amount;
      if (p.amount > 0) existing.count += 1;
      if (p.payment_type === '재결제') existing.hasRenewal = true;
    }
  }

  // 양수 결제가 1건 이상인 고객만 카운트
  const payingCustomers = Array.from(customerMap.values()).filter((c) => c.count > 0);

  if (payingCustomers.length === 0) {
    return NextResponse.json({
      data: {
        total_unique_customers: 0,
        total_payments: 0,
        avg_payments_per_customer: 0,
        avg_ltv: 0,
        median_ltv: 0,
        renewal_rate: 0,
        cumulative_revenue: 0,
        first_payment_date: null,
      } satisfies CustomerMetrics,
    });
  }

  const totalPayments = payingCustomers.reduce((s, c) => s + c.count, 0);
  const ltvList = payingCustomers.map((c) => c.total).sort((a, b) => a - b);
  const midIdx = Math.floor(ltvList.length / 2);
  const medianLtv =
    ltvList.length % 2 === 0
      ? (ltvList[midIdx - 1] + ltvList[midIdx]) / 2
      : ltvList[midIdx];
  const renewalCount = payingCustomers.filter((c) => c.hasRenewal).length;

  const firstPaymentDate = (data ?? []).find((p) => p.amount > 0)?.paid_at ?? null;

  const metrics: CustomerMetrics = {
    total_unique_customers: payingCustomers.length,
    total_payments: totalPayments,
    avg_payments_per_customer: Math.round((totalPayments / payingCustomers.length) * 10) / 10,
    avg_ltv: Math.round(payingCustomers.reduce((s, c) => s + c.total, 0) / payingCustomers.length),
    median_ltv: Math.round(medianLtv),
    renewal_rate: Math.round((renewalCount / payingCustomers.length) * 1000) / 10,
    cumulative_revenue: payingCustomers.reduce((s, c) => s + c.total, 0),
    first_payment_date: firstPaymentDate,
  };

  return NextResponse.json({ data: metrics });
}
