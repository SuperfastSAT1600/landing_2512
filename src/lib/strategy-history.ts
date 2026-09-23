import type { StrategyHistoryEntry, StrategyPhase } from '@/types/crm';

// students.strategy_history(045) 엔트리 생성·추가 — 학생 패널(전략 히스토리)이
// 쓰는 shape을 여기 한 곳에 모은다.
// 전략 통계(strategy-stats.ts)가 이 shape의 strategy_id/applied_at 에 의존한다.

export interface StrategyHistoryInput {
  strategy_id: string;
  strategy_name: string;
  memo?: string;
  applied_at?: string; // 없으면 지금. 과거 적용 소급 기록 시 명시.
  manager_id?: string;
  phase?: StrategyPhase; // 없으면 'applied'
}

/**
 * 엔트리의 진행 전/후 판정. `phase` 가 없는 기록은 이 필드가 생기기 전의 것이고
 * 전부 "실제로 쓴 전략"이므로 applied 로 읽는다. 판정은 항상 이 함수를 거친다 —
 * 곳곳에서 `e.phase === 'planned'` 같은 비교를 흩뿌리면 기본값이 어긋난다.
 */
export function effectivePhase(entry: Pick<StrategyHistoryEntry, 'phase'>): StrategyPhase {
  return entry.phase ?? 'applied';
}

export function buildStrategyHistoryEntry(input: StrategyHistoryInput): StrategyHistoryEntry {
  return {
    id: crypto.randomUUID(),
    strategy_id: input.strategy_id,
    strategy_name: input.strategy_name,
    memo: (input.memo ?? '').trim(),
    applied_at: input.applied_at ?? new Date().toISOString(),
    phase: input.phase ?? 'applied',
    ...(input.manager_id ? { manager_id: input.manager_id } : {}),
  };
}

/**
 * 카테고리 × 진행 전/후 = 슬롯 하나. 같은 슬롯에 이미 기록이 있으면 갈아끼운다.
 *
 * 전략의 카테고리는 엔트리에 스냅샷돼 있지 않고 `strategy_id` 로 그때그때 찾는다(146).
 * 그래서 호출부가 strategy_id → category_id 맵을 넘긴다. 맵에 없는 전략(삭제됐거나
 * 카테고리를 모르는 경우)은 어느 슬롯인지 특정할 수 없으므로 **아무것도 지우지 않고**
 * 덧붙이기만 한다 — 잘못 지우면 남의 기록이 조용히 사라진다.
 */
export function upsertPhaseEntry(
  history: StrategyHistoryEntry[] | null | undefined,
  entry: StrategyHistoryEntry,
  categoryOfStrategy: Map<string, string>,
): StrategyHistoryEntry[] {
  const list = history ?? [];
  const categoryId = categoryOfStrategy.get(entry.strategy_id);
  if (!categoryId) return [...list, entry];

  const phase = effectivePhase(entry);
  const kept = list.filter(
    (e) => !(categoryOfStrategy.get(e.strategy_id) === categoryId && effectivePhase(e) === phase),
  );
  return [...kept, entry];
}

export function appendStrategyHistoryEntry(
  history: StrategyHistoryEntry[] | null | undefined,
  entry: StrategyHistoryEntry,
): StrategyHistoryEntry[] {
  return [...(history ?? []), entry];
}

/**
 * 전략이 하나라도 적용됐는지 — 세일즈 칸반 이동·메모 차단 기준.
 * 예전에는 엔트리의 kind 로 재시도를 걸러냈지만 kind 는 더 이상 없다. 재시도 트랙 구분은
 * `retry_strategy_id`(= isActiveInitialSalesLead)가 이미 하므로 여기서는 적용 여부만 본다.
 */
export function hasAnyStrategy(student: { strategy_history: StrategyHistoryEntry[] | null | undefined }): boolean {
  return (student.strategy_history ?? []).length > 0;
}

/** 현재 활성 최초 세일즈 트랙 리드인지 — 재시도 트랙(retry_strategy_id 있음)은 제외. */
export function isActiveInitialSalesLead(student: { lead_status: string; retry_strategy_id: string | null }): boolean {
  return student.lead_status === 'active' && !student.retry_strategy_id;
}
