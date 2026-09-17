import { describe, it, expect } from 'vitest';
import {
  buildFirstPaymentIndex,
  foldFirstAttempts,
  scoreBand,
  computeLegacyConversion,
  type AttemptForStats,
  type PaymentRow,
  type LeadRow,
} from '../legacy-diagnostic-conversion';

const attempt = (over: Partial<AttemptForStats>): AttemptForStats => ({
  record_id: 'r',
  student_id: null,
  student_name: '학생',
  score: 1000,
  taken_at: '2025-07-01T00:00:00.000Z',
  is_internal: false,
  ...over,
});

describe('buildFirstPaymentIndex (REQ-007)', () => {
  const payments: PaymentRow[] = [
    {
      student_id: 's1',
      student_name: '김지인',
      paid_at: '2025-08-01T00:00:00Z',
      amount: 1000000,
      payment_type: '최초결제',
    },
    {
      student_id: 's1',
      student_name: '김지인',
      paid_at: '2025-07-20T00:00:00Z',
      amount: 500000,
      payment_type: '최초결제',
    },
    {
      student_id: 's2',
      student_name: '환불자',
      paid_at: '2025-08-02T00:00:00Z',
      amount: -500000,
      payment_type: '환불',
    },
    {
      student_id: 's3',
      student_name: '재결제자',
      paid_at: '2025-08-03T00:00:00Z',
      amount: 700000,
      payment_type: '재결제',
    },
    {
      student_id: null,
      student_name: '이름만',
      paid_at: '2025-08-04T00:00:00Z',
      amount: 0,
      payment_type: '최초결제',
    },
  ];

  it('최초결제·amount>=0 만 전환으로 본다 (crm-stats-service 정의)', () => {
    const idx = buildFirstPaymentIndex(payments);
    expect(idx.byId.has('s1')).toBe(true);
    expect(idx.byId.has('s2')).toBe(false);
    expect(idx.byId.has('s3')).toBe(false);
  });

  it('0원 가결제도 전환이고, student_id 없으면 이름으로 잡는다', () => {
    const idx = buildFirstPaymentIndex(payments);
    expect(idx.byName.has('이름만')).toBe(true);
  });

  it('여러 건이면 가장 이른 결제일을 쓴다', () => {
    const idx = buildFirstPaymentIndex(payments);
    expect(idx.byId.get('s1')).toBe('2025-07-20T00:00:00Z');
  });
});

describe('foldFirstAttempts (REQ-007)', () => {
  it('내부 테스트 제출은 뺀다', () => {
    const folded = foldFirstAttempts([attempt({ record_id: 'a', is_internal: true })]);
    expect(folded).toHaveLength(0);
  });

  it('같은 학생의 재응시는 최초 1건으로 접는다', () => {
    const folded = foldFirstAttempts([
      attempt({ record_id: 'a', student_id: 's1', taken_at: '2025-07-05T00:00:00Z' }),
      attempt({ record_id: 'b', student_id: 's1', taken_at: '2025-07-01T00:00:00Z' }),
    ]);
    expect(folded).toHaveLength(1);
    expect(folded[0].record_id).toBe('b');
  });

  it('미매칭 건은 정규화한 이름으로 접는다', () => {
    const folded = foldFirstAttempts([
      attempt({ record_id: 'a', student_name: '김 지인', taken_at: '2025-07-05T00:00:00Z' }),
      attempt({ record_id: 'b', student_name: '김지인', taken_at: '2025-07-02T00:00:00Z' }),
      attempt({ record_id: 'c', student_name: '박하나', taken_at: '2025-07-02T00:00:00Z' }),
    ]);
    expect(folded).toHaveLength(2);
    expect(folded.find((f) => f.student_name.includes('김'))!.record_id).toBe('b');
  });
});

describe('scoreBand (REQ-007)', () => {
  it('점수대를 나눈다', () => {
    expect(scoreBand(880)).toBe('~900');
    expect(scoreBand(1000)).toBe('900-1099');
    expect(scoreBand(1200)).toBe('1100-1299');
    expect(scoreBand(1400)).toBe('1300+');
    expect(scoreBand(null)).toBe('미상');
  });
});

