import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAuthenticated } from '@/lib/server-auth';
import { computeStageFlow, type StageFlowRow, type StageHistoryEntry } from '@/lib/funnel-stats';
import { netAmount } from '@/lib/payment-utils';
import { MAX_LEAD_ROWS, isContacted, contactRate, toMonthKey } from '@/lib/crm-stats-core';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export interface B2bTrendPoint {
  month: string; // "2026-07"
  leads: number;
  paid: number;
  revenue: number;
}

export interface B2bCompanyStats {
  company_id: string;
  company_name: string;
  is_active: boolean;
  leads: number;
  contacted: number;
  contact_rate: number;
  paid: number;
  conversion_rate: number; // paid / contacted
  revenue: number;
  net_revenue: number;
  trend: B2bTrendPoint[];
}

export interface B2bStatsData {
  period: { from: string; to: string };
  overview: {
    companies_active: number;
    companies_with_leads: number;
    total_leads: number;
    contacted: number;
    contact_rate: number;
    paid: number;
    conversion_rate: number;
    total_revenue: number;
    total_net_revenue: number;
  };
  by_company: B2bCompanyStats[];
  stage_flow: StageFlowRow[];
}

interface B2bStudent {
  id: string;
  name: string;
  company_id: string | null;
  funnel_stage: string;
  funnel_stage_updated_at: string | null;
  stage_history: StageHistoryEntry[] | null;
  inquiry_date: string | null;
  created_at: string;
}

/**
 * GET /api/crm/b2b/stats?from=YYYY-MM-DD&to=YYYY-MM-DD
 * 업체(company_id)별 소개 리드·전환·매출. 0-리드 업체 포함(companies 로스터 기준).
 * 코호트 = company_id 있는 리드, inquiry_date ∈ [from,to]. 전환=최초결제 anytime, 매출=기간 결제.
 */
