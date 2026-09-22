/// <reference types="vitest/globals" />
import { visibleStrategyRows } from '../strategy-stats/visibleRows';
import type { PerStrategyRow } from '@/lib/strategy-stats';

const row = (over: Partial<PerStrategyRow> & { strategy_id: string }): PerStrategyRow => ({
  strategy_name: over.strategy_id,
  assigned: 0,
  touched: 0,
  contacted: 0,
  contact_rate: 0,
  paid: 0,
  conversion_rate: 0,
  conversion_rate_of_assigned: 0,
  revenue: 0,
  net_revenue: 0,
  avg_days_to_convert: null,
  stage_flow: [],
  exists: true,
  ...over,
});

describe('visibleStrategyRows', () => {
  it('삭제된 전략(exists:false)은 목록에서 제외한다', () => {
    const out = visibleStrategyRows([
      row({ strategy_id: 'live', assigned: 10 }),
      row({ strategy_id: 'gone', assigned: 24, exists: false }),
    ]);
    expect(out.map((r) => r.strategy_id)).toEqual(['live']);
  });

  it('배정이 많은 전략부터 정렬한다', () => {
    const out = visibleStrategyRows([
      row({ strategy_id: 'a', assigned: 3 }),
      row({ strategy_id: 'b', assigned: 165 }),
      row({ strategy_id: 'c', assigned: 20 }),
    ]);
    expect(out.map((r) => r.strategy_id)).toEqual(['b', 'c', 'a']);
  });

  it('배정 0건이어도 실재하는 전략은 남긴다 — 아직 안 쓴 전략이지 지워진 게 아니다', () => {
    const out = visibleStrategyRows([row({ strategy_id: 'seed', assigned: 0 })]);
    expect(out).toHaveLength(1);
  });

  it('원본 배열을 변형하지 않는다', () => {
    const input = [row({ strategy_id: 'a', assigned: 1 }), row({ strategy_id: 'b', assigned: 9 })];
    visibleStrategyRows(input);
    expect(input.map((r) => r.strategy_id)).toEqual(['a', 'b']);
  });

  it('전부 삭제됐으면 빈 배열', () => {
    expect(visibleStrategyRows([row({ strategy_id: 'x', exists: false })])).toEqual([]);
  });
});
