import { describe, it, expect } from 'vitest';
import {
  computeWeeklyExecution,
  type WeeklyExecutionPayment,
  type WeeklyExecutionStudent,
} from '@/lib/weekly-execution';
import type { StrategyHistoryEntry, StrategyHistoryType } from '@/types/crm';

const WEEK = { start: '2026-08-17', end: '2026-08-23' }; // 26년 08월 03주차 (월~일)

const NAMES = new Map<string, string>([
  ['s-report', '진단리포트 당일등록 할인'],
  ['s-coach', '대표 코치 수강권'],
  ['s-retry', '인스타 상담 재신청'],
]);

function entry(
  strategyId: string,
  appliedAt: string,
  type: StrategyHistoryType = 'initial_sales',
  memo = '',
): StrategyHistoryEntry {
  return {
    id: `e-${strategyId}-${appliedAt}`,
    type,
    strategy_id: strategyId,
    strategy_name: NAMES.get(strategyId) ?? '이름없음',
    memo,
    applied_at: appliedAt,
  };
}

function student(
  id: string,
  history: StrategyHistoryEntry[],
  over: Partial<WeeklyExecutionStudent> = {},
): WeeklyExecutionStudent {
  return {
    id,
    name: id.toUpperCase(),
    funnel_stage: '1',
    stage_history: null,
    strategy_history: history,
    created_at: '2026-07-01T00:00:00Z',
    ...over,
  };
}

const firstPayment = (studentId: string, amount: number, paidAt = '2026-08-20T05:00:00Z'): WeeklyExecutionPayment => ({
  student_id: studentId,
  student_name: studentId.toUpperCase(),
  amount,
  payment_type: '최초결제',
  paid_at: paidAt,
});

describe('computeWeeklyExecution — 주 범위 귀속', () => {
  it('applied_at이 주 범위 안인 모든 이력을 센다', () => {
    const rows = computeWeeklyExecution(
      [
        student('a', [entry('s-report', '2026-08-17T10:00:00')]),
        student('b', [entry('s-report', '2026-08-23T22:00:00')]),
      ],
      [],
      WEEK,
      NAMES,
      [],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].strategy_id).toBe('s-report');
    expect(rows[0].applied_count).toBe(2);
    expect(rows[0].leads.map((l) => l.student_id).sort()).toEqual(['a', 'b']);
  });

  it('주 범위 밖(직전 일요일·다음 월요일)은 제외한다', () => {
    const rows = computeWeeklyExecution(
      [
        student('a', [entry('s-report', '2026-08-16T23:00:00')]),
        student('b', [entry('s-report', '2026-08-24T00:10:00')]),
      ],
      [],
      WEEK,
      NAMES,
      [],
    );
    expect(rows).toHaveLength(0);
  });

  it('UTC 인스턴트는 KST 날짜로 판정한다', () => {
    // 2026-08-16T15:30Z = 2026-08-17 00:30 KST → 주 안
    const inWeek = computeWeeklyExecution(
      [student('a', [entry('s-report', '2026-08-16T15:30:00Z')])],
      [],
      WEEK,
      NAMES,
      [],
    );
    expect(inWeek).toHaveLength(1);
    // 2026-08-16T14:30Z = 2026-08-16 23:30 KST → 주 밖
    const outWeek = computeWeeklyExecution(
      [student('a', [entry('s-report', '2026-08-16T14:30:00Z')])],
      [],
      WEEK,
      NAMES,
      [],
    );
    expect(outWeek).toHaveLength(0);
  });

  it('같은 리드가 한 주에 여러 전략을 받으면 각 전략에 모두 잡힌다 (최신 1건으로 줄이지 않음)', () => {
    const rows = computeWeeklyExecution(
      [
        student('a', [
          entry('s-report', '2026-08-18T10:00:00'),
          entry('s-coach', '2026-08-20T10:00:00'),
        ]),
      ],
      [],
      WEEK,
      NAMES,
      [],
    );
    expect(rows.map((r) => r.strategy_id).sort()).toEqual(['s-coach', 's-report']);
    expect(rows.every((r) => r.applied_count === 1)).toBe(true);
  });

  it('같은 리드·같은 전략을 주중 두 번 적용하면 1명으로 합치고 최신 적용을 남긴다', () => {
    const rows = computeWeeklyExecution(
      [
        student('a', [
          entry('s-report', '2026-08-18T10:00:00', 'initial_sales', '첫 제안'),
          entry('s-report', '2026-08-21T10:00:00', 'initial_sales', '재제안'),
        ]),
      ],
      [],
      WEEK,
      NAMES,
      [],
    );
    expect(rows[0].applied_count).toBe(1);
    expect(rows[0].leads[0].applied_at).toBe('2026-08-21T10:00:00');
    expect(rows[0].leads[0].memo).toBe('재제안');
  });

  it('retry FK만 있는 리드는 retry_assigned_at으로 합성해 잡는다', () => {
    const rows = computeWeeklyExecution(
      [
        student('a', [], {
          retry_strategy_id: 's-retry',
          retry_assigned_at: '2026-08-19T04:00:00Z',
        }),
      ],
      [],
      WEEK,
      NAMES,
      [],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].strategy_id).toBe('s-retry');
    expect(rows[0].type).toBe('retry');
  });

  it('history에 같은 retry 전략 엔트리가 있으면 FK 합성으로 중복하지 않는다', () => {
    const rows = computeWeeklyExecution(
      [
        student('a', [entry('s-retry', '2026-08-19T10:00:00', 'retry')], {
          retry_strategy_id: 's-retry',
          retry_assigned_at: '2026-08-20T10:00:00',
        }),
      ],
      [],
      WEEK,
      NAMES,
      [],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].applied_count).toBe(1);
  });
});

