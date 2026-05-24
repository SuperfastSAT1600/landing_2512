import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAuthenticated } from '@/lib/server-auth';

export interface StatsBySource {
  source: string;
  leads: number;
  contacted: number;
  contact_rate: number;
  paid: number;
  conversion_rate: number;
  revenue: number;
}

export interface StatsMonthly {
  month: string;   // "2026-01"
  leads: number;
  contacted: number;
  paid: number;
  revenue: number;
}

export interface CrmStatsData {
  period: { from: string; to: string };
  overview: {
    total_leads: number;
    contacted: number;
    contact_rate: number;
    paid: number;       // 최초결제 기준 학생 수
    conversion_rate: number;
    total_revenue: number;
  };
  by_source: StatsBySource[];
  monthly: StatsMonthly[];
}

function isContacted(student: { funnel_stage: string; lead_status: string; consultation_timeline: unknown }): boolean {
  // 컨택 성공 = 2단계 이상 진입 (active) 또는 상담 기록 존재 (inactive)
  if (student.lead_status === 'active' || student.lead_status === 'reactivating') {
    return student.funnel_stage !== '1';
  }
  // inactive(churned): 퍼널 이력이 없으므로 consultation_timeline 존재 여부로 판단
  const tl = student.consultation_timeline as unknown[];
  return Array.isArray(tl) && tl.length > 0;
}

function toMonthKey(dateStr: string): string {
  return dateStr.slice(0, 7); // "2026-05"
}

/**
 * GET /api/crm/stats?from=YYYY-MM-DD&to=YYYY-MM-DD
 * 유입 채널별 컨택 성공률 + 결제 전환율 (코호트 기준)
 */
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

  // 기간 내 신규 리드 조회 (inquiry_date 기준, fallback: created_at)
  const { data: students, error: sErr } = await supabaseAdmin
    .from('students')
    .select('id, name, funnel_stage, lead_status, traffic_source, inquiry_date, created_at, consultation_timeline')
    .or(`inquiry_date.gte.${from},and(inquiry_date.is.null,created_at.gte.${from})`)
    .or(`inquiry_date.lte.${to},and(inquiry_date.is.null,created_at.lte.${to})`);

  if (sErr) {
    return NextResponse.json({ error: { code: 'FETCH_FAILED', message: sErr.message } }, { status: 500 });
  }

  // 기간 내 payments 조회 (최초결제만 전환율 계산에 포함)
  const { data: payments, error: pErr } = await supabaseAdmin
    .from('payments')
    .select('student_id, student_name, amount, payment_type, paid_at')
    .gte('paid_at', `${from}T00:00:00`)
    .lte('paid_at', `${to}T23:59:59`);

  const paymentList = pErr ? [] : (payments ?? []);

  // 학생 ID → payment 맵 (최초결제 기준)
  const paidStudentIds = new Set<string>();
  const paidStudentNames = new Set<string>();
  let totalRevenue = 0;

  for (const p of paymentList) {
    totalRevenue += p.amount;
    if (p.payment_type === '최초결제') {
      if (p.student_id) paidStudentIds.add(p.student_id);
      if (p.student_name) paidStudentNames.add(p.student_name);
    }
  }

  const leadList = students ?? [];

  // 학생이 결제했는지 판단
  function isPaid(s: { id: string; name: string }): boolean {
    return paidStudentIds.has(s.id) || paidStudentNames.has(s.name);
  }

  // ── Overview ──────────────────────────────────────────────────────────────
  const total = leadList.length;
  const contactedCount = leadList.filter((s) => isContacted(s)).length;
  const paidCount = leadList.filter((s) => isPaid(s)).length;

  // ── By Source ─────────────────────────────────────────────────────────────
  const sourceMap = new Map<string, { leads: number; contacted: number; paid: number; revenue: number }>();

  for (const s of leadList) {
    const src = s.traffic_source ?? '미입력';
    if (!sourceMap.has(src)) sourceMap.set(src, { leads: 0, contacted: 0, paid: 0, revenue: 0 });
    const entry = sourceMap.get(src)!;
    entry.leads++;
    if (isContacted(s)) entry.contacted++;
    if (isPaid(s)) entry.paid++;
  }

  // 채널별 결제 금액 집계 (student 매핑)
  const studentSourceMap = new Map(leadList.map((s) => [s.id, s.traffic_source ?? '미입력']));
  for (const p of paymentList) {
    const src = p.student_id ? (studentSourceMap.get(p.student_id) ?? '미입력') : '미입력';
    const entry = sourceMap.get(src);
    if (entry) entry.revenue += p.amount;
  }

  const by_source: StatsBySource[] = Array.from(sourceMap.entries())
    .map(([source, d]) => ({
      source,
      leads: d.leads,
      contacted: d.contacted,
      contact_rate: d.leads > 0 ? Math.round((d.contacted / d.leads) * 1000) / 10 : 0,
      paid: d.paid,
      conversion_rate: d.leads > 0 ? Math.round((d.paid / d.leads) * 1000) / 10 : 0,
      revenue: d.revenue,
    }))
    .sort((a, b) => b.leads - a.leads);

  // ── Monthly ───────────────────────────────────────────────────────────────
  const monthMap = new Map<string, { leads: number; contacted: number; paid: number; revenue: number }>();

  for (const s of leadList) {
    const mo = toMonthKey(s.inquiry_date ?? s.created_at);
    if (!monthMap.has(mo)) monthMap.set(mo, { leads: 0, contacted: 0, paid: 0, revenue: 0 });
    const entry = monthMap.get(mo)!;
    entry.leads++;
    if (isContacted(s)) entry.contacted++;
    if (isPaid(s)) entry.paid++;
  }

  for (const p of paymentList) {
    const mo = toMonthKey(p.paid_at);
    if (!monthMap.has(mo)) monthMap.set(mo, { leads: 0, contacted: 0, paid: 0, revenue: 0 });
    monthMap.get(mo)!.revenue += p.amount;
  }

  const monthly: StatsMonthly[] = Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, d]) => ({ month, ...d }));

  const data: CrmStatsData = {
    period: { from, to },
    overview: {
      total_leads: total,
      contacted: contactedCount,
      contact_rate: total > 0 ? Math.round((contactedCount / total) * 1000) / 10 : 0,
      paid: paidCount,
      conversion_rate: total > 0 ? Math.round((paidCount / total) * 1000) / 10 : 0,
      total_revenue: totalRevenue,
    },
    by_source,
    monthly,
  };

  return NextResponse.json({ data });
}
