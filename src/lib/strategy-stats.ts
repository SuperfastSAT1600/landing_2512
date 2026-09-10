import { computeStageFlow, type StageFlowRow, type StageHistoryEntry } from '@/lib/funnel-stats';
import { netAmount } from '@/lib/payment-utils';
import { isContacted, contactRate } from '@/lib/crm-stats-core';
import { toKstDay, toMs } from '@/lib/kst-day';
import type { StrategyHistoryEntry, StrategyHistoryType } from '@/types/crm';

// 세일즈 로직(전략)별 통계 집계 — 순수 함수. I/O 없음(students/payments는 라우트에서 주입).
//
// 귀속 규칙: 타입 T + 기간 [from,to]에 대해, 각 리드의 strategy_history 중 type===T 엔트리에서
// applied_at 최신값을 선택하고, 그 applied_at이 기간 내인 리드만 코호트에 포함 →
// 리드당 정확히 1개 전략에 귀속(rollup.assigned === Σ by_strategy.assigned 불변식).
// retry 타입은 strategy_history(045)보다 앞선 retry_strategy_id(039) 배정이 있을 수 있어
// history 엔트리가 없으면 {strategy_id: retry_strategy_id, applied_at: retry_assigned_at}로 합성.
//
// 코호트 기준일 = applied_at (inquiry_date 아님): "로직 X를 적용한 시점" 기준이 인과적으로 맞음.
// 전환 = 최초결제(amount>1) anytime. 매출 = 코호트 결제 합.

export interface StrategyStatsStudent {
  id: string;
  name: string;
  funnel_stage: string;
  funnel_stage_updated_at: string | null;
  created_at: string;
  stage_history: StageHistoryEntry[] | null;
  strategy_history: StrategyHistoryEntry[] | null;
  retry_strategy_id?: string | null; // retry FK 폴백
  retry_assigned_at?: string | null;
}

export interface StrategyStatsPayment {
  student_id: string | null;
  student_name: string | null;
  amount: number;
  payment_type: string | null;
  tax_type: string | null;
  paid_at: string;
}

export interface PerStrategyRow {
  strategy_id: string;
  strategy_name: string;
  assigned: number; // 코호트 크기(기간 내 최신-엔트리 귀속)
  touched: number; // 기간 내 이 전략을 한 번이라도 적용받은 리드 수(귀속 무관)
  contacted: number;
  contact_rate: number; // contacted/assigned %
  paid: number;
  conversion_rate: number; // paid/contacted % (헤드라인)
  conversion_rate_of_assigned: number; // paid/assigned % (보조)
  revenue: number; // 결제 합(환불 반영, 음수 포함)
  net_revenue: number; // 부가세 제외 실수익
  avg_days_to_convert: number | null; // (첫 최초결제 - applied_at) 평균 일수
  stage_flow: StageFlowRow[];
}

export type StrategyRollup = Omit<PerStrategyRow, 'strategy_id' | 'strategy_name' | 'touched' | 'stage_flow'> & {
  stage_flow: StageFlowRow[];
};

export interface StrategyTypeStats {
  type: StrategyHistoryType;
  period: { from: string; to: string };
  rollup: StrategyRollup;
  by_strategy: PerStrategyRow[];
}

const MS_PER_DAY = 86_400_000;

interface Attribution {
  strategy_id: string;
  strategy_name: string;
  applied_at: string;
}

/** 타입 T에 대한 리드의 "적용 이력" 목록(합성 포함). */
function typeEntries(
  s: StrategyStatsStudent,
  type: StrategyHistoryType,
  strategyNames: Map<string, string>,
): Attribution[] {
  const list: Attribution[] = [];
  for (const e of s.strategy_history ?? []) {
    if (e.type === type && e.strategy_id && e.applied_at) {
      list.push({
        strategy_id: e.strategy_id,
        strategy_name: strategyNames.get(e.strategy_id) ?? e.strategy_name ?? '(삭제된 전략)',
        applied_at: e.applied_at,
      });
    }
  }
  // retry FK 폴백: history에 해당 전략 엔트리가 없고 retry_strategy_id가 있으면 합성
  if (type === 'retry' && s.retry_strategy_id) {
    const already = list.some((a) => a.strategy_id === s.retry_strategy_id);
    if (!already) {
      list.push({
        strategy_id: s.retry_strategy_id,
        strategy_name: strategyNames.get(s.retry_strategy_id) ?? '(삭제된 전략)',
        applied_at: s.retry_assigned_at ?? s.created_at,
      });
    }
  }
  return list;
}