describe('computeWeeklyExecution — 계획 대조', () => {
  it('계획된 전략을 먼저, 적용 0건이어도 행을 남긴다', () => {
    const rows = computeWeeklyExecution(
      [student('a', [entry('s-coach', '2026-08-18T10:00:00')])],
      [],
      WEEK,
      NAMES,
      [{ strategy_id: 's-report', strategy_name: '진단리포트 당일등록 할인', type: 'initial_sales' }],
    );
    expect(rows.map((r) => [r.strategy_id, r.planned, r.applied_count])).toEqual([
      ['s-report', true, 0],
      ['s-coach', false, 1],
    ]);
  });

  it('계획 외 실행은 적용 수 내림차순으로 정렬한다', () => {
    const rows = computeWeeklyExecution(
      [
        student('a', [entry('s-coach', '2026-08-18T10:00:00')]),
        student('b', [entry('s-report', '2026-08-18T10:00:00')]),
        student('c', [entry('s-report', '2026-08-19T10:00:00')]),
      ],
      [],
      WEEK,
      NAMES,
      [],
    );
    expect(rows.map((r) => r.strategy_id)).toEqual(['s-report', 's-coach']);
  });

  it('삭제된 전략은 이력 스냅샷 이름을 쓰고, 그마저 없으면 표시용 폴백', () => {
    const rows = computeWeeklyExecution(
      [
        student('a', [
          { ...entry('s-gone', '2026-08-18T10:00:00'), strategy_name: '없어진 전략' },
          { ...entry('s-nameless', '2026-08-18T11:00:00'), strategy_name: '' },
        ]),
      ],
      [],
      WEEK,
      new Map(),
      [],
    );
    const byId = new Map(rows.map((r) => [r.strategy_id, r.strategy_name]));
    expect(byId.get('s-gone')).toBe('없어진 전략');
    expect(byId.get('s-nameless')).toBe('(삭제된 전략)');
  });
});

describe('computeWeeklyExecution — 결과 지표', () => {
  it('컨택은 2단계 도달 기준으로 센다', () => {
    const rows = computeWeeklyExecution(
      [
        student('a', [entry('s-report', '2026-08-18T10:00:00')], { funnel_stage: '3a' }),
        student('b', [entry('s-report', '2026-08-18T10:00:00')], { funnel_stage: '1' }),
      ],
      [],
      WEEK,
      NAMES,
      [],
    );
    expect(rows[0].applied_count).toBe(2);
    expect(rows[0].contacted_count).toBe(1);
    expect(rows[0].leads.find((l) => l.student_id === 'a')?.contacted).toBe(true);
    expect(rows[0].leads.find((l) => l.student_id === 'b')?.contacted).toBe(false);
  });

  it('결제·매출은 적용 리드의 최초결제(0원 포함, 환불 제외) 기준', () => {
    const rows = computeWeeklyExecution(
      [
        student('a', [entry('s-report', '2026-08-18T10:00:00')]),
        student('b', [entry('s-report', '2026-08-18T10:00:00')]),
        student('c', [entry('s-report', '2026-08-18T10:00:00')]),
      ],
      [
        firstPayment('a', 4_100_000),
        firstPayment('b', 0),
        { ...firstPayment('c', -500_000), payment_type: '환불' },
        { ...firstPayment('a', 1_000_000), payment_type: '재결제' },
      ],
      WEEK,
      NAMES,
      [],
    );
    expect(rows[0].paid_count).toBe(2);
    expect(rows[0].revenue).toBe(4_100_000);
    expect(rows[0].leads.find((l) => l.student_id === 'c')?.paid).toBe(false);
  });

  it('student_id가 없는 결제는 이름으로 매칭한다', () => {
    const rows = computeWeeklyExecution(
      [student('a', [entry('s-report', '2026-08-18T10:00:00')])],
      [{ student_id: null, student_name: 'A', amount: 2_000_000, payment_type: '최초결제', paid_at: '2026-08-20T05:00:00Z' }],
      WEEK,
      NAMES,
      [],
    );
    expect(rows[0].paid_count).toBe(1);
    expect(rows[0].revenue).toBe(2_000_000);
  });

  it('리드는 최신 적용 순으로 정렬한다', () => {
    const rows = computeWeeklyExecution(
      [
        student('a', [entry('s-report', '2026-08-18T10:00:00')]),
        student('b', [entry('s-report', '2026-08-21T10:00:00')]),
      ],
      [],
      WEEK,
      NAMES,
      [],
    );
    expect(rows[0].leads.map((l) => l.student_id)).toEqual(['b', 'a']);
  });
});
