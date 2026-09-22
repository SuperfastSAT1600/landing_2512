import type { StrategyHistoryType } from '@/types/crm';

/**
 * "+ 새 전략" 생성 폼의 용도(kind) 기본값 — 그 카테고리에 이미 있는 전략들의
 * 다수결 kind를 쓴다(매번 직접 고르는 클릭을 줄인다). 카테고리와 kind는
 * 여전히 독립적이라 라디오는 그대로 남고 필요하면 바꿀 수 있다(146).
 * 카테고리가 비어 있으면 가장 흔한 kind인 '최초 세일즈용'을 기본값으로 쓴다.
 */
export function resolveDefaultKind(strategies: { kind: StrategyHistoryType }[]): StrategyHistoryType {
  if (strategies.length === 0) return 'initial_sales';

  const counts: Record<StrategyHistoryType, number> = { initial_contact: 0, initial_sales: 0, retry: 0 };
  for (const s of strategies) counts[s.kind]++;

  return (Object.keys(counts) as StrategyHistoryType[]).reduce((best, kind) =>
    counts[kind] > counts[best] ? kind : best
  );
}
