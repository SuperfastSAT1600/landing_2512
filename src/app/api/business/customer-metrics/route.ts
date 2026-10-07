import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAuthenticated } from '@/lib/server-auth';

export interface CustomerMetrics {
  // 한국 (KRW)
  total_unique_customers: number;
  total_payments: number;
  avg_payments_per_customer: number;
  avg_ltv: number;
  median_ltv: number;
  renewal_rate: number;
  cumulative_revenue: number;
  first_payment_date: string | null;
  // 글로벌 (USD)
  global_unique_customers: number;
  global_total_payments: number;
  global_avg_payments_per_customer: number;
  global_avg_ltv_usd: number;
  global_cumulative_revenue_usd: number;
  // 기간 메타
  is_filtered: boolean; // true면 전체 기간이 아닌 특정 기간 조회
}

function calcMetrics(payments: { amount: number; payment_type?: string }[]) {
  const customers = new Map<string, { total: number; count: number; hasRenewal: boolean }>();
  return customers; // placeholder — 아래에서 직접 처리
}
void calcMetrics; // suppress unused warning

/**
 * GET /api/business/customer-metrics?from=YYYY-MM-DD&to=YYYY-MM-DD
 *
 * 기간 미지정 시 전체 기간. 지정 시 해당 기간 내 결제 기준으로 집계.
 * - 한국: payments 테이블 (paid_at 기준)
 * - 글로벌: global_sales 테이블 (sale_date 기준)
 */
export async function GET(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED' } }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const isFiltered = Boolean(from && to);

  // ── 한국 결제 조회 ───────────────────────────────────────────────────────────
  let koreaQuery = supabaseAdmin
    .from('payments')
    .select('student_id, student_name, amount, payment_type, paid_at')
    .order('paid_at', { ascending: true });
  if (from) koreaQuery = koreaQuery.gte('paid_at', from);
  if (to)   koreaQuery = koreaQuery.lte('paid_at', `${to}T23:59:59`);

  // ── 글로벌 매출 조회 ─────────────────────────────────────────────────────────
  let globalQuery = supabaseAdmin
    .from('global_sales')
    .select('student_name, amount_usd, payment_type, sale_date')
    .order('sale_date', { ascending: true });
  if (from) globalQuery = globalQuery.gte('sale_date', from);
  if (to)   globalQuery = globalQuery.lte('sale_date', to);

  const [koreaResult, globalResult] = await Promise.all([koreaQuery, globalQuery]);

  if (koreaResult.error || globalResult.error) {
    const msg = koreaResult.error?.message ?? globalResult.error?.message;
    return NextResponse.json({ error: { code: 'FETCH_FAILED', message: msg } }, { status: 500 });
  }

  // ── 한국 집계 ────────────────────────────────────────────────────────────────
  const koreaMap = new Map<string, { total: number; count: number; hasRenewal: boolean }>();
  let koreaFirstDate: string | null = null;

  for (const p of koreaResult.data ?? []) {
    if (p.amount <= 0) continue; // 환불 제외 (고객 카운트 기준)
    const key = p.student_id ?? `name:${p.student_name}`;
    const existing = koreaMap.get(key);
    if (!existing) {
      koreaMap.set(key, { total: p.amount, count: 1, hasRenewal: p.payment_type === '재결제' });
      if (!koreaFirstDate) koreaFirstDate = p.paid_at as string;
    } else {
      existing.total += p.amount;
      existing.count += 1;
      if (p.payment_type === '재결제') existing.hasRenewal = true;
    }
  }
  // 환불은 total에만 반영 (고객 카운트는 양수 결제 기준)
  for (const p of koreaResult.data ?? []) {
    if (p.amount >= 0) continue;
    const key = p.student_id ?? `name:${p.student_name}`;
    const existing = koreaMap.get(key);
    if (existing) existing.total += p.amount;
  }

  const kCustomers = Array.from(koreaMap.values());
  const kTotals = kCustomers.map((c) => c.total).sort((a, b) => a - b);
  const kMidIdx = Math.floor(kTotals.length / 2);
  const kMedian = kTotals.length === 0 ? 0
    : kTotals.length % 2 === 0
      ? (kTotals[kMidIdx - 1] + kTotals[kMidIdx]) / 2
      : kTotals[kMidIdx];
  const kTotalPayments = kCustomers.reduce((s, c) => s + c.count, 0);
  const kRenewalCount = kCustomers.filter((c) => c.hasRenewal).length;
  const kRevenue = kCustomers.reduce((s, c) => s + c.total, 0);

  // ── 글로벌 집계 ──────────────────────────────────────────────────────────────
  const globalMap = new Map<string, { total: number; count: number }>();

  for (const g of globalResult.data ?? []) {
    const key = g.student_name as string;
    const existing = globalMap.get(key);
    if (!existing) {
      globalMap.set(key, { total: g.amount_usd, count: 1 });
    } else {
      existing.total += g.amount_usd;
      existing.count += 1;
    }
  }

  const gCustomers = Array.from(globalMap.values());
  const gTotalPayments = gCustomers.reduce((s, c) => s + c.count, 0);
  const gRevenue = gCustomers.reduce((s, c) => s + c.total, 0);

  const metrics: CustomerMetrics = {
    total_unique_customers: kCustomers.length,
    total_payments: kTotalPayments,
    avg_payments_per_customer:
      kCustomers.length > 0
        ? Math.round((kTotalPayments / kCustomers.length) * 10) / 10
        : 0,
    avg_ltv: kCustomers.length > 0 ? Math.round(kRevenue / kCustomers.length) : 0,
    median_ltv: Math.round(kMedian),
    renewal_rate:
      kCustomers.length > 0
        ? Math.round((kRenewalCount / kCustomers.length) * 1000) / 10
        : 0,
    cumulative_revenue: kRevenue,
    first_payment_date: koreaFirstDate,
    global_unique_customers: gCustomers.length,
    global_total_payments: gTotalPayments,
    global_avg_payments_per_customer:
      gCustomers.length > 0
        ? Math.round((gTotalPayments / gCustomers.length) * 10) / 10
        : 0,
    global_avg_ltv_usd: gCustomers.length > 0 ? Math.round(gRevenue / gCustomers.length) : 0,
    global_cumulative_revenue_usd: gRevenue,
    is_filtered: isFiltered,
  };

  return NextResponse.json({ data: metrics });
}
