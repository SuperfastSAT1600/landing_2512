import type { StrategyHistoryEntry } from '@/types/crm';

// students.strategy_history(045) 엔트리 생성·추가 — 학생 패널(전략 히스토리)이
// 쓰는 shape을 여기 한 곳에 모은다.
// 전략 통계(strategy-stats.ts)가 이 shape의 strategy_id/applied_at 에 의존한다.

export interface StrategyHistoryInput {
  strategy_id: string;
  strategy_name: string;
  memo?: string;
  applied_at?: string; // 없으면 지금. 과거 적용 소급 기록 시 명시.
  manager_id?: string;
}

export function buildStrategyHistoryEntry(input: StrategyHistoryInput): StrategyHistoryEntry {
  return {
    id: crypto.randomUUID(),
    strategy_id: input.strategy_id,
    strategy_name: input.strategy_name,
    memo: (input.memo ?? '').trim(),
    applied_at: input.applied_at ?? new Date().toISOString(),
    ...(input.manager_id ? { manager_id: input.manager_id } : {}),
  };
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
