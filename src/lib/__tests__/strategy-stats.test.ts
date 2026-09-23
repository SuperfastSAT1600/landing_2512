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

const entry = (over: Partial<StrategyHistoryEntry> & { strategy_id: string; applied_at: string }): StrategyHistoryEntry => ({
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
        entry({ strategy_id: 's1', applied_at: '2026-07-05T00:00:00Z' }),
        entry({ strategy_id: 's2', applied_at: '2026-07-10T00:00:00Z' }),
      ],
    });
    const r = computeStrategyStats([s], [], PERIOD, NAMES);
    expect(r.rollup.assigned).toBe(1);
    const s2row = r.by_strategy.find((x) => x.strategy_id === 's2');
    const s1row = r.by_strategy.find((x) => x.strategy_id === 's1');
    expect(s2row?.assigned).toBe(1); // 최신 = s2
    expect(s1row?.assigned).toBe(0);
    expect(s1row?.touched).toBe(1); // s1도 기간 내 touched
  });

  it('불변식: rollup.assigned === Σ by_strategy.assigned', () => {
    const students = [
      student({ id: 'a', strategy_history: [entry({ strategy_id: 's1', applied_at: '2026-07-05T00:00:00Z' })] }),
      student({ id: 'b', strategy_history: [entry({ strategy_id: 's2', applied_at: '2026-07-06T00:00:00Z' })] }),
      student({ id: 'c', strategy_history: [entry({ strategy_id: 's2', applied_at: '2026-07-07T00:00:00Z' })] }),
    ];
    const r = computeStrategyStats(students, [], PERIOD, NAMES);
    const sum = r.by_strategy.reduce((a, x) => a + x.assigned, 0);
    expect(sum).toBe(r.rollup.assigned);
    expect(r.rollup.assigned).toBe(3);
  });

  it('기간 경계 밖 applied_at은 제외', () => {
    const before = student({ id: 'a', strategy_history: [entry({ strategy_id: 's1', applied_at: '2026-06-25T00:00:00Z' })] });
    const after = student({ id: 'b', strategy_history: [entry({ strategy_id: 's1', applied_at: '2026-08-02T00:00:00Z' })] });
    const r = computeStrategyStats([before, after], [], PERIOD, NAMES);
    expect(r.rollup.assigned).toBe(0);
  });

  it('KST 경계: UTC 6/30 23:00Z(=KST 7/1)는 7월 기간에 포함', () => {
    const s = student({ id: 'a', strategy_history: [entry({ strategy_id: 's1', applied_at: '2026-06-30T23:00:00Z' })] });
    const r = computeStrategyStats([s], [], PERIOD, NAMES);
    expect(r.rollup.assigned).toBe(1);
  });

  it('retry FK 폴백: history 없이 retry_strategy_id만 있어도 코호트 포함 + 이름 해석', () => {
    const s = student({ id: 'a', retry_strategy_id: 'r1', retry_assigned_at: '2026-07-15T00:00:00Z' });
    const r = computeStrategyStats([s], [], PERIOD, NAMES);
    expect(r.rollup.assigned).toBe(1);
    const row = r.by_strategy.find((x) => x.strategy_id === 'r1');
    expect(row?.assigned).toBe(1);
    expect(row?.strategy_name).toBe('자발적 연락');
  });

  it('naive applied_at(벽시계)도 기간 내로 인식', () => {
    const s = student({ id: 'a', strategy_history: [entry({ strategy_id: 's1', applied_at: '2026-07-06T00:13:00' })] });
    const r = computeStrategyStats([s], [], PERIOD, new Map([['s1', '개인화 메시지']]));
    expect(r.rollup.assigned).toBe(1);
  });
});

describe('computeStrategyStats — 지표', () => {
  it('contact/conversion rate 및 매출 귀속', () => {
    const students = [
      reached2({ id: 'a', name: 'A', strategy_history: [entry({ strategy_id: 's2', applied_at: '2026-07-05T00:00:00Z' })] }),
      reached2({ id: 'b', name: 'B', strategy_history: [entry({ strategy_id: 's2', applied_at: '2026-07-06T00:00:00Z' })] }),
      student({ id: 'c', name: 'C', strategy_history: [entry({ strategy_id: 's2', applied_at: '2026-07-07T00:00:00Z' })] }), // 미컨택
    ];
    const payments = [firstPay('a', 'A', 1_400_000)]; // A만 결제
    const r = computeStrategyStats(students, payments, PERIOD, NAMES);
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
    const s = student({ id: 'a', strategy_history: [entry({ strategy_id: 's1', applied_at: '2026-07-05T00:00:00Z' })] });
    const r = computeStrategyStats([s], [], PERIOD, new Map([['s1', '개인화 메시지']]));
    const row = r.by_strategy.find((x) => x.strategy_id === 's1')!;
    expect(row.contact_rate).toBeGreaterThanOrEqual(0);
    expect(row.contact_rate).toBeLessThanOrEqual(100);
    expect(row.paid).toBe(0);
    expect(row.avg_days_to_convert).toBeNull();
  });

  it('0원 가결제도 전환(paid)으로 집계 — 매출만 0', () => {
    const students = [
      reached2({ id: 'a', name: 'A', strategy_history: [entry({ strategy_id: 's2', applied_at: '2026-07-05T00:00:00Z' })] }),
    ];
    const r = computeStrategyStats(students, [firstPay('a', 'A', 0)], PERIOD, NAMES);
    const row = r.by_strategy.find((x) => x.strategy_id === 's2')!;
    expect(row.paid).toBe(1);
    expect(row.revenue).toBe(0);
  });

  it('환불(음수)만 전환에서 제외', () => {
    const students = [
      reached2({ id: 'a', name: 'A', strategy_history: [entry({ strategy_id: 's2', applied_at: '2026-07-05T00:00:00Z' })] }),
    ];
    const refundOnly = [{ ...firstPay('a', 'A', -500_000), payment_type: '환불' }];
    const r = computeStrategyStats(students, refundOnly, PERIOD, NAMES);
    expect(r.by_strategy.find((x) => x.strategy_id === 's2')!.paid).toBe(0);
  });

  it('0건 전략도 strategyNames 시드로 by_strategy에 포함', () => {
    const r = computeStrategyStats([], [], PERIOD, NAMES);
    expect(r.by_strategy.some((x) => x.strategy_id === 's1' && x.assigned === 0)).toBe(true);
  });
});