export async function GET(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sp = new URL(request.url).searchParams;
  const from = sp.get('from');
  const to = sp.get('to');
  if (!from || !to || !DATE_RE.test(from) || !DATE_RE.test(to)) {
    return NextResponse.json({ error: 'from/to는 YYYY-MM-DD 형식이어야 합니다.' }, { status: 400 });
  }

  // 업체 로스터(0-리드 업체 포함)
  const { data: companies, error: cErr } = await supabaseAdmin
    .from('companies')
    .select('id,name,is_active')
    .order('name');
  if (cErr) {
    console.error('[b2b/stats companies]', cErr);
    return NextResponse.json({ error: '업체 목록을 불러오지 못했습니다.' }, { status: 500 });
  }
  const companyRows = companies ?? [];
  const companyName = new Map<string, string>(companyRows.map((c) => [c.id, c.name]));

  // company_id 있는 B2B 리드 전체(매출 귀속용 id→company 맵 + 기간 코호트 필터)
  const { data: students, error: sErr } = await supabaseAdmin
    .from('students')
    .select('id,name,company_id,funnel_stage,funnel_stage_updated_at,stage_history,inquiry_date,created_at')
    .not('company_id', 'is', null)
    .limit(MAX_LEAD_ROWS);
  if (sErr) {
    console.error('[b2b/stats students]', sErr);
    return NextResponse.json({ error: 'B2B 리드를 불러오지 못했습니다.' }, { status: 500 });
  }
  const b2bStudents = (students ?? []) as B2bStudent[];
  const companyOfStudentId = new Map<string, string>();
  const companyOfStudentName = new Map<string, string>();
  for (const s of b2bStudents) {
    if (s.company_id) {
      companyOfStudentId.set(s.id, s.company_id);
      if (s.name) companyOfStudentName.set(s.name, s.company_id);
    }
  }

  // 결제자 집합(최초결제 amount>1, anytime)
  const { data: firstPayRows } = await supabaseAdmin
    .from('payments')
    .select('student_id,student_name')
    .eq('payment_type', '최초결제')
    .gt('amount', 1);
  const paidIds = new Set<string>();
  const paidNames = new Set<string>();
  for (const p of firstPayRows ?? []) {
    if (p.student_id) paidIds.add(p.student_id);
    if (p.student_name) paidNames.add(p.student_name);
  }
  const isPaid = (s: { id: string; name: string }) => paidIds.has(s.id) || paidNames.has(s.name);

  // 기간 결제(매출·트렌드용)
  const { data: periodPay } = await supabaseAdmin
    .from('payments')
    .select('student_id,student_name,amount,payment_type,tax_type,paid_at')
    .gte('paid_at', `${from}T00:00:00+09:00`)
    .lte('paid_at', `${to}T23:59:59.999+09:00`);

  const inPeriod = (d: string | null) => {
    if (!d) return false;
    const day = d.slice(0, 10);
    return day >= from && day <= to;
  };

  // 업체별 집계 초기화 (0-리드 업체 포함)
  type Acc = { leads: number; contacted: number; paid: number; revenue: number; net: number; trend: Map<string, B2bTrendPoint> };
  const acc = new Map<string, Acc>();
  const ensure = (cid: string): Acc => {
    if (!acc.has(cid)) acc.set(cid, { leads: 0, contacted: 0, paid: 0, revenue: 0, net: 0, trend: new Map() });
    return acc.get(cid)!;
  };
  for (const c of companyRows) ensure(c.id);

  // 코호트(기간 인입) 집계
  const cohort: B2bStudent[] = [];
  for (const s of b2bStudents) {
    if (!s.company_id || !inPeriod(s.inquiry_date ?? s.created_at)) continue;
    cohort.push(s);
    const a = ensure(s.company_id);
    a.leads++;
    if (isContacted(s)) a.contacted++;
    if (isPaid(s)) a.paid++;
    const mo = toMonthKey(s.inquiry_date ?? s.created_at);
    if (!a.trend.has(mo)) a.trend.set(mo, { month: mo, leads: 0, paid: 0, revenue: 0 });
    a.trend.get(mo)!.leads++;
  }

  // 기간 결제 → 업체 귀속(매출·트렌드)
  for (const p of periodPay ?? []) {
    const cid = (p.student_id && companyOfStudentId.get(p.student_id)) || (p.student_name && companyOfStudentName.get(p.student_name));
    if (!cid) continue;
    const a = ensure(cid);
    a.revenue += p.amount;
    a.net += netAmount(p);
    const mo = toMonthKey(p.paid_at.slice(0, 10));
    if (!a.trend.has(mo)) a.trend.set(mo, { month: mo, leads: 0, paid: 0, revenue: 0 });
    const tp = a.trend.get(mo)!;
    tp.revenue += p.amount;
    if (p.payment_type === '최초결제' && p.amount > 1) tp.paid++;
  }

  const by_company: B2bCompanyStats[] = companyRows.map((c) => {
    const a = acc.get(c.id)!;
    return {
      company_id: c.id,
      company_name: c.name,
      is_active: c.is_active,
      leads: a.leads,
      contacted: a.contacted,
      contact_rate: contactRate(a.contacted, a.leads),
      paid: a.paid,
      conversion_rate: contactRate(a.paid, a.contacted),
      revenue: a.revenue,
      net_revenue: a.net,
      trend: [...a.trend.values()].sort((x, y) => x.month.localeCompare(y.month)),
    };
  }).sort((x, y) => y.leads - x.leads || y.revenue - x.revenue || x.company_name.localeCompare(y.company_name));

  const totalLeads = cohort.length;
  const totalContacted = cohort.filter(isContacted).length;
  const totalPaid = cohort.filter(isPaid).length;
  let totalRevenue = 0, totalNet = 0;
  for (const a of acc.values()) { totalRevenue += a.revenue; totalNet += a.net; }

  const data: B2bStatsData = {
    period: { from, to },
    overview: {
      companies_active: companyRows.filter((c) => c.is_active).length,
      companies_with_leads: by_company.filter((c) => c.leads > 0).length,
      total_leads: totalLeads,
      contacted: totalContacted,
      contact_rate: contactRate(totalContacted, totalLeads),
      paid: totalPaid,
      conversion_rate: contactRate(totalPaid, totalContacted),
      total_revenue: totalRevenue,
      total_net_revenue: totalNet,
    },
    by_company,
    stage_flow: computeStageFlow(cohort),
  };

  return NextResponse.json({ data });
}
