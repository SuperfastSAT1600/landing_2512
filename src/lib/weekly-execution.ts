import { hasReachedStage, type StageHistoryEntry } from '@/lib/funnel-stats';
import { toKstDay, toMs } from '@/lib/kst-day';
import type {
  StrategyHistoryEntry,
  StrategyHistoryType,
  WeeklyExecutionLead,
  WeeklyExecutionRow,
} from '@/types/crm';

// 주간 실행 집계 — 순수 함수. I/O 없음(students/payments는 라우트에서 주입).
//
// 귀속 규칙: applied_at(KST 날짜)이 해당 주 [start,end] 안인 strategy_history 엔트리 전부.
// strategy-stats.ts의 "타입별 최신 엔트리 1건"(assigned) 규칙과 의도적으로 다르다 —
// 그 규칙은 같은 리드가 다음 주에 같은 타입의 다른 전략을 받으면 지난주 기록에서 리드가
// 사라지므로, 주차 로그로는 쓸 수 없다. 여기서는 그 주에 실제로 한 일을 그대로 남긴다.
//
// retry 폴백: history 엔트리가 없고 retry_strategy_id만 있는 옛 배정(039)은
// {type:'retry', applied_at: retry_assigned_at ?? created_at}로 합성한다(strategy-stats와 동일).
//
// 결제·매출: 적용 리드의 최초결제(0원 포함, 환불 제외) anytime 기준 — 전환이 그 주 이후에
// 일어나도 회고 시점에 보이게 한다. stats·strategy-stats와 동일한 판정 규칙.

export interface WeeklyExecutionStudent {
  id: string;
  name: string;
  funnel_stage: string;
  stage_history: StageHistoryEntry[] | null;
  strategy_history: StrategyHistoryEntry[] | null;
  created_at: string;
  retry_strategy_id?: string | null;
  retry_assigned_at?: string | null;
}

export interface WeeklyExecutionPayment {
  student_id: string | null;
  student_name: string | null;
  amount: number;
  payment_type: string | null;
  paid_at: string;
}

export interface WeeklyFocusRef {
  strategy_id: string;
  strategy_name: string;
  type: StrategyHistoryType;
}

interface Applied {
  strategy_id: string;
  strategy_name: string;
  type: StrategyHistoryType;
  applied_at: string;
  memo: string;
}

/** 리드의 그 주 적용 이력(retry FK 합성 포함). 전략+리드 단위로 최신 1건만 남긴다. */
function appliedInWeek(
  s: WeeklyExecutionStudent,
  week: { start: string; end: string },
  strategyNames: Map<string, string>,
): Applied[] {
  const inWeek = (ts: string) => {
    const day = toKstDay(ts);
    return day !== null && day >= week.start && day <= week.end;
  };
  const displayName = (id: string, snapshot?: string) =>
    strategyNames.get(id) || snapshot || '(삭제된 전략)';

  const latest = new Map<string, Applied>();
  const keep = (a: Applied) => {
    const prev = latest.get(a.strategy_id);
    if (!prev || (toMs(a.applied_at) ?? 0) >= (toMs(prev.applied_at) ?? 0)) latest.set(a.strategy_id, a);
  };

  for (const e of s.strategy_history ?? []) {
    if (!e?.strategy_id || !e.applied_at || !inWeek(e.applied_at)) continue;
    keep({
      strategy_id: e.strategy_id,
      strategy_name: displayName(e.strategy_id, e.strategy_name),
      type: e.type,
      applied_at: e.applied_at,
      memo: e.memo ?? '',
    });
  }

  // retry FK 폴백 — history에 같은 전략 엔트리가 이미 있으면 건너뛴다.
  if (s.retry_strategy_id && !latest.has(s.retry_strategy_id)) {
    const appliedAt = s.retry_assigned_at ?? s.created_at;
    const hasHistoryEntry = (s.strategy_history ?? []).some((e) => e?.strategy_id === s.retry_strategy_id);
    if (!hasHistoryEntry && appliedAt && inWeek(appliedAt)) {
      keep({
        strategy_id: s.retry_strategy_id,
        strategy_name: displayName(s.retry_strategy_id),
        type: 'retry',
        applied_at: appliedAt,
        memo: '',
      });
    }
  }

  return [...latest.values()];
}

/** 최초결제(0원 포함, 음수 제외) 기준 리드별 결제 여부·매출 합. id ∪ name 매칭. */
function paidIndex(payments: WeeklyExecutionPayment[]) {
  const byId = new Map<string, number>();
  const byName = new Map<string, number>();
  for (const p of payments) {
    if (p.payment_type !== '최초결제' || p.amount < 0) continue;
    if (p.student_id) byId.set(p.student_id, (byId.get(p.student_id) ?? 0) + p.amount);
    else if (p.student_name) byName.set(p.student_name, (byName.get(p.student_name) ?? 0) + p.amount);
  }
  return (s: WeeklyExecutionStudent) => {
    const hit = byId.has(s.id) ? byId.get(s.id) : byName.get(s.name);
    return { paid: hit !== undefined, revenue: hit ?? 0 };
  };
}

export function computeWeeklyExecution(
  students: WeeklyExecutionStudent[],
  payments: WeeklyExecutionPayment[],
  week: { start: string; end: string },
  strategyNames: Map<string, string>,
  focus: WeeklyFocusRef[],
): WeeklyExecutionRow[] {
  const payOf = paidIndex(payments);
  const rows = new Map<string, WeeklyExecutionRow>();

  const rowFor = (strategy_id: string, strategy_name: string, type: StrategyHistoryType) => {
    const existing = rows.get(strategy_id);
    if (existing) return existing;
    const created: WeeklyExecutionRow = {
      strategy_id,
      strategy_name,
      type,
      planned: false,
      applied_count: 0,
      contacted_count: 0,
      paid_count: 0,
      revenue: 0,
      leads: [],
    };
    rows.set(strategy_id, created);
    return created;
  };

  // 계획된 전략은 적용 0건이어도 행을 남긴다(계획 이행 여부가 보이게).
  for (const f of focus) {
    if (!f?.strategy_id) continue;
    const row = rowFor(f.strategy_id, strategyNames.get(f.strategy_id) || f.strategy_name || '(삭제된 전략)', f.type);
    row.planned = true;
  }

  for (const s of students) {
    for (const a of appliedInWeek(s, week, strategyNames)) {
      const row = rowFor(a.strategy_id, a.strategy_name, a.type);
      const { paid, revenue } = payOf(s);
      const lead: WeeklyExecutionLead = {
        student_id: s.id,
        name: s.name,
        applied_at: a.applied_at,
        memo: a.memo,
        contacted: hasReachedStage(s, '2'),
        paid,
        revenue,
      };
      row.leads.push(lead);
      row.applied_count += 1;
      if (lead.contacted) row.contacted_count += 1;
      if (lead.paid) row.paid_count += 1;
      row.revenue += revenue;
    }
  }

  const plannedOrder = new Map(focus.map((f, i) => [f.strategy_id, i]));
  const list = [...rows.values()];
  for (const row of list) {
    row.leads.sort((a, b) => (toMs(b.applied_at) ?? 0) - (toMs(a.applied_at) ?? 0));
  }
  return list.sort((a, b) => {
    if (a.planned !== b.planned) return a.planned ? -1 : 1;
    if (a.planned && b.planned) {
      return (plannedOrder.get(a.strategy_id) ?? 0) - (plannedOrder.get(b.strategy_id) ?? 0);
    }
    if (b.applied_count !== a.applied_count) return b.applied_count - a.applied_count;
    return a.strategy_name.localeCompare(b.strategy_name);
  });
}