describe('assignedStrategyOf', () => {
  it('최신 엔트리 전략을 반환, 기간 밖이면 null', () => {
    const s = student({
      id: 'a',
      strategy_history: [
        entry({ strategy_id: 's1', applied_at: '2026-07-05T00:00:00Z' }),
        entry({ strategy_id: 's2', applied_at: '2026-07-10T00:00:00Z' }),
      ],
    });
    expect(assignedStrategyOf(s, PERIOD, NAMES)).toBe('s2');
    expect(assignedStrategyOf(s, { from: '2026-08-01', to: '2026-08-31' }, NAMES)).toBeNull();
    // 범위 밖(맵에 없는 전략만 가진) 축에서는 귀속되지 않는다
    expect(assignedStrategyOf(s, PERIOD, new Map([['r1', '자발적 연락']]))).toBeNull();
  });
});

describe('computeStrategyStats — 집계 범위는 전략 id 맵이 정한다 (REQ-001)', () => {
  it('맵에 없는 전략 엔트리는 같은 kind여도 집계에서 빠진다 — 카테고리 축을 쓰기 위한 전제', () => {
    const s = reached2({
      id: 'a',
      strategy_history: [
        entry({ strategy_id: 's1', applied_at: '2026-07-10T00:00:00Z' }),
        entry({ strategy_id: 's2', applied_at: '2026-07-11T00:00:00Z' }),
      ],
    });
    const onlyS1 = new Map([['s1', '개인화 메시지']]);
    const out = computeStrategyStats([s], [], PERIOD, onlyS1);
    expect(out.by_strategy.map((r) => r.strategy_id)).toEqual(['s1']);
  });

  it('삭제된 전략(맵에 없음) 엔트리는 집계되지 않는다', () => {
    const s = reached2({
      id: 'a',
      strategy_history: [
        { id: 'e9', strategy_id: 'gone', strategy_name: '옛 전략', applied_at: '2026-07-10T00:00:00Z', memo: '' },
      ],
    });
    const out = computeStrategyStats([s], [], PERIOD, NAMES);
    expect(out.by_strategy.find((r) => r.strategy_id === 'gone')).toBeUndefined();
  });

  it('kind가 달라도 맵에 있으면 집계한다 — 카테고리엔 kind가 섞여 있다', () => {
    const s = reached2({
      id: 'a',
      strategy_history: [
        entry({ strategy_id: 's1', applied_at: '2026-07-10T00:00:00Z' }),
      ],
    });
    const out = computeStrategyStats([s], [], PERIOD, new Map([['s1', '개인화 메시지']]));
    expect(out.by_strategy.find((r) => r.strategy_id === 's1')?.assigned).toBe(1);
  });
});

