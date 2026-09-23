import { describe, it, expect } from 'vitest';
import { buildActivityFeed } from '../activity-feed';
import type { StrategyHistoryEntry } from '@/types/crm';

const ENTRY: StrategyHistoryEntry = {
  id: 'h1',
  strategy_id: 's-live',
  strategy_name: '옛날 이름(스냅샷)',
  memo: '',
  applied_at: '2026-08-01T00:00:00Z',
};

describe('buildActivityFeed — 전략 배정 항목 표시 이름', () => {
  it('strategyNames 맵에 있으면 라이브 이름을 우선 쓴다', () => {
    const feed = buildActivityFeed(
      { strategy_history: [ENTRY] } as never,
      [],
      new Map([['s-live', '새 이름(라이브)']])
    );
    expect(feed[0].detail).toBe('새 이름(라이브)');
  });

  it('strategyNames에 없으면(삭제된 전략) 스냅샷으로 폴백한다', () => {
    const feed = buildActivityFeed({ strategy_history: [ENTRY] } as never, [], new Map());
    expect(feed[0].detail).toBe('옛날 이름(스냅샷)');
  });

  it('strategyNames를 안 넘겨도 기존처럼 스냅샷을 쓴다(하위호환)', () => {
    const feed = buildActivityFeed({ strategy_history: [ENTRY] } as never, []);
    expect(feed[0].detail).toBe('옛날 이름(스냅샷)');
  });
});
