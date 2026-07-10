import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAuthenticated } from '@/lib/server-auth';
import { getWeekLabel } from '@/lib/week-definitions';
import { computeStageFlow, hasReachedStage, type StageFlowRow } from '@/lib/funnel-stats';
import { netAmount } from '@/lib/payment-utils';

// 리드 조회 행 상한 — Supabase 기본 1000행 무음 절단을 넘기 위한 명시 상한(넉넉한 헤드룸).
const MAX_LEAD_ROWS = 5000;

export interface StatsBySource {
  source: string;
  leads: number;
  contacted: number;
  contact_rate: number;
  paid: number;
  conversion_rate: number;
  revenue: number;
  net_revenue: number;
  avg_first_response_seconds: number | null; // 문의시각(inquiry_date, 없으면 created_at) → 첫 메시지 발송 평균 시간(초). 데이터 없으면 null
}

export interface StatsMonthly {
  month: string; // "2026-01"
  leads: number;
  contacted: number;
  paid: number;
  revenue: number;
  net_revenue: number;
}

export interface StatsWeekly {
  week: string; // "25년 05월 03주차"
  leads: number;
  contacted: number;
  paid: number;
  revenue: number;
  net_revenue: number;
}

export interface CrmStatsData {
  period: { from: string; to: string };
  overview: {
    total_leads: number;
    contacted: number;
    contacted_base: number; // 컨택 성공률 분모 (재시도 제외 초기 리드 수)
    contact_rate: number;
    paid: number;
    conversion_rate: number;
    total_revenue: number; // 순매출(결제 − 환불)
    total_net_revenue: number; // 부가세 제외 실수익
    gross_revenue: number; // 환불 전 총 결제(양수 합)
    total_refund: number; // 환불 합(음수)
    first_payment_revenue: number; // 최초결제 합(양수)
    repayment_revenue: number; // 재결제 합(양수)
  };
  by_source: StatsBySource[];
  monthly: StatsMonthly[];
  weekly: StatsWeekly[];
  stage_flow: StageFlowRow[];
}

function isContacted(student: {
  funnel_stage: string;
  stage_history?: { stage: string; label: string; entered_at: string }[] | null;
}): boolean {
  // 컨택 성공 = 이력상(또는 현재) 세일즈 콜 예약(2단계) 이상에 도달한 적이 있음.
  // 현재 단계가 아니라 도달 이력 기준 → 첫 메시지만 보내고 이탈한 리드는 제외,
  // 2단계 이상 갔다가 이탈한 리드는 포함.
  return hasReachedStage(student, '2');
}

function contactRate(contacted: number, leads: number): number {
  if (leads === 0) return 0;
  return Math.round((contacted / leads) * 10000) / 100;
}

function toMonthKey(dateStr: string): string {
  return dateStr.slice(0, 7); // "2026-05"
}

/**
 * 첫 응답 시간 계산의 기준 문의시각(ms).
 * inquiry_date는 naive(KST 벽시계)로 저장되므로 KST(+09:00) instant로 해석한다.
 * inquiry_date가 없으면 created_at(UTC timestamptz)로 폴백.
 */