describe('computeStrategyStats — 진행 전/후 귀속 (계획이 성과를 가로채지 않는다)', () => {
  const planned = (strategy_id: string, applied_at: string) =>
    entry({ strategy_id, applied_at, phase: 'planned' as const });
  const applied = (strategy_id: string, applied_at: string) =>
    entry({ strategy_id, applied_at, phase: 'applied' as const });

  it('계획이 실제보다 늦게 기록돼도 실제 전략에 귀속된다', () => {
    const s = reached2({
      id: 'a',
      strategy_history: [
        applied('s1', '2026-07-10T00:00:00Z'),
        planned('s2', '2026-07-20T00:00:00Z'), // 더 최신이지만 계획일 뿐
      ],
    });
    const out = computeStrategyStats([s], [firstPay('a', 'a')], PERIOD, NAMES);
    expect(out.by_strategy.find((r) => r.strategy_id === 's1')?.assigned).toBe(1);
    expect(out.by_strategy.find((r) => r.strategy_id === 's2')?.assigned).toBe(0);
    expect(out.by_strategy.find((r) => r.strategy_id === 's1')?.paid).toBe(1);
  });

  it('실제 기록이 없으면 계획으로 폴백한다 — 리드가 집계에서 사라지지 않는다', () => {
    const s = reached2({ id: 'a', strategy_history: [planned('s2', '2026-07-10T00:00:00Z')] });
    const out = computeStrategyStats([s], [], PERIOD, NAMES);
    expect(out.by_strategy.find((r) => r.strategy_id === 's2')?.assigned).toBe(1);
  });

  it('phase 없는 기존 기록은 실제로 간주된다', () => {
    const s = reached2({
      id: 'a',
      strategy_history: [
        entry({ strategy_id: 's1', applied_at: '2026-07-10T00:00:00Z' }),
        planned('s2', '2026-07-20T00:00:00Z'),
      ],
    });
    const out = computeStrategyStats([s], [], PERIOD, NAMES);
    expect(out.by_strategy.find((r) => r.strategy_id === 's1')?.assigned).toBe(1);
  });

  it('실제가 여러 건이면 그중 최신이 이긴다', () => {
    const s = reached2({
      id: 'a',
      strategy_history: [applied('s1', '2026-07-10T00:00:00Z'), applied('s2', '2026-07-12T00:00:00Z')],
    });
    const out = computeStrategyStats([s], [], PERIOD, NAMES);
    expect(out.by_strategy.find((r) => r.strategy_id === 's2')?.assigned).toBe(1);
  });

  it('리드당 정확히 1개 전략 귀속 불변식이 유지된다', () => {
    const s = reached2({
      id: 'a',
      strategy_history: [planned('s1', '2026-07-05T00:00:00Z'), applied('s2', '2026-07-06T00:00:00Z')],
    });
    const out = computeStrategyStats([s], [], PERIOD, NAMES);
    const sum = out.by_strategy.reduce((n, r) => n + r.assigned, 0);
    expect(sum).toBe(out.rollup.assigned);
  });
});

describe('computeStrategyStats — transitions (계획 → 실제)', () => {
  const planned = (strategy_id: string, applied_at: string) =>
    entry({ strategy_id, applied_at, phase: 'planned' as const });
  const applied = (strategy_id: string, applied_at: string) =>
    entry({ strategy_id, applied_at, phase: 'applied' as const });

  it('계획과 실제가 다르면 changed=true 로 한 줄이 나온다', () => {
    const s = reached2({
      id: 'a',
      strategy_history: [planned('s1', '2026-07-05T00:00:00Z'), applied('s2', '2026-07-06T00:00:00Z')],
    });
    const out = computeStrategyStats([s], [firstPay('a', 'a')], PERIOD, NAMES);
    expect(out.transitions).toHaveLength(1);
    const t = out.transitions[0];
    expect([t.planned_id, t.applied_id]).toEqual(['s1', 's2']);
    expect(t.changed).toBe(true);
    expect(t.leads).toBe(1);
    expect(t.paid).toBe(1);
    expect(t.rate).toBe(100);
  });

  it('계획대로 진행했으면 changed=false', () => {
    const s = reached2({
      id: 'a',
      strategy_history: [planned('s1', '2026-07-05T00:00:00Z'), applied('s1', '2026-07-06T00:00:00Z')],
    });
    const out = computeStrategyStats([s], [], PERIOD, NAMES);
    expect(out.transitions[0].changed).toBe(false);
  });

  it('계획 기록이 없으면 planned_id 가 null', () => {
    const s = reached2({ id: 'a', strategy_history: [applied('s1', '2026-07-06T00:00:00Z')] });
    const out = computeStrategyStats([s], [], PERIOD, NAMES);
    expect(out.transitions[0].planned_id).toBeNull();
    expect(out.transitions[0].changed).toBe(false);
  });

  it('실제 기록이 없으면 applied_id 가 null — 기록 누락이 드러난다', () => {
    const s = reached2({ id: 'a', strategy_history: [planned('s1', '2026-07-06T00:00:00Z')] });
    const out = computeStrategyStats([s], [], PERIOD, NAMES);
    expect(out.transitions[0].applied_id).toBeNull();
  });

  it('같은 전환끼리 묶어 세고, 리드 수 많은 순으로 정렬한다', () => {
    const mk = (id: string) =>
      reached2({
        id,
        strategy_history: [planned('s1', '2026-07-05T00:00:00Z'), applied('s2', '2026-07-06T00:00:00Z')],
      });
    const solo = reached2({
      id: 'z',
      strategy_history: [planned('s2', '2026-07-05T00:00:00Z'), applied('s1', '2026-07-06T00:00:00Z')],
    });
    const out = computeStrategyStats([mk('a'), mk('b'), solo], [], PERIOD, NAMES);
    expect(out.transitions[0].leads).toBe(2);
    expect(out.transitions[1].leads).toBe(1);
  });

  it('코호트가 비면 transitions 는 빈 배열', () => {
    expect(computeStrategyStats([], [], PERIOD, NAMES).transitions).toEqual([]);
  });
});