describe('computeLegacyConversion (REQ-007)', () => {
  const payments: PaymentRow[] = [
    {
      student_id: 's1',
      student_name: '김지인',
      paid_at: '2025-08-04T00:00:00Z',
      amount: 1000000,
      payment_type: '최초결제',
    },
    {
      student_id: 's9',
      student_name: '무관학생',
      paid_at: '2025-08-01T00:00:00Z',
      amount: 900000,
      payment_type: '최초결제',
    },
  ];
  const leads: LeadRow[] = [
    { id: 's1', name: '김지인', inquiry_date: '2025-07-01T00:00:00' },
    { id: 's3', name: '김재연', inquiry_date: '2025-07-05T00:00:00' },
    { id: 's9', name: '무관학생', inquiry_date: '2025-08-01T00:00:00' },
    { id: 's8', name: '기간밖', inquiry_date: '2024-01-01T00:00:00' },
  ];
  const attempts = [
    attempt({
      record_id: 'a',
      student_id: 's1',
      student_name: '김지인',
      score: 1108,
      taken_at: '2025-07-05T00:00:00Z',
    }),
    attempt({
      record_id: 'b',
      student_id: 's3',
      student_name: '김재연',
      score: 848,
      taken_at: '2025-07-09T00:00:00Z',
    }),
    attempt({
      record_id: 'c',
      student_id: null,
      student_name: 'sadg',
      score: 998,
      taken_at: '2025-07-07T00:00:00Z',
    }),
    attempt({ record_id: 'd', is_internal: true, student_name: '테스트' }),
  ];

  const report = computeLegacyConversion(attempts, payments, leads, {
    from: '2025-06-01',
    to: '2025-09-30',
  });

  it('내부 제출을 뺀 응시자 수와 매칭 현황을 센다', () => {
    expect(report.totalAttempts).toBe(3);
    expect(report.matched).toBe(2);
    expect(report.unmatched).toBe(1);
  });

  it('전환율을 매칭분 기준(상한)과 전체 기준(하한)으로 함께 낸다', () => {
    expect(report.converted).toBe(1);
    expect(report.conversionRateMatched).toBeCloseTo(0.5);
    expect(report.conversionRateAll).toBeCloseTo(1 / 3);
  });

  it('기준선은 같은 기간 인입 리드 전체의 전환율이다', () => {
    // 기간 내 리드 s1, s3, s9 중 결제는 s1, s9 → 2/3
    expect(report.baseline.leads).toBe(3);
    expect(report.baseline.converted).toBe(2);
    expect(report.baseline.rate).toBeCloseTo(2 / 3);
  });

  it('응시 → 최초결제 소요일을 낸다', () => {
    expect(report.daysToPayment.n).toBe(1);
    expect(report.daysToPayment.median).toBe(30);
  });

  it('채점 실패분(unscored)은 점수대 집계에서 미상으로 내린다', () => {
    const rep2 = computeLegacyConversion(
      [attempt({ record_id: 'x', student_id: 's1', score: 400, unscored: true })],
      payments,
      leads,
      { from: '2025-06-01', to: '2025-09-30' }
    );
    expect(rep2.byScoreBand.find((b) => b.band === '~900')).toBeUndefined();
    expect(rep2.byScoreBand.find((b) => b.band === '미상')?.attempts).toBe(1);
  });

  it('점수대별로 쪼갠다', () => {
    const band = report.byScoreBand.find((b) => b.band === '1100-1299');
    expect(band).toMatchObject({ attempts: 1, converted: 1 });
  });

  it('응시자가 없으면 0으로 나누지 않는다', () => {
    const empty = computeLegacyConversion([], payments, leads, {
      from: '2025-06-01',
      to: '2025-09-30',
    });
    expect(empty.conversionRateMatched).toBe(0);
    expect(empty.conversionRateAll).toBe(0);
  });
});
