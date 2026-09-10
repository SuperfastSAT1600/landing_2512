import { describe, it, expect } from 'vitest';
import {
  computeTrackProgress,
  trackStrategyRefs,
  unplannedRows,
} from '@/lib/weekly-track-progress';
import type {
  StrategyHistoryType,
  WeeklyExecutionLead,
  WeeklyExecutionRow,
  WeeklyTrack,
  WeeklyTrackItem,
  WeeklyTrackMetric,
} from '@/types/crm';

function lead(
  studentId: string,
  over: Partial<WeeklyExecutionLead> = {},
): WeeklyExecutionLead {
  return {
    student_id: studentId,
    name: studentId.toUpperCase(),
    applied_at: '2026-08-18T02:00:00Z',
    memo: '',
    contacted: false,
    paid: false,
    revenue: 0,
    ...over,
  };
}

function row(
  strategyId: string,
  leads: WeeklyExecutionLead[],
  over: Partial<WeeklyExecutionRow> = {},
): WeeklyExecutionRow {
  return {
    strategy_id: strategyId,
    strategy_name: `전략 ${strategyId}`,
    type: 'initial_sales',
    planned: true,
    applied_count: leads.length,
    contacted_count: leads.filter((l) => l.contacted).length,
    paid_count: leads.filter((l) => l.paid).length,
    revenue: leads.reduce((n, l) => n + l.revenue, 0),
    leads,
    ...over,
  };
}

function item(
  strategyId: string | null,
  over: Partial<WeeklyTrackItem> = {},
): WeeklyTrackItem {
  return {
    id: `i-${strategyId ?? 'plain'}`,
    text: strategyId ? `전략 ${strategyId} 실행` : '자료 수정',
    done: false,
    done_at: null,
    strategy_id: strategyId,
    strategy_name: strategyId ? `전략 ${strategyId}` : null,
    strategy_type: strategyId ? ('initial_sales' as StrategyHistoryType) : null,
    ...over,
  };
}

function track(
  items: WeeklyTrackItem[],
  metric: WeeklyTrackMetric | null = null,
  targetValue = 0,
): WeeklyTrack {
  return {
    id: 't-1',
    name: '신규리드',
    goal_text: '인스타리드 2건 결제',
    metric,
    target_value: targetValue,
    achieved: false,
    items,
    carried_from_week: null,
  };
}

