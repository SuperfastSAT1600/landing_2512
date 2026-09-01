// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { buildSubjectBreakdown } from '@/lib/tutoring-subject-breakdown';

/** 노윤재(2026-08 실측): SAT 62구매/22완료/22예약, special 68구매/68완료. */
const YOONJAE = {
  purchased: new Map([['SAT', 62], ['special', 68]]),
  used: new Map([['SAT', 22], ['special', 68]]),
  scheduled: new Map([['SAT', 22]]),
  paymentStatus: new Map([
    ['SAT', 'active' as const],
    ['special', 'inactive' as const],
  ]),
};

describe('buildSubjectBreakdown', () => {
  it('과목별로 Payment 페이지와 같은 수치를 만든다', () => {
    const rows = buildSubjectBreakdown(YOONJAE);

    expect(rows).toEqual([
      {
        subject: 'SAT',
        purchased: 62,
        completed: 22,
        refunded: 0,
        remaining: 40,
        scheduled: 22,
        unscheduled: 18,
        overscheduled: 0,
        paymentStatus: 'active',
      },
      {
        subject: 'special',
        purchased: 68,
        completed: 68,
        refunded: 0,
        remaining: 0,
        scheduled: 0,
        unscheduled: 0,
        overscheduled: 0,
        paymentStatus: 'inactive',
      },
    ]);
  });

  it('과목 합이 학생 단위 총합과 일치한다', () => {
    const rows = buildSubjectBreakdown(YOONJAE);
    const sum = (k: 'purchased' | 'completed' | 'remaining' | 'scheduled') =>
      rows.reduce((acc, r) => acc + r[k], 0);

    expect(sum('purchased')).toBe(130);
    expect(sum('completed')).toBe(90);
    expect(sum('remaining')).toBe(40);
    expect(sum('scheduled')).toBe(22);
  });

  it('결제분을 넘겨 쓰면 잔여가 음수, 넘겨 예약하면 초과예약이 잡힌다', () => {
    const [row] = buildSubjectBreakdown({
      purchased: new Map([['SAT', 20]]),
      used: new Map([['SAT', 26]]),
      scheduled: new Map([['SAT', 4]]),
    });

    expect(row.remaining).toBe(-6);
    expect(row.overscheduled).toBe(10);
    expect(row.unscheduled).toBe(0);
  });

  it('환불 시간을 잔여에서 뺀다', () => {
    const [row] = buildSubjectBreakdown({
      purchased: new Map([['AP', 30]]),
      refunded: new Map([['AP', 10]]),
      used: new Map([['AP', 5]]),
    });

    expect(row).toMatchObject({ subject: 'AP', refunded: 10, remaining: 15, unscheduled: 15 });
  });

  it('한 소스에만 있는 과목도 행으로 남는다 (구매 없이 결제만, 수업만)', () => {
    const rows = buildSubjectBreakdown({
      purchased: new Map([['SAT', 10]]),
      used: new Map([['special', 4]]),
      paymentStatus: new Map([['AP', 'onboarding' as const]]),
    });

    expect(rows.map((r) => r.subject)).toEqual(['SAT', 'AP', 'special']);
    expect(rows.find((r) => r.subject === 'AP')).toMatchObject({ purchased: 0, paymentStatus: 'onboarding' });
    expect(rows.find((r) => r.subject === 'special')).toMatchObject({ completed: 4, remaining: -4 });
  });

  it('과목 표시 순서는 SAT → AP → special → 기타 → 미지정', () => {
    const rows = buildSubjectBreakdown({
      purchased: new Map([
        ['special', 1],
        [null, 1],
        ['TOEFL', 1],
        ['AP', 1],
        ['SAT', 1],
      ]),
    });

    expect(rows.map((r) => r.subject)).toEqual(['SAT', 'AP', 'special', 'TOEFL', null]);
  });

  it('소수점 시간은 0.1 단위로 반올림한다', () => {
    const [row] = buildSubjectBreakdown({
      purchased: new Map([['SAT', 10.06]]),
      used: new Map([['SAT', 3.3333]]),
    });

    // 학생 단위 계산과 같은 규칙 — 각 항목을 0.1로 반올림한 뒤 잔여를 구한다.
    expect(row.purchased).toBe(10.1);
    expect(row.completed).toBe(3.3);
    expect(row.remaining).toBe(6.8);
  });

  it('아무 데이터도 없으면 빈 배열', () => {
    expect(buildSubjectBreakdown({})).toEqual([]);
  });
});
