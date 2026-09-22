import type { PerStrategyRow } from '@/lib/strategy-stats';

/**
 * 전략 통계 좌측 목록에 띄울 행.
 *
 * 삭제된 전략(`exists:false` — retry_strategies 에 없고 strategy_history 에만 남은 것)은 뺀다.
 * 운영 화면에서 지금 쓸 수 있는 전략만 보이는 게 목적이고, 지운 전략이 계속 떠 있으면
 * 목록이 과거로 계속 길어진다.
 *
 * 집계 자체는 건드리지 않는다 — `rollup.assigned === Σ by_strategy.assigned` 불변식은
 * lib(strategy-stats.ts)이 지킨다. 여기는 표시만 고른다.
 */
export function visibleStrategyRows(rows: PerStrategyRow[]): PerStrategyRow[] {
  // 배정 많은 전략부터 — 배정 0 전략은 뒤로.
  return rows.filter((r) => r.exists).sort((a, b) => b.assigned - a.assigned);
}
