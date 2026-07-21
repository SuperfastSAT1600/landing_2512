import { describe, it, expect } from 'vitest';
import {
  computeStrategyStats,
  assignedStrategyOf,
  type StrategyStatsStudent,
  type StrategyStatsPayment,
} from '@/lib/strategy-stats';
import type { StrategyHistoryEntry } from '@/types/crm';

const PERIOD = { from: '2026-07-01', to: '2026-07-31' };
const NAMES = new Map<string, string>([
  ['s1', '개인화 메시지'],
  ['s2', '대표 코치 수업권 세일즈'],
  ['r1', '자발적 연락'],
]);

const entry = (over: Partial<StrategyHistoryEntry> & { strategy_id: string; type: StrategyHistoryEntry['type']; applied_at: string }): StrategyHistoryEntry => ({
  id: 'e-' + Math.round((over.applied_at.length + over.strategy_id.length)), // 결정적
  strategy_name: NAMES.get(over.strategy_id) ?? 'x',
  memo: '',
  ...over,
});

const student = (over: Partial<StrategyStatsStudent> & { id: string }): StrategyStatsStudent => ({
  name: over.id,
  funnel_stage: '1',
  funnel_stage_updated_at: null,
  created_at: '2026-07-01T00:00:00Z',
  stage_history: null,
  strategy_history: null,
  retry_strategy_id: null,
  retry_assigned_at: null,
  ...over,
});

// 2단계+ 도달(컨택 성공)
const reached2 = (over: Partial<StrategyStatsStudent> & { id: string }) =>
  student({ funnel_stage: '4', stage_history: [{ stage: '2', label: '', entered_at: '2026-07-05T00:00:00Z' }], ...over });

const firstPay = (student_id: string, name: string, amount = 1_400_000, paid_at = '2026-07-20T00:00:00+09:00'): StrategyStatsPayment =>
  ({ student_id, student_name: name, amount, payment_type: '최초결제', tax_type: '면세', paid_at });

describe('computeStrategyStats — 귀속 규칙', () => {
  it('동일 타입 2개 엔트리 → 1회 카운트(최신 applied_at 귀속)', () => {
    const s = student({
      id: 'a',
      strategy_history: [
        entry({ strategy_id: 's1', type: 'initial_sales', applied_at: '2026-07-05T00:00:00Z' }),
        entry({ strategy_id: 's2', type: 'initial_sales', applied_at: '2026-07-10T00:00:00Z' }),
      ],
    });
    const r = computeStrategyStats('initial_sales', [s], [], PERIOD, NAMES);
    expect(r.rollup.assigned).toBe(1);
    const s2row = r.by_strategy.find((x) => x.strategy_id === 's2');
    const s1row = r.by_strategy.find((x) => x.strategy_id === 's1');
    expect(s2row?.assigned).toBe(1); // 최신 = s2
    expect(s1row?.assigned).toBe(0);
    expect(s1row?.touched).toBe(1); // s1도 기간 내 touched
  });

  it('불변식: rollup.assigned === Σ by_strategy.assigned', () => {
    const students = [
      student({ id: 'a', strategy_history: [entry({ strategy_id: 's1', type: 'initial_sales', applied_at: '2026-07-05T00:00:00Z' })] }),
      student({ id: 'b', strategy_history: [entry({ strategy_id: 's2', type: 'initial_sales', applied_at: '2026-07-06T00:00:00Z' })] }),
      student({ id: 'c', strategy_history: [entry({ strategy_id: 's2', type: 'initial_sales', applied_at: '2026-07-07T00:00:00Z' })] }),
    ];
    const r = computeStrategyStats('initial_sales', students, [], PERIOD, NAMES);
    const sum = r.by_strategy.reduce((a, x) => a + x.assigned, 0);
    expect(sum).toBe(r.rollup.assigned);
    expect(r.rollup.assigned).toBe(3);
  });

  it('기간 경계 밖 applied_at은 제외', () => {
    const before = student({ id: 'a', strategy_history: [entry({ strategy_id: 's1', type: 'initial_sales', applied_at: '2026-06-25T00:00:00Z' })] });
    const after = student({ id: 'b', strategy_history: [entry({ strategy_id: 's1', type: 'initial_sales', applied_at: '2026-08-02T00:00:00Z' })] });
    const r = computeStrategyStats('initial_sales', [before, after], [], PERIOD, NAMES);
    expect(r.rollup.assigned).toBe(0);
  });

  it('KST 경계: UTC 6/30 23:00Z(=KST 7/1)는 7월 기간에 포함', () => {
    const s = student({ id: 'a', strategy_history: [entry({ strategy_id: 's1', type: 'initial_sales', applied_at: '2026-06-30T23:00:00Z' })] });
    const r = computeStrategyStats('initial_sales', [s], [], PERIOD, NAMES);
    expect(r.rollup.assigned).toBe(1);
  });

  it('retry FK 폴백: history 없이 retry_strategy_id만 있어도 코호트 포함 + 이름 해석', () => {
    const s = student({ id: 'a', retry_strategy_id: 'r1', retry_assigned_at: '2026-07-15T00:00:00Z' });
    const r = computeStrategyStats('retry', [s], [], PERIOD, NAMES);
    expect(r.rollup.assigned).toBe(1);
    const row = r.by_strategy.find((x) => x.strategy_id === 'r1');
    expect(row?.assigned).toBe(1);
    expect(row?.strategy_name).toBe('자발적 연락');
  });

  it('naive applied_at(벽시계)도 기간 내로 인식', () => {
    const s = student({ id: 'a', strategy_history: [entry({ strategy_id: 's1', type: 'initial_contact', applied_at: '2026-07-06T00:13:00' })] });
    const r = computeStrategyStats('initial_contact', [s], [], PERIOD, new Map([['s1', '개인화 메시지']]));
    expect(r.rollup.assigned).toBe(1);
  });
});

