import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAuthenticated } from '@/lib/server-auth';

export interface MonthlyLtvPoint {
  month: string; // YYYY-MM
  customers: number; // 그 달까지 누적 고유 고객 수
  ltv: number; // 그 달까지 누적 1인당 평균 순매출 (KRW 또는 USD)
  revenue: number; // 그 달까지 누적 순매출 합계
}

export interface LtvTrendData {
  korea: MonthlyLtvPoint[];
  global: MonthlyLtvPoint[];
}

function monthRange(from: string, to: string): string[] {
  const months: string[] = [];
  let [y, m] = from.split('-').map(Number);
  const [ey, em] = to.split('-').map(Number);
  while (y < ey || (y === ey && m <= em)) {
    months.push(`${y}-${String(m).padStart(2, '0')}`);
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return months;
}

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

function buildLtvSeries(
  // key -> { firstMonth, payments: {month, amount}[] }
  customers: Map<string, { firstMonth: string; payments: { month: string; amount: number }[] }>,
): MonthlyLtvPoint[] {
  if (customers.size === 0) return [];

  const allFirstMonths = Array.from(customers.values()).map((c) => c.firstMonth);
  const minMonth = allFirstMonths.reduce((a, b) => (a < b ? a : b));
  const now = currentMonth();

  return monthRange(minMonth, now).map((m) => {
    let totalCustomers = 0;
    let totalRevenue = 0;

    for (const { firstMonth, payments } of customers.values()) {
      if (firstMonth > m) continue;
      totalCustomers++;
      for (const p of payments) {
        if (p.month <= m) totalRevenue += p.amount;
      }
    }

    return {
      month: m,
      customers: totalCustomers,
      ltv: totalCustomers > 0 ? Math.round(totalRevenue / totalCustomers) : 0,
      revenue: totalRevenue,
    };
  });
}

/**
 * GET /api/business/ltv-trend
 * 월별 누적 LTV 트렌드 — 한국(KRW)과 글로벌(USD)을 각각 반환한다.
 *
 * LTV 정의: 해당 달까지 유입된 모든 고객의 누적 순매출(환불 포함) ÷ 고객 수.
 * 달이 지날수록 재구매가 쌓이므로 우상향이면 리텐션이 좋다는 신호.
 */
export async function GET(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED' } }, { status: 401 });
  }

  const [paymentsResult, globalResult] = await Promise.all([
    supabaseAdmin
      .from('payments')
      .select('student_id, student_name, amount, paid_at')
      .order('paid_at', { ascending: true }),
    supabaseAdmin
      .from('global_sales')
      .select('student_name, amount_usd, sale_date')
      .order('sale_date', { ascending: true }),
  ]);

  if (paymentsResult.error || globalResult.error) {
    const msg = paymentsResult.error?.message ?? globalResult.error?.message;
    return NextResponse.json({ error: { code: 'FETCH_FAILED', message: msg } }, { status: 500 });
  }

  // ── 한국 LTV 시리즈 ──────────────────────────────────────────────────────────
  const koreaMap = new Map<string, { firstMonth: string; payments: { month: string; amount: number }[] }>();

  for (const p of paymentsResult.data ?? []) {
    const key = p.student_id ?? `name:${p.student_name}`;
    const month = (p.paid_at as string).slice(0, 7);
    const existing = koreaMap.get(key);
    if (!existing) {
      // 최초 진입은 양수 결제 기준 (환불만 있는 건 고객으로 안 봄)
      if (p.amount > 0) {
        koreaMap.set(key, { firstMonth: month, payments: [{ month, amount: p.amount }] });
      }
    } else {
      existing.payments.push({ month, amount: p.amount });
    }
  }

  // ── 글로벌 LTV 시리즈 (USD) ──────────────────────────────────────────────────
  const globalMap = new Map<string, { firstMonth: string; payments: { month: string; amount: number }[] }>();

  for (const g of globalResult.data ?? []) {
    const key = g.student_name as string;
    const month = (g.sale_date as string).slice(0, 7);
    const existing = globalMap.get(key);
    if (!existing) {
      globalMap.set(key, { firstMonth: month, payments: [{ month, amount: g.amount_usd }] });
    } else {
      existing.payments.push({ month, amount: g.amount_usd });
    }
  }

  const data: LtvTrendData = {
    korea: buildLtvSeries(koreaMap),
    global: buildLtvSeries(globalMap),
  };

  return NextResponse.json({ data });
}
