import { describe, it, expect } from 'vitest';
import { resolveWeeklyAmounts, kstDate } from '../renewal-amount';

/** 4단계(결제 완료) 대상 한 건. */
const target = (weekStart: string, studentId: string, paymentId: string | null = null) => ({
  week_start: weekStart,
  student_id: studentId,
  converted_payment_id: paymentId,
});

/** payments 의 재결제 한 건. paid_at 은 KST 기준으로 해석된다. */
const payment = (id: string, studentId: string, amount: number, paidAtKst: string) => ({
  id,
  student_id: studentId,
  amount,
  paid_at: `${paidAtKst}T12:00:00+09:00`,
});

describe('kstDate', () => {
  it('UTC 자정 직전도 KST 날짜로 민다 — 주차 경계가 하루 밀리지 않는다', () => {
    expect(kstDate('2026-08-23T15:00:00Z')).toBe('2026-08-24');
    expect(kstDate('2026-08-23T14:59:59Z')).toBe('2026-08-23');
  });
});

describe('resolveWeeklyAmounts', () => {
  it('연결된 결제는 그 금액을 그대로 주차에 더한다', () => {
    const out = resolveWeeklyAmounts(
      [target('2026-08-24', 's1', 'p1'), target('2026-08-24', 's2', 'p2')],
      new Map([
        ['p1', 4_990_000],
        ['p2', 4_990_000],
      ]),
      []
    );
    expect(out.get('2026-08-24')).toEqual({ completed_amount: 9_980_000, amount_missing: 0 });
  });

  it('결제가 연결 안 된 4단계는 같은 주차 같은 학생의 재결제로 되짚는다', () => {
    const out = resolveWeeklyAmounts(
      [target('2026-08-24', 's1', 'p1'), target('2026-08-24', 'grace', null)],
      new Map([['p1', 4_990_000]]),
      [payment('p9', 'grace', 1_650_000, '2026-08-24')]
    );
    expect(out.get('2026-08-24')).toEqual({ completed_amount: 6_640_000, amount_missing: 0 });
  });

  it('되짚을 결제가 없으면 amount_missing 으로 남긴다 — 0원으로 숨기지 않는다', () => {
    const out = resolveWeeklyAmounts([target('2026-08-24', 'grace', null)], new Map(), []);
    expect(out.get('2026-08-24')).toEqual({ completed_amount: 0, amount_missing: 1 });
  });

  it('주차 밖에 찍힌 결제는 되짚지 않는다 — 다른 주차 매출을 끌어오면 안 된다', () => {
    const out = resolveWeeklyAmounts(
      [target('2026-08-24', 'grace', null)],
      new Map(),
      [payment('p9', 'grace', 1_650_000, '2026-08-31')]
    );
    expect(out.get('2026-08-24')).toEqual({ completed_amount: 0, amount_missing: 1 });
  });

  it('이미 다른 행이 가져간 결제는 되짚기에서 제외한다 — 같은 결제를 두 번 세지 않는다', () => {
    const out = resolveWeeklyAmounts(
      // 같은 학생이 그 주차에 두 행으로 올라와 있고 결제는 하나뿐이다.
      [target('2026-08-24', 'grace', 'p9'), target('2026-08-24', 'grace', null)],
      new Map([['p9', 1_650_000]]),
      [payment('p9', 'grace', 1_650_000, '2026-08-24')]
    );
    expect(out.get('2026-08-24')).toEqual({ completed_amount: 1_650_000, amount_missing: 1 });
  });

  it('그 주차에 재결제가 두 건이면 둘 다 더한다 — 분할 결제도 총합에 들어간다', () => {
    const out = resolveWeeklyAmounts(
      [target('2026-08-24', 'grace', null)],
      new Map(),
      [
        payment('p9', 'grace', 1_000_000, '2026-08-24'),
        payment('p10', 'grace', 650_000, '2026-08-27'),
      ]
    );
    expect(out.get('2026-08-24')).toEqual({ completed_amount: 1_650_000, amount_missing: 0 });
  });

  it('다른 학생의 결제는 되짚지 않는다', () => {
    const out = resolveWeeklyAmounts(
      [target('2026-08-24', 'grace', null)],
      new Map(),
      [payment('p9', 'other', 1_650_000, '2026-08-24')]
    );
    expect(out.get('2026-08-24')).toEqual({ completed_amount: 0, amount_missing: 1 });
  });

  it('주차를 서로 섞지 않는다', () => {
    const out = resolveWeeklyAmounts(
      [target('2026-08-24', 's1', 'p1'), target('2026-08-31', 's2', 'p2')],
      new Map([
        ['p1', 1_000_000],
        ['p2', 2_000_000],
      ]),
      []
    );
    expect(out.get('2026-08-24')?.completed_amount).toBe(1_000_000);
    expect(out.get('2026-08-31')?.completed_amount).toBe(2_000_000);
  });

  it('주차 정의에 없는 week_start 는 되짚지 않고 미연결로 둔다', () => {
    const out = resolveWeeklyAmounts(
      [target('2026-08-25', 'grace', null)], // 주차 시작일이 아님
      new Map(),
      [payment('p9', 'grace', 1_650_000, '2026-08-25')]
    );
    expect(out.get('2026-08-25')).toEqual({ completed_amount: 0, amount_missing: 1 });
  });
});
