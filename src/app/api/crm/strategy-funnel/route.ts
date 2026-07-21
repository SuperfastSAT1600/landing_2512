import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAuthenticated } from '@/lib/server-auth';
import { type StageHistoryEntry } from '@/lib/funnel-stats';
import { MAX_LEAD_ROWS } from '@/lib/crm-stats-core';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const ALL_SOURCES = '__all__';

export type FunnelMilestoneKey = 'lead' | 'call' | 'diagnostic' | 'report' | 'paid';

export const FUNNEL_MILESTONES: { key: FunnelMilestoneKey; label: string }[] = [
  { key: 'lead', label: '리드 남김' },
  { key: 'call', label: '콜 완료' },
  { key: 'diagnostic', label: '진단 테스트 실시' },
  { key: 'report', label: '리포트 콜' },
  { key: 'paid', label: '결제' },
];

// 칸반 단계 → 5구간 매핑. 종료일 시점 '머문 단계'를 딱 한 구간에 집계.
// churned(이탈)·미매핑 단계는 제외(null). 8(수업중)은 결제로.
const STAGE_BUCKET: Record<string, FunnelMilestoneKey> = {
  '0': 'lead', '1': 'lead', '2': 'lead', '3a': 'lead', '3b': 'lead',
  '4': 'call', '5a': 'call',
  '5b': 'diagnostic', '6': 'diagnostic',
  '7': 'report',
  '8': 'paid',
};

export interface FunnelRow {
  key: string;   // milestone key(lead/call/…)
  label: string;
  count: number;
  rate: number;  // 구성비 = count / 전체 코호트 * 100 (소수 2자리)
}

export interface StrategyFunnelData {
  source: string;
  period: { from: string; to: string }; // 코호트 문의기간 [from,to] (KST)
  total: number; // 코호트 전체 인원 (구성비 분모)
  rows: FunnelRow[];
}

interface FunnelStudent {
  id: string;
  name: string;
  traffic_source: string | null;
  funnel_stage: string;
  stage_history: StageHistoryEntry[] | null;
  inquiry_date: string | null;
  created_at: string;
}

// 종료일 하루 끝(KST 23:59:59.999)의 절대시각(ms)
function endOfDayMs(dateStr: string): number {
  return new Date(`${dateStr}T23:59:59.999+09:00`).getTime();
}

/** 종료일(cutoff) 시점에 '머물러 있던' 단계.
 *  cutoff가 현재 이후면 현재 funnel_stage. 아니면 stage_history상 entered_at ≤ cutoff 중 가장 최근 단계. */
function stageAsOf(s: FunnelStudent, cutoffMs: number, includeCurrent: boolean): string {
  if (includeCurrent) return s.funnel_stage;
  let stage = '0'; // 종료일까지 이력이 없으면 인입(0)으로 간주
  let bestT = -Infinity;
  for (const e of s.stage_history ?? []) {
    if (!e.entered_at) continue;
    const t = new Date(e.entered_at).getTime();
    if (Number.isFinite(t) && t <= cutoffMs && t >= bestT) { bestT = t; stage = e.stage; }
  }
  return stage;
}

/**
 * GET /api/crm/strategy-funnel?source=<traffic_source|__all__>&from=YYYY-MM-DD&to=YYYY-MM-DD
 * 채널별 세일즈 퍼널 스냅샷 분포. 기간 내(KST) 인입한 리드가 '종료일 시점'에 파이프라인 어디에
 * 머물러 있는지를 5구간(리드 남김·콜 완료·진단·리포트 콜·결제)으로 집계. 각 리드는 딱 한 구간.
 */
export async function GET(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sp = request.nextUrl.searchParams;
  const source = sp.get('source') ?? ALL_SOURCES;
  const from = sp.get('from');
  const to = sp.get('to');
  if (!from || !to || !DATE_RE.test(from) || !DATE_RE.test(to)) {
    return NextResponse.json({ error: 'from/to는 YYYY-MM-DD 형식이어야 합니다.' }, { status: 400 });
  }

  let query = supabaseAdmin
    .from('students')
    .select('id,name,traffic_source,funnel_stage,stage_history,inquiry_date,created_at')
    .limit(MAX_LEAD_ROWS);
  if (source !== ALL_SOURCES) query = query.eq('traffic_source', source);

  const { data: students, error } = await query;
  if (error) {
    console.error('[strategy-funnel students]', error);
    return NextResponse.json({ error: '리드 데이터를 불러오지 못했습니다.' }, { status: 500 });
  }

  // 기간 코호트: inquiry_date(없으면 created_at)의 날짜가 [from,to]
  const inPeriod = (s: FunnelStudent) => {
    const d = (s.inquiry_date ?? s.created_at ?? '').slice(0, 10);
    return d >= from && d <= to;
  };
  const cohort = ((students ?? []) as FunnelStudent[]).filter(inPeriod);

  // 종료일 스냅샷 기준시각. to가 오늘 이후면 현재로 수렴.
  const cutoffMs = endOfDayMs(to);
  const includeCurrent = cutoffMs >= Date.now();

  // 결제자(최초결제 amount>1) — 코호트 학생, paid_at ≤ 종료일만 카운트(스냅샷)
  const ids = cohort.map((s) => s.id);
  const names = [...new Set(cohort.map((s) => s.name).filter(Boolean))];
  const paidIds = new Set<string>();
  const paidNames = new Set<string>();
  const chunk = <T,>(a: T[], n: number) => { const o: T[][] = []; for (let i = 0; i < a.length; i += n) o.push(a.slice(i, i + n)); return o; };
  const payQuery = (col: 'student_id' | 'student_name', vals: string[]) =>
    supabaseAdmin.from('payments').select('student_id,student_name,paid_at').eq('payment_type', '최초결제').gt('amount', 1).in(col, vals);
  const payResults = await Promise.all([
    ...chunk(ids, 150).map((c) => payQuery('student_id', c)),
    ...chunk(names, 150).map((c) => payQuery('student_name', c)),
  ]);
  for (const { data } of payResults) {
    for (const p of data ?? []) {
      const t = p.paid_at ? new Date(p.paid_at).getTime() : NaN;
      if (!Number.isFinite(t) || t > cutoffMs) continue; // 종료일 이후 결제는 제외(스냅샷)
      if (p.student_id) paidIds.add(p.student_id);
      if (p.student_name) paidNames.add(p.student_name);
    }
  }
  const isPaid = (s: FunnelStudent) => paidIds.has(s.id) || paidNames.has(s.name);

  // 각 리드를 딱 한 구간에 배정: 결제(종료일 이전) 있으면 결제, 아니면 종료일 시점 머문 단계로.
  const bucketOf = (s: FunnelStudent): FunnelMilestoneKey | null => {
    if (isPaid(s)) return 'paid';
    return STAGE_BUCKET[stageAsOf(s, cutoffMs, includeCurrent)] ?? null; // 이탈·미매핑 제외
  };

  const counts: Record<FunnelMilestoneKey, number> = { lead: 0, call: 0, diagnostic: 0, report: 0, paid: 0 };
  for (const s of cohort) {
    const b = bucketOf(s);
    if (b) counts[b] += 1;
  }

  const total = cohort.length;
  const rate = (n: number) => (total > 0 ? Math.round((n / total) * 10000) / 100 : 0);
  const rows: FunnelRow[] = FUNNEL_MILESTONES.map((m) => ({
    key: m.key, label: m.label, count: counts[m.key], rate: rate(counts[m.key]),
  }));

  const data: StrategyFunnelData = { source, period: { from, to }, total, rows };
  return NextResponse.json({ data });
}