/** 여러 적용 이력 중 최신(applied_at 최대) 선택. */
function latest(entries: Attribution[]): Attribution | null {
  let best: Attribution | null = null;
  let bestMs = -Infinity;
  for (const e of entries) {
    const ms = toMs(e.applied_at) ?? -Infinity;
    if (ms >= bestMs) { bestMs = ms; best = e; }
  }
  return best;
}

function makeInPeriod(period: { from: string; to: string }) {
  return (appliedAt: string) => {
    const day = toKstDay(appliedAt);
    return day !== null && day >= period.from && day <= period.to;
  };
}

/**
 * 타입 T + 기간 내에서 리드가 귀속되는 전략 id (최신-엔트리 기준). 귀속 없으면 null.
 * 엔진과 드릴다운 라우트가 동일 귀속 규칙을 공유하기 위한 export.
 */
export function assignedStrategyOf(
  s: StrategyStatsStudent,
  type: StrategyHistoryType,
  period: { from: string; to: string },
  strategyNames: Map<string, string>,
): string | null {
  const top = latest(typeEntries(s, type, strategyNames));
  if (!top) return null;
  return makeInPeriod(period)(top.applied_at) ? top.strategy_id : null;
}

export function computeStrategyStats(
  type: StrategyHistoryType,
  students: StrategyStatsStudent[],
  payments: StrategyStatsPayment[],
  period: { from: string; to: string },
  strategyNames: Map<string, string>,
): StrategyTypeStats {
  const inPeriod = makeInPeriod(period);

  // ── 최초결제 결제자 집합 (paid = anytime) ──
  // 0원(가결제)·₩1(구 placeholder)도 실전환으로 센다. 환불(음수)만 제외.
  const paidIds = new Set<string>();
  const paidNames = new Set<string>();
  // 학생별 첫 최초결제 시각(ms) — avg_days_to_convert용
  const firstPaidMsById = new Map<string, number>();
  const firstPaidMsByName = new Map<string, number>();
  for (const p of payments) {
    if (p.payment_type === '최초결제' && p.amount >= 0) {
      const ms = toMs(p.paid_at);
      if (p.student_id) {
        paidIds.add(p.student_id);
        if (ms !== null) firstPaidMsById.set(p.student_id, Math.min(firstPaidMsById.get(p.student_id) ?? Infinity, ms));
      }
      if (p.student_name) {
        paidNames.add(p.student_name);
        if (ms !== null) firstPaidMsByName.set(p.student_name, Math.min(firstPaidMsByName.get(p.student_name) ?? Infinity, ms));
      }
    }
  }
  const isPaid = (s: StrategyStatsStudent) => paidIds.has(s.id) || paidNames.has(s.name);
  const firstPaidMs = (s: StrategyStatsStudent): number | null => {
    const byId = firstPaidMsById.get(s.id);
    const byName = firstPaidMsByName.get(s.name);
    const vals = [byId, byName].filter((v): v is number => v !== undefined && Number.isFinite(v));
    return vals.length ? Math.min(...vals) : null;
  };

  // ── 귀속: 리드 → (전략, applied_at). 기간 내 최신-엔트리 기준. ──
  const cohortByStrategy = new Map<string, { students: StrategyStatsStudent[]; applied: Map<string, number> }>();
  const cohortStrategyOf = new Map<string, string>(); // studentId → strategy_id (매출 귀속용)
  const nameToStrategy = new Map<string, string>();
  const touchedByStrategy = new Map<string, Set<string>>();
  const names = new Map<string, string>(); // strategy_id → 표시명

  for (const s of students) {
    const entries = typeEntries(s, type, strategyNames);
    if (!entries.length) continue;

    // touched: 기간 내 적용된 모든 전략(귀속 무관)
    for (const e of entries) {
      if (!inPeriod(e.applied_at)) continue;
      if (!touchedByStrategy.has(e.strategy_id)) touchedByStrategy.set(e.strategy_id, new Set());
      touchedByStrategy.get(e.strategy_id)!.add(s.id);
      if (!names.has(e.strategy_id)) names.set(e.strategy_id, e.strategy_name);
    }

    // assigned: 최신 엔트리가 기간 내인 경우만
    const top = latest(entries);
    if (!top || !inPeriod(top.applied_at)) continue;

    if (!cohortByStrategy.has(top.strategy_id)) {
      cohortByStrategy.set(top.strategy_id, { students: [], applied: new Map() });
    }
    const c = cohortByStrategy.get(top.strategy_id)!;
    c.students.push(s);
    const appliedMs = toMs(top.applied_at);
    if (appliedMs !== null) c.applied.set(s.id, appliedMs);
    cohortStrategyOf.set(s.id, top.strategy_id);
    if (s.name) nameToStrategy.set(s.name, top.strategy_id);
    if (!names.has(top.strategy_id)) names.set(top.strategy_id, top.strategy_name);
  }

  // ── 매출을 전략별로 귀속 (payment → student → strategy) ──
  const revByStrategy = new Map<string, { revenue: number; net: number }>();
  for (const p of payments) {
    let sid: string | undefined;
    if (p.student_id && cohortStrategyOf.has(p.student_id)) sid = cohortStrategyOf.get(p.student_id);
    else if (p.student_name && nameToStrategy.has(p.student_name)) sid = nameToStrategy.get(p.student_name);
    if (!sid) continue;
    if (!revByStrategy.has(sid)) revByStrategy.set(sid, { revenue: 0, net: 0 });
    const r = revByStrategy.get(sid)!;
    r.revenue += p.amount;
    r.net += netAmount(p);
  }

  const round2 = (n: number) => Math.round(n * 100) / 100;

  function rowFor(strategyId: string): PerStrategyRow {
    const c = cohortByStrategy.get(strategyId);
    const cohort = c?.students ?? [];
    const assigned = cohort.length;
    const contacted = cohort.filter(isContacted).length;
    const paid = cohort.filter(isPaid).length;
    const rev = revByStrategy.get(strategyId) ?? { revenue: 0, net: 0 };

    // avg_days_to_convert
    const daysList: number[] = [];
    for (const s of cohort) {
      if (!isPaid(s)) continue;
      const paidMs = firstPaidMs(s);
      const appliedMs = c?.applied.get(s.id) ?? null;
      if (paidMs !== null && appliedMs !== null && paidMs >= appliedMs) {
        daysList.push((paidMs - appliedMs) / MS_PER_DAY);
      }
    }
    const avgDays = daysList.length ? round2(daysList.reduce((a, b) => a + b, 0) / daysList.length) : null;

    return {
      strategy_id: strategyId,
      strategy_name: names.get(strategyId) ?? strategyNames.get(strategyId) ?? '(삭제된 전략)',
      assigned,
      touched: touchedByStrategy.get(strategyId)?.size ?? 0,
      contacted,
      contact_rate: contactRate(contacted, assigned),
      paid,
      conversion_rate: contactRate(paid, contacted),
      conversion_rate_of_assigned: contactRate(paid, assigned),
      revenue: rev.revenue,
      net_revenue: rev.net,
      avg_days_to_convert: avgDays,
      stage_flow: computeStageFlow(cohort),
    };
  }

  // by_strategy: 코호트/터치된 전략 ∪ strategyNames(타입 T 전체, 0건 시드)
  const allIds = new Set<string>([
    ...cohortByStrategy.keys(),
    ...touchedByStrategy.keys(),
    ...strategyNames.keys(),
  ]);
  const by_strategy = [...allIds]
    .map(rowFor)
    .sort((a, b) => b.assigned - a.assigned || b.touched - a.touched || a.strategy_name.localeCompare(b.strategy_name));

  // ── rollup: 타입 T 전체 코호트(귀속된 모든 리드, 서로소) ──
  const allCohort: StrategyStatsStudent[] = [];
  const appliedAll = new Map<string, number>();
  for (const c of cohortByStrategy.values()) {
    allCohort.push(...c.students);
    for (const [sid, ms] of c.applied) appliedAll.set(sid, ms);
  }
  const rAssigned = allCohort.length;
  const rContacted = allCohort.filter(isContacted).length;
  const rPaid = allCohort.filter(isPaid).length;
  let rRevenue = 0, rNet = 0;
  for (const r of revByStrategy.values()) { rRevenue += r.revenue; rNet += r.net; }
  const rDays: number[] = [];
  for (const s of allCohort) {
    if (!isPaid(s)) continue;
    const paidMs = firstPaidMs(s);
    const appliedMs = appliedAll.get(s.id) ?? null;
    if (paidMs !== null && appliedMs !== null && paidMs >= appliedMs) rDays.push((paidMs - appliedMs) / MS_PER_DAY);
  }

  const rollup: StrategyRollup = {
    assigned: rAssigned,
    contacted: rContacted,
    contact_rate: contactRate(rContacted, rAssigned),
    paid: rPaid,
    conversion_rate: contactRate(rPaid, rContacted),
    conversion_rate_of_assigned: contactRate(rPaid, rAssigned),
    revenue: rRevenue,
    net_revenue: rNet,
    avg_days_to_convert: rDays.length ? round2(rDays.reduce((a, b) => a + b, 0) / rDays.length) : null,
    stage_flow: computeStageFlow(allCohort),
  };

  return { type, period, rollup, by_strategy };
}
