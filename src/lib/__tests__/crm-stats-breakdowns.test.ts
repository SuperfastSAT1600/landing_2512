import { describe, it, expect } from 'vitest';
import {
  computeBySource,
  computeMonthly,
  computeStageFlowRows,
  computeWeekly,
} from '../crm-stats-breakdowns';
import {
  makeContactedChecker,
  makePaidChecker,
  type StatsLead,
  type StatsPayment,
} from '../crm-stats-totals';
import { getWeekLabel } from '../week-definitions';

// 특성화 테스트 — computeCrmStats 분리 직전 구현이 내던 값을 고정한다.

function lead(over: Partial<StatsLead>): StatsLead {
  return {
    id: 'x', name: '학생', funnel_stage: '1', lead_status: 'active',
    traffic_source: '인스타', inquiry_date: '2026-07-30T10:00:00', created_at: '2026-07-30T01:00:00Z',
    stage_history: [], ...over,
  };
}

function pay(over: Partial<StatsPayment>): StatsPayment {
  return {
    student_id: 'x', student_name: '학생', amount: 0, payment_type: '최초결제',
    paid_at: '2026-07-30T01:00:00Z', ...over,
  };
}

const isContacted = makeContactedChecker(new Map());
const noPaid = makePaidChecker([]);

describe('computeBySource', () => {
  const leads = [
    lead({ id: 'a', name: 'A', traffic_source: '인스타', funnel_stage: '2', inquiry_date: '2026-07-30T10:00:00', first_message_sent_at: '2026-07-30T10:10:00+09:00' }),
    lead({ id: 'b', name: 'B', traffic_source: '인스타', first_message_sent_at: '2026-07-30T10:20:00+09:00' }),
    lead({ id: 'c', name: 'C', traffic_source: null, funnel_stage: '2' }),
    lead({ id: 'd', name: 'D', traffic_source: '네이버', funnel_stage: '2', retry_strategy_id: 'r' }),
  ];
  const payments = [
    pay({ student_id: 'a', amount: 110000, tax_type: '과세' }),
    pay({ student_id: 'outsider', amount: 999 }), // 코호트 밖 결제는 채널 매출에서 제외
    pay({ student_id: null, amount: 5 }),
  ];
  const isPaid = makePaidChecker([{ student_id: 'a', student_name: 'A' }]);

  it('채널별 리드·컨택·결제·매출·첫 응답을 집계하고 리드 수 내림차순으로 정렬한다', () => {
    expect(computeBySource(leads, payments, isPaid, isContacted)).toEqual([
      {
        source: '인스타', leads: 2, contacted: 1, contact_rate: 50, paid: 1, conversion_rate: 100,
        revenue: 110000, net_revenue: 100000, avg_first_response_seconds: 900, // (600 + 1200) / 2
      },
      {
        source: '미입력', leads: 1, contacted: 1, contact_rate: 100, paid: 0, conversion_rate: 0,
        revenue: 0, net_revenue: 0, avg_first_response_seconds: null,
      },
      {
        source: '네이버', leads: 1, contacted: 0, contact_rate: 0, paid: 0, conversion_rate: 0,
        revenue: 0, net_revenue: 0, avg_first_response_seconds: null,
      },
    ]);
  });

  it('음수 응답 시간은 평균에서 제외한다', () => {
    const early = lead({ id: 'e', traffic_source: 'X', first_message_sent_at: '2026-07-30T09:00:00+09:00' });
    const [row] = computeBySource([early], [], noPaid, isContacted);
    expect(row.avg_first_response_seconds).toBeNull();
  });

  it('리드가 없으면 빈 배열', () => {
    expect(computeBySource([], payments, noPaid, isContacted)).toEqual([]);
  });
});

describe('computeMonthly', () => {
  it('리드는 문의월, 결제는 결제월로 집계하고 빈 달을 채운다', () => {
    const leads = [
      lead({ id: 'a', name: 'A', funnel_stage: '2', inquiry_date: '2026-01-10T10:00:00' }),
      lead({ id: 'b', name: 'B', inquiry_date: null, created_at: '2026-03-05T00:00:00Z' }), // created_at 폴백(월 키)
    ];
    const payments = [
      pay({ student_id: 'a', amount: 100, paid_at: '2026-01-20T05:00:00Z' }),
      pay({ student_id: 'a', amount: -40, paid_at: '2026-01-25T05:00:00Z', payment_type: '환불' }),
    ];
    const isPaid = makePaidChecker([{ student_id: 'a', student_name: 'A' }]);
    const rows = computeMonthly(leads, payments, isPaid, isContacted);
    const empty = { leads: 0, contacted: 0, paid: 0, gross_revenue: 0, refund: 0, revenue: 0, net_revenue: 0 };
    expect(rows).toEqual([
      { month: '2026-01', leads: 1, contacted: 1, paid: 1, gross_revenue: 100, refund: -40, revenue: 60, net_revenue: 60 },
      { month: '2026-02', ...empty },
      { month: '2026-03', ...empty, leads: 1 },
    ]);
  });

  it('데이터가 없으면 빈 배열', () => {
    expect(computeMonthly([], [], noPaid, isContacted)).toEqual([]);
  });
});

describe('computeWeekly', () => {
  const d1 = '2026-07-30T10:00:00';
  const wk = getWeekLabel(d1)!;

  it('주차별 리드·결제를 합치고 시작일 오름차순으로 정렬한다', () => {
    const leads = [
      lead({ id: 'a', name: 'A', funnel_stage: '2', inquiry_date: d1 }),
      lead({ id: 'b', name: 'B', inquiry_date: d1, retry_strategy_id: 'r' }),
    ];
    const payments = [
      pay({ amount: 110000, tax_type: '과세', paid_at: '2026-07-30T05:00:00Z' }),
    ];
    const isPaid = makePaidChecker([{ student_id: 'b', student_name: 'B' }]);
    expect(computeWeekly(leads, payments, isPaid, isContacted)).toEqual([
      { week: wk, leads: 2, contacted: 1, paid: 1, revenue: 110000, net_revenue: 100000 },
    ]);
  });

  it('주차 정의 밖 날짜는 건너뛴다', () => {
    const out = lead({ id: 'o', inquiry_date: '1999-01-01T00:00:00' });
    expect(computeWeekly([out], [pay({ paid_at: '1999-01-01T00:00:00Z' })], noPaid, isContacted)).toEqual([]);
  });

  it('결제만 있는 주차도 행이 생긴다', () => {
    const rows = computeWeekly([], [pay({ amount: 70, paid_at: '2026-07-30T05:00:00Z' })], noPaid, isContacted);
    expect(rows).toEqual([{ week: wk, leads: 0, contacted: 0, paid: 0, revenue: 70, net_revenue: 70 }]);
  });
});

describe('computeStageFlowRows', () => {
  it('리드가 없어도 단계 행 구조를 돌려준다', () => {
    const rows = computeStageFlowRows([]);
    expect(Array.isArray(rows)).toBe(true);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.reached === 0 && r.advanced === 0 && r.avg_days === null)).toBe(true);
  });

  it('stage_history 가 없으면 빈 이력으로 취급한다', () => {
    const withNull = computeStageFlowRows([lead({ funnel_stage: '2', stage_history: null })]);
    const withEmpty = computeStageFlowRows([lead({ funnel_stage: '2', stage_history: [] })]);
    expect(withNull).toEqual(withEmpty);
  });
});