describe('computeStrategyStats — 지표', () => {
  it('contact/conversion rate 및 매출 귀속', () => {
    const students = [
      reached2({ id: 'a', name: 'A', strategy_history: [entry({ strategy_id: 's2', type: 'initial_sales', applied_at: '2026-07-05T00:00:00Z' })] }),
      reached2({ id: 'b', name: 'B', strategy_history: [entry({ strategy_id: 's2', type: 'initial_sales', applied_at: '2026-07-06T00:00:00Z' })] }),
      student({ id: 'c', name: 'C', strategy_history: [entry({ strategy_id: 's2', type: 'initial_sales', applied_at: '2026-07-07T00:00:00Z' })] }), // 미컨택
    ];
    const payments = [firstPay('a', 'A', 1_400_000)]; // A만 결제
    const r = computeStrategyStats('initial_sales', students, payments, PERIOD, NAMES);
    const row = r.by_strategy.find((x) => x.strategy_id === 's2')!;
    expect(row.assigned).toBe(3);
    expect(row.contacted).toBe(2);
    expect(row.paid).toBe(1);
    expect(row.contact_rate).toBeCloseTo(66.67, 1);
    expect(row.conversion_rate).toBe(50); // paid/contacted = 1/2
    expect(row.conversion_rate_of_assigned).toBeCloseTo(33.33, 1);
    expect(row.revenue).toBe(1_400_000);
    expect(row.net_revenue).toBe(1_400_000); // 면세
    expect(row.avg_days_to_convert).not.toBeNull();
  });

  it('rate ∈ [0,100], 무전환 시 avg_days null', () => {
    const s = student({ id: 'a', strategy_history: [entry({ strategy_id: 's1', type: 'initial_contact', applied_at: '2026-07-05T00:00:00Z' })] });
    const r = computeStrategyStats('initial_contact', [s], [], PERIOD, new Map([['s1', '개인화 메시지']]));
    const row = r.by_strategy.find((x) => x.strategy_id === 's1')!;
    expect(row.contact_rate).toBeGreaterThanOrEqual(0);
    expect(row.contact_rate).toBeLessThanOrEqual(100);
    expect(row.paid).toBe(0);
    expect(row.avg_days_to_convert).toBeNull();
  });

  it('0건 전략도 strategyNames 시드로 by_strategy에 포함', () => {
    const r = computeStrategyStats('initial_sales', [], [], PERIOD, NAMES);
    expect(r.by_strategy.some((x) => x.strategy_id === 's1' && x.assigned === 0)).toBe(true);
  });
});

describe('assignedStrategyOf', () => {
  it('최신 엔트리 전략을 반환, 기간 밖이면 null', () => {
    const s = student({
      id: 'a',
      strategy_history: [
        entry({ strategy_id: 's1', type: 'initial_sales', applied_at: '2026-07-05T00:00:00Z' }),
        entry({ strategy_id: 's2', type: 'initial_sales', applied_at: '2026-07-10T00:00:00Z' }),
      ],
    });
    expect(assignedStrategyOf(s, 'initial_sales', PERIOD, NAMES)).toBe('s2');
    expect(assignedStrategyOf(s, 'initial_sales', { from: '2026-08-01', to: '2026-08-31' }, NAMES)).toBeNull();
    expect(assignedStrategyOf(s, 'retry', PERIOD, NAMES)).toBeNull();
  });
});
