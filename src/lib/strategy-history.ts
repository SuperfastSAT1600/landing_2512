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
