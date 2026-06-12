import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAuthenticated } from '@/lib/server-auth';
import { hasReachedStage } from '@/lib/funnel-stats';
import { getMarketingGroup, MARKETING_GROUPS } from '@/lib/marketing-groups';
import type { MarketingGroup } from '@/lib/marketing-groups';
import type {
  MarketingGroupStats,
  MarketingDailyRow,
  MarketingSourceStats,
  MarketingStatsResponse,
} from '@/types/marketing';

type StudentRow = {
  id: string;
  name: string;
  funnel_stage: string;
  stage_history: { stage: string; label: string; entered_at: string }[] | null;
  traffic_source: string | null;
  inquiry_date: string | null;
  created_at: string;
  retry_strategy_id: string | null;
};

type PaymentRow = {
  student_id: string | null;
  student_name: string | null;
  amount: number;
  payment_type: string | null;
  paid_at: string;
  tax_type: string | null;
};

function isContacted(s: StudentRow): boolean {
  return hasReachedStage(s, '2');
}

function netAmount(p: { amount: number; tax_type?: string | null }): number {
  return p.tax_type === '과세' ? Math.round(p.amount * 0.9) : p.amount;
}

function contactRate(contacted: number, leads: number): number {
  if (leads === 0) return 0;
  return Math.round((contacted / leads) * 10000) / 100;
}

export async function GET(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED' } }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  if (!from || !to) {
    return NextResponse.json(
      { error: { code: 'MISSING_PARAMS', message: 'from, to 파라미터가 필요합니다.' } },
      { status: 400 }
    );
  }

  const { data: students, error: sErr } = await supabaseAdmin
    .from('students')
    .select(
      'id, name, funnel_stage, stage_history, traffic_source, inquiry_date, created_at, retry_strategy_id'
    )
    .gte('inquiry_date', from)
    .lte('inquiry_date', to);

  if (sErr) {
    return NextResponse.json({ error: { code: 'FETCH_FAILED', message: sErr.message } }, { status: 500 });
  }

  const { data: payments, error: pErr } = await supabaseAdmin
    .from('payments')
    .select('student_id, student_name, amount, payment_type, paid_at, tax_type')
    .gte('paid_at', `${from}T00:00:00`)
    .lte('paid_at', `${to}T23:59:59`);

  const paymentList: PaymentRow[] = pErr ? [] : (payments ?? []);
  const leadList: StudentRow[] = students ?? [];

  // student id → traffic_source 맵
  const studentSourceMap = new Map(leadList.map((s) => [s.id, s.traffic_source ?? null]));

  // 결제한 학생 집합 (최초결제 기준)
  const paidStudentIds = new Set<string>();
  const paidStudentNames = new Set<string>();
  for (const p of paymentList) {
    if (p.payment_type === '최초결제') {
      if (p.student_id) paidStudentIds.add(p.student_id);
      if (p.student_name) paidStudentNames.add(p.student_name);
    }
  }

  function isPaid(s: { id: string; name: string }): boolean {
    return paidStudentIds.has(s.id) || paidStudentNames.has(s.name);
  }

  // ── 그룹 × 소스 집계 ────────────────────────────────────────────────────────
  type Bucket = { leads: number; contacted: number; paid: number; revenue: number; net_revenue: number };
  const groupMap = new Map<MarketingGroup, Map<string, Bucket>>();

  function getBucket(group: MarketingGroup, source: string): Bucket {
    if (!groupMap.has(group)) groupMap.set(group, new Map());
    const srcMap = groupMap.get(group)!;
    if (!srcMap.has(source)) srcMap.set(source, { leads: 0, contacted: 0, paid: 0, revenue: 0, net_revenue: 0 });
    return srcMap.get(source)!;
  }

  for (const s of leadList) {
    const group = getMarketingGroup(s.traffic_source);
    const source = s.traffic_source ?? '미입력';
    const bucket = getBucket(group, source);
    bucket.leads++;
    const isRetry = !!s.retry_strategy_id;
    if (!isRetry && isContacted(s)) bucket.contacted++;
    if (isPaid(s)) bucket.paid++;
  }

  // 결제 금액 집계
  for (const p of paymentList) {
    const srcVal = p.student_id ? (studentSourceMap.get(p.student_id) ?? null) : null;
    const group = getMarketingGroup(srcVal);
    const source = srcVal ?? '미입력';
    const bucket = getBucket(group, source);
    bucket.revenue += p.amount;
    bucket.net_revenue += netAmount(p);
  }

  // ── 그룹 통계 배열 생성 ──────────────────────────────────────────────────────
  const allGroups: MarketingGroup[] = [...MARKETING_GROUPS, '미분류'];
  const groups: MarketingGroupStats[] = allGroups
    .map((group) => {
      const srcMap = groupMap.get(group);
      if (!srcMap) return null;

      const sources: MarketingSourceStats[] = Array.from(srcMap.entries())
        .map(([source, d]) => ({
          source,
          leads: d.leads,
          contacted: d.contacted,
          contact_rate: contactRate(d.contacted, d.leads),
          paid: d.paid,
          conversion_rate: d.leads > 0 ? Math.round((d.paid / d.leads) * 10000) / 100 : 0,
          revenue: d.revenue,
          net_revenue: d.net_revenue,
        }))
        .sort((a, b) => b.leads - a.leads);

      const totals = sources.reduce(
        (acc, s) => ({
          leads: acc.leads + s.leads,
          contacted: acc.contacted + s.contacted,
          paid: acc.paid + s.paid,
          revenue: acc.revenue + s.revenue,
          net_revenue: acc.net_revenue + s.net_revenue,
        }),
        { leads: 0, contacted: 0, paid: 0, revenue: 0, net_revenue: 0 }
      );

      return {
        group,
        ...totals,
        contact_rate: contactRate(totals.contacted, totals.leads),
        conversion_rate: totals.leads > 0 ? Math.round((totals.paid / totals.leads) * 10000) / 100 : 0,
        sources,
      } satisfies MarketingGroupStats;
    })
    .filter((g): g is MarketingGroupStats => g !== null);

  // ── 일별 집계 ────────────────────────────────────────────────────────────────
  const dailyMap = new Map<string, Map<MarketingGroup, number>>();

  for (const s of leadList) {
    const date = s.inquiry_date!.slice(0, 10);
    const group = getMarketingGroup(s.traffic_source);
    if (!dailyMap.has(date)) dailyMap.set(date, new Map());
    const dayMap = dailyMap.get(date)!;
    dayMap.set(group, (dayMap.get(group) ?? 0) + 1);
  }

  const daily: MarketingDailyRow[] = [];
  for (const [date, dayMap] of Array.from(dailyMap.entries()).sort(([a], [b]) => a.localeCompare(b))) {
    for (const [group, leads] of dayMap.entries()) {
      daily.push({ date, group, leads });
    }
  }

  const response: MarketingStatsResponse = { groups, daily };
  return NextResponse.json({ data: response });
}
