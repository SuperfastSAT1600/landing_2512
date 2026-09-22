import type { StrategyHistoryEntry, StrategyHistoryType } from '@/types/crm';

// students.strategy_history(045) 엔트리 생성·추가 — 학생 패널(전략 히스토리)과
// 주차 계획·이행의 '전략 적용 기록'이 정확히 같은 shape을 쓰도록 여기 한 곳에 모은다.
// 주간 실행 집계(weekly-execution.ts)와 전략 통계(strategy-stats.ts)가 이 shape의
// type/strategy_id/applied_at 에 의존한다.

export interface StrategyHistoryInput {
  type: StrategyHistoryType;
  strategy_id: string;
  strategy_name: string;
  memo?: string;
  applied_at?: string; // 없으면 지금. 과거 적용 소급 기록 시 명시.
  manager_id?: string;
}

export function buildStrategyHistoryEntry(input: StrategyHistoryInput): StrategyHistoryEntry {
  return {
    id: crypto.randomUUID(),
    type: input.type,
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

/** 최초 세일즈 전략이 하나라도 적용됐는지 — 세일즈 칸반 이동·메모 차단 기준(146 연장). */
export function hasInitialSalesStrategy(student: { strategy_history: StrategyHistoryEntry[] | null | undefined }): boolean {
  return (student.strategy_history ?? []).some((e) => e.type === 'initial_sales');
}

/** 현재 활성 최초 세일즈 트랙 리드인지 — 재시도 트랙(retry_strategy_id 있음)은 제외. */
export function isActiveInitialSalesLead(student: { lead_status: string; retry_strategy_id: string | null }): boolean {
  return student.lead_status === 'active' && !student.retry_strategy_id;
}