describe('computeTrackProgress', () => {
  it('연결된 전략의 집계만 더한다', () => {
    const execution = [
      row('s-a', [lead('u1', { paid: true, revenue: 4_100_000 }), lead('u2')]),
      row('s-b', [lead('u9', { paid: true, revenue: 9_990_000 })]),
    ];

    const p = computeTrackProgress(track([item('s-a')]), execution);

    expect(p.applied).toBe(2);
    expect(p.paid).toBe(1);
    expect(p.revenue).toBe(4_100_000);
    expect(p.linkedStrategyIds).toEqual(['s-a']);
  });

  it('한 리드가 트랙 내 여러 전략을 받아도 적용 리드는 1로 센다', () => {
    const execution = [
      row('s-a', [lead('u1', { applied_at: '2026-08-18T02:00:00Z', paid: true, revenue: 3_000_000 })]),
      row('s-b', [lead('u1', { applied_at: '2026-08-20T02:00:00Z', paid: true, revenue: 3_000_000 })]),
    ];

    const p = computeTrackProgress(track([item('s-a'), item('s-b')]), execution);

    expect(p.applied).toBe(1);
    expect(p.paid).toBe(1);
    expect(p.revenue).toBe(3_000_000); // 리드 1명의 매출을 두 번 세지 않는다
    expect(p.leads).toHaveLength(1);
    expect(p.leads[0].applied_at).toBe('2026-08-20T02:00:00Z'); // 최신 적용 이력 유지
  });

  it('리드를 적용 시각 최신순으로 정렬한다', () => {
    const execution = [
      row('s-a', [
        lead('old', { applied_at: '2026-08-17T02:00:00Z' }),
        lead('new', { applied_at: '2026-08-21T02:00:00Z' }),
      ]),
    ];

    const p = computeTrackProgress(track([item('s-a')]), execution);

    expect(p.leads.map((l) => l.student_id)).toEqual(['new', 'old']);
  });

  it('지표별로 value와 달성률을 낸다', () => {
    const execution = [
      row('s-a', [
        lead('u1', { contacted: true, paid: true, revenue: 4_000_000 }),
        lead('u2', { contacted: true }),
      ]),
    ];
    const items = [item('s-a')];

    expect(computeTrackProgress(track(items, 'applied', 4), execution)).toMatchObject({ value: 2, pct: 50 });
    expect(computeTrackProgress(track(items, 'contacted', 2), execution)).toMatchObject({ value: 2, pct: 100 });
    expect(computeTrackProgress(track(items, 'paid', 2), execution)).toMatchObject({ value: 1, pct: 50 });
    expect(computeTrackProgress(track(items, 'revenue', 2_000_000), execution)).toMatchObject({
      value: 4_000_000,
      pct: 200,
    });
  });

  it('지표가 없거나 목표값이 0이면 달성률은 null이다', () => {
    const execution = [row('s-a', [lead('u1', { paid: true })])];

    expect(computeTrackProgress(track([item('s-a')], null, 0), execution).pct).toBeNull();
    expect(computeTrackProgress(track([item('s-a')], 'paid', 0), execution).pct).toBeNull();
  });

  it('전략이 연결되지 않은 트랙은 0으로 집계한다', () => {
    const execution = [row('s-a', [lead('u1', { paid: true, revenue: 1_000_000 })])];

    const p = computeTrackProgress(track([item(null)], 'paid', 2), execution);

    expect(p).toMatchObject({ applied: 0, contacted: 0, paid: 0, revenue: 0, value: 0, pct: 0 });
    expect(p.linkedStrategyIds).toEqual([]);
    expect(p.leads).toEqual([]);
  });

  it('같은 전략이 여러 항목에 연결돼도 한 번만 센다', () => {
    const execution = [row('s-a', [lead('u1'), lead('u2')])];

    const p = computeTrackProgress(
      track([item('s-a'), item('s-a', { id: 'i-dup' })]),
      execution,
    );

    expect(p.applied).toBe(2);
    expect(p.linkedStrategyIds).toEqual(['s-a']);
  });
});

describe('unplannedRows', () => {
  it('어느 트랙에도 연결되지 않은 실행만 남긴다', () => {
    const execution = [row('s-a', [lead('u1')]), row('s-b', [lead('u2')]), row('s-c', [lead('u3')])];
    const tracks = [track([item('s-a')]), { ...track([item('s-c')]), id: 't-2' }];

    expect(unplannedRows(tracks, execution).map((r) => r.strategy_id)).toEqual(['s-b']);
  });

  it('트랙이 없으면 모든 실행이 계획 외다', () => {
    const execution = [row('s-a', [lead('u1')])];
    expect(unplannedRows([], execution)).toHaveLength(1);
  });
});

describe('trackStrategyRefs', () => {
  it('연결된 전략을 중복 없이 스냅샷으로 낸다', () => {
    const tracks = [
      track([item('s-a'), item(null), item('s-a', { id: 'i-dup' })]),
      { ...track([item('s-b')]), id: 't-2' },
    ];

    expect(trackStrategyRefs(tracks)).toEqual([
      { strategy_id: 's-a', strategy_name: '전략 s-a', type: 'initial_sales' },
      { strategy_id: 's-b', strategy_name: '전략 s-b', type: 'initial_sales' },
    ]);
  });

  it('스냅샷 이름·타입이 비어 있어도 안전한 기본값을 쓴다', () => {
    const tracks = [
      track([item('s-a', { strategy_name: null, strategy_type: null })]),
    ];

    expect(trackStrategyRefs(tracks)).toEqual([
      { strategy_id: 's-a', strategy_name: '', type: 'initial_sales' },
    ]);
  });
});