function inquiryRefMs(inquiry_date: string | null, created_at: string): number | null {
  if (inquiry_date) {
    const [d, t = '00:00:00'] = inquiry_date.replace(' ', 'T').split('T');
    const [Y, Mo, D] = d.split('-').map(Number);
    const [H = 0, Mi = 0, Se = 0] = t.split(':').map(Number);
    if (!Y || !Mo || !D) return null;
    // KST 벽시계 → UTC instant (= UTC 동일 시각 − 9h)
    return Date.UTC(Y, Mo - 1, D, H, Mi, Se) - 9 * 3600 * 1000;
  }
  const t = new Date(created_at).getTime();
  return Number.isFinite(t) ? t : null;
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

  const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
  if (!DATE_RE.test(from) || !DATE_RE.test(to)) {
    return NextResponse.json(
      { error: { code: 'INVALID_DATE', message: '날짜 형식이 올바르지 않습니다. (YYYY-MM-DD)' } },
      { status: 400 }
    );
  }

  // 기간 내 신규 리드 = inquiry_date(실제 인입 시각)가 [from, to]에 든 리드만.
  // created_at(레코드 생성 시각) 폴백은 쓰지 않는다 — 레거시 대량 임포트(inquiry_date NULL)가
  // 생성 시각 기준으로 특정 기간 신규 리드로 둔갑해 과대집계되는 문제(예: 595건)를 막는다.
  const { data: students, error: sErr } = await supabaseAdmin
    .from('students')
    .select(
      'id, name, funnel_stage, funnel_stage_updated_at, stage_history, lead_status, traffic_source, inquiry_date, created_at, first_message_sent_at, retry_strategy_id'
    )
    .gte('inquiry_date', from)
    .lte('inquiry_date', `${to}T23:59:59`)
    .limit(MAX_LEAD_ROWS);

  if (sErr) {
    return NextResponse.json(
      { error: { code: 'FETCH_FAILED', message: sErr.message } },
      { status: 500 }
    );
  }

  // 무음 절단 방어: 반환 행수가 상한에 닿으면 집계가 잘렸을 수 있으니 경고(정상 기간 조회는 도달 불가).
  if ((students?.length ?? 0) >= MAX_LEAD_ROWS) {
    console.warn(`[stats] lead rows hit MAX_LEAD_ROWS(${MAX_LEAD_ROWS}) for ${from}~${to} — 집계가 절단됐을 수 있음`);
  }

  // 기간 내 payments 조회 (매출·환불 집계용, 기간=paid_at KST)
  const { data: payments, error: pErr } = await supabaseAdmin
    .from('payments')
    .select('student_id, student_name, amount, payment_type, paid_at, tax_type')
    .gte('paid_at', `${from}T00:00:00+09:00`)
    .lte('paid_at', `${to}T23:59:59.999+09:00`);

  const paymentList = pErr ? [] : (payments ?? []);

  // 학생 ID → payment 맵 (최초결제 기준)
  const paidStudentIds = new Set<string>();
  const paidStudentNames = new Set<string>();
  let totalRevenue = 0;
  let totalNetRevenue = 0;
  let grossRevenue = 0;
  let totalRefund = 0;
  let firstPaymentRevenue = 0;
  let repaymentRevenue = 0;

  for (const p of paymentList) {
    totalRevenue += p.amount;
    totalNetRevenue += netAmount(p);
    if (p.amount >= 0) grossRevenue += p.amount;
    else totalRefund += p.amount;
    if (p.amount >= 0) {
      if (p.payment_type === '최초결제') firstPaymentRevenue += p.amount;
      else if (p.payment_type === '재결제') repaymentRevenue += p.amount;
    }
  }

  // 결제 전환율(코호트 기준): 인입 리드가 '언제든' 최초결제했는지로 판단한다.
  // 기간(paid_at) 내 결제만 세면 인입 후 다음 달에 결제한 리드를 놓쳐 전환율이 과소집계된다.
  // ₩1 등 placeholder 결제(amount<=1)는 실결제가 아니므로 제외한다.
  const MAX_PAY_ROWS = 20000;
  const { data: firstPayRows, error: fpErr } = await supabaseAdmin
    .from('payments')
    .select('student_id, student_name')
    .eq('payment_type', '최초결제')
    .gt('amount', 1)
    .limit(MAX_PAY_ROWS);
  if (fpErr) console.error('[stats] firstPayRows fetch failed:', fpErr.message);
  if ((firstPayRows?.length ?? 0) >= MAX_PAY_ROWS)
    console.warn(`[stats] firstPayRows hit MAX_PAY_ROWS(${MAX_PAY_ROWS}) — paidStudentIds 절단됐을 수 있음`);
  for (const p of firstPayRows ?? []) {
    if (p.student_id) paidStudentIds.add(p.student_id);
    if (p.student_name) paidStudentNames.add(p.student_name);
  }

  const leadList = students ?? [];

  // 채널 매출용: 이 기간 인입(문의) 리드 코호트 id → 유입경로
  const leadIds = new Set(leadList.map((s) => s.id));
  const leadSourceById = new Map<string, string>(
    leadList.map((s) => [s.id, s.traffic_source ?? '미입력'])
  );

  // 학생이 결제했는지 판단
  function isPaid(s: { id: string; name: string }): boolean {
    return paidStudentIds.has(s.id) || paidStudentNames.has(s.name);
  }

  // ── Overview ──────────────────────────────────────────────────────────────
  const total = leadList.length;
  // 컨택 성공률: 최초 세일즈 리드(retry_strategy_id 없음)만 대상
  const initialLeads = leadList.filter(
    (s) => !(s as { retry_strategy_id?: string | null }).retry_strategy_id
  );
  const contactedCount = initialLeads.filter((s) => isContacted(s)).length;
  const paidCount = leadList.filter((s) => isPaid(s)).length;

  // ── By Source ─────────────────────────────────────────────────────────────
  const sourceMap = new Map<
    string,
    { leads: number; contacted: number; paid: number; revenue: number; net_revenue: number; respSum: number; respCount: number }
  >();

  for (const s of leadList) {
    const src = s.traffic_source ?? '미입력';
    if (!sourceMap.has(src))
      sourceMap.set(src, { leads: 0, contacted: 0, paid: 0, revenue: 0, net_revenue: 0, respSum: 0, respCount: 0 });
    const entry = sourceMap.get(src)!;
    entry.leads++;
    const isRetry = !!(s as { retry_strategy_id?: string | null }).retry_strategy_id;
    if (!isRetry && isContacted(s)) entry.contacted++;
    if (isPaid(s)) entry.paid++;
    // 첫 응답 시간: 첫 메시지 발송 시각이 있는 리드만, 문의시각(inquiry_date, 없으면 created_at) 대비 경과 초.
    const sentAt = (s as { first_message_sent_at?: string | null }).first_message_sent_at;
    if (sentAt) {
      const refMs = inquiryRefMs(s.inquiry_date, s.created_at);
      const sentMs = new Date(sentAt).getTime();
      if (refMs != null && Number.isFinite(sentMs)) {
        const delta = (sentMs - refMs) / 1000;
        if (delta >= 0) { entry.respSum += delta; entry.respCount++; }
      }
    }
  }

  // 채널별 매출 = 이 기간에 인입(문의)한 리드(코호트)가 낸 결제만 — 결제·전환율과 동일 기준.
  // (전 기간 인입 → 이번 기간 결제는 상단 총매출엔 잡히지만 채널표에는 제외 → 채널 합 ≠ 총매출)
  for (const p of paymentList) {
    if (!p.student_id || !leadIds.has(p.student_id)) continue;
    const src = leadSourceById.get(p.student_id) ?? '미입력';
    const entry = sourceMap.get(src);
    if (!entry) continue;
    entry.revenue += p.amount;
    entry.net_revenue += netAmount(p);
  }

  const by_source: StatsBySource[] = Array.from(sourceMap.entries())
    .map(([source, d]) => ({
      source,
      leads: d.leads,
      contacted: d.contacted,
      contact_rate: contactRate(d.contacted, d.leads),
      paid: d.paid,
      // 결제 전환율 = 컨택 성공 인원 중 결제 인원
      conversion_rate: d.contacted > 0 ? Math.round((d.paid / d.contacted) * 10000) / 100 : 0,
      revenue: d.revenue,
      net_revenue: d.net_revenue,
      avg_first_response_seconds: d.respCount > 0 ? Math.round(d.respSum / d.respCount) : null,
    }))
    .sort((a, b) => b.leads - a.leads);

  // ── Monthly ───────────────────────────────────────────────────────────────
  const monthMap = new Map<
    string,
    { leads: number; contacted: number; paid: number; revenue: number; net_revenue: number }
  >();

  for (const s of leadList) {
    const mo = toMonthKey(s.inquiry_date ?? s.created_at);
    if (!monthMap.has(mo))
      monthMap.set(mo, { leads: 0, contacted: 0, paid: 0, revenue: 0, net_revenue: 0 });
    const entry = monthMap.get(mo)!;
    entry.leads++;
    const isRetry = !!(s as { retry_strategy_id?: string | null }).retry_strategy_id;
    if (!isRetry && isContacted(s)) entry.contacted++;
    if (isPaid(s)) entry.paid++;
  }

  for (const p of paymentList) {
    const mo = toMonthKey(p.paid_at);
    if (!monthMap.has(mo))
      monthMap.set(mo, { leads: 0, contacted: 0, paid: 0, revenue: 0, net_revenue: 0 });
    const entry = monthMap.get(mo)!;
    entry.revenue += p.amount;
    entry.net_revenue += netAmount(p);
  }

  const monthly: StatsMonthly[] = Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, d]) => ({ month, ...d }));

  // ── Weekly ────────────────────────────────────────────────────────────────
  const weekMap = new Map<
    string,
    {
      leads: number;
      contacted: number;
      paid: number;
      revenue: number;
      net_revenue: number;
      start: string;
    }
  >();

  for (const s of leadList) {
    const dateStr = s.inquiry_date ?? s.created_at;
    const wk = getWeekLabel(dateStr);
    if (!wk) continue;
    if (!weekMap.has(wk))
      weekMap.set(wk, {
        leads: 0,
        contacted: 0,
        paid: 0,
        revenue: 0,
        net_revenue: 0,
        start: dateStr.slice(0, 10),
      });
    const entry = weekMap.get(wk)!;
    entry.leads++;
    const isRetry = !!(s as { retry_strategy_id?: string | null }).retry_strategy_id;
    if (!isRetry && isContacted(s)) entry.contacted++;
    if (isPaid(s)) entry.paid++;
  }

  for (const p of paymentList) {
    const wk = getWeekLabel(p.paid_at);
    if (!wk) continue;
    if (!weekMap.has(wk))
      weekMap.set(wk, {
        leads: 0,
        contacted: 0,
        paid: 0,
        revenue: 0,
        net_revenue: 0,
        start: p.paid_at.slice(0, 10),
      });
    const entry = weekMap.get(wk)!;
    entry.revenue += p.amount;
    entry.net_revenue += netAmount(p);
  }

  const weekly: StatsWeekly[] = Array.from(weekMap.entries())
    .sort(([, a], [, b]) => a.start.localeCompare(b.start))
    .map(([week, d]) => ({
      week,
      leads: d.leads,
      contacted: d.contacted,
      paid: d.paid,
      revenue: d.revenue,
      net_revenue: d.net_revenue,
    }));

  // ── Stage Flow (단계별 체류 기간 + 이동률) ──────────────────────────────────
  const stage_flow = computeStageFlow(
    leadList.map((s) => ({
      funnel_stage: s.funnel_stage,
      funnel_stage_updated_at:
        (s as { funnel_stage_updated_at?: string | null }).funnel_stage_updated_at ?? null,
      created_at: s.created_at,
      stage_history:
        (s as { stage_history?: { stage: string; label: string; entered_at: string }[] | null })
          .stage_history ?? [],
    }))
  );

  const data: CrmStatsData = {
    period: { from, to },
    overview: {
      total_leads: total,
      contacted: contactedCount,
      contacted_base: initialLeads.length,
      contact_rate: contactRate(contactedCount, initialLeads.length),
      paid: paidCount,
      // 결제 전환율 = 컨택 성공 인원 중 결제 인원 (신규 리드 전체 아님)
      conversion_rate:
        contactedCount > 0 ? Math.round((paidCount / contactedCount) * 10000) / 100 : 0,
      total_revenue: totalRevenue,
      total_net_revenue: totalNetRevenue,
      gross_revenue: grossRevenue,
      total_refund: totalRefund,
      first_payment_revenue: firstPaymentRevenue,
      repayment_revenue: repaymentRevenue,
    },
    by_source,
    monthly,
    weekly,
    stage_flow,
  };

  return NextResponse.json({ data });
}
