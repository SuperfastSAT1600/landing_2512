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
    expect(out.get('2026-08-24')).toEqual({
      completed_amount: 9_980_000,
      amount_missing: 0,
      off_board_amount: 0,
    });
  });

  it('결제가 연결 안 된 4단계는 같은 주차 같은 학생의 재결제로 되짚는다', () => {
    const out = resolveWeeklyAmounts(
      [target('2026-08-24', 's1', 'p1'), target('2026-08-24', 'grace', null)],
      new Map([['p1', 4_990_000]]),
      [payment('p9', 'grace', 1_650_000, '2026-08-24')]
    );
    expect(out.get('2026-08-24')).toEqual({
      completed_amount: 6_640_000,
      amount_missing: 0,
      off_board_amount: 0,
    });
  });

  it('되짚을 결제가 없으면 amount_missing 으로 남긴다 — 0원으로 숨기지 않는다', () => {
    const out = resolveWeeklyAmounts([target('2026-08-24', 'grace', null)], new Map(), []);
    expect(out.get('2026-08-24')).toEqual({
      completed_amount: 0,
      amount_missing: 1,
      off_board_amount: 0,
    });
  });

  it('주차 밖에 찍힌 결제는 되짚지 않는다 — 다른 주차 매출을 끌어오면 안 된다', () => {
    const out = resolveWeeklyAmounts(
      [target('2026-08-24', 'grace', null)],
      new Map(),
      [payment('p9', 'grace', 1_650_000, '2026-08-31')]
    );
    expect(out.get('2026-08-24')).toEqual({
      completed_amount: 0,
      amount_missing: 1,
      off_board_amount: 0, // 그 결제는 결제일 주차(08-31)의 보드 외로 잡힌다
    });
    expect(out.get('2026-08-31')?.off_board_amount).toBe(1_650_000);
  });

  it('이미 다른 행이 가져간 결제는 되짚기에서 제외한다 — 같은 결제를 두 번 세지 않는다', () => {
    const out = resolveWeeklyAmounts(
      // 같은 학생이 그 주차에 두 행으로 올라와 있고 결제는 하나뿐이다.
      [target('2026-08-24', 'grace', 'p9'), target('2026-08-24', 'grace', null)],
      new Map([['p9', 1_650_000]]),
      [payment('p9', 'grace', 1_650_000, '2026-08-24')]
    );
    expect(out.get('2026-08-24')).toEqual({
      completed_amount: 1_650_000,
      amount_missing: 1,
      off_board_amount: 0,
    });
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
    expect(out.get('2026-08-24')).toEqual({
      completed_amount: 1_650_000,
      amount_missing: 0,
      off_board_amount: 0,
    });
  });

  it('다른 학생의 결제는 되짚지 않는다', () => {
    const out = resolveWeeklyAmounts(
      [target('2026-08-24', 'grace', null)],
      new Map(),
      [payment('p9', 'other', 1_650_000, '2026-08-24')]
    );
    expect(out.get('2026-08-24')).toEqual({
      completed_amount: 0,
      amount_missing: 1,
      off_board_amount: 1_650_000, // 다른 학생의 그 주차 재결제는 보드 외로 남는다
    });
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
    expect(out.get('2026-08-25')).toEqual({
      completed_amount: 0,
      amount_missing: 1,
      off_board_amount: 0,
    });
    // 아무 대상도 가져가지 않은 결제라 보드 외로 남되, 결제일이 실제로 속한 주차에 붙는다.
    expect(out.get('2026-08-24')?.off_board_amount).toBe(1_650_000);
  });
});

describe('resolveWeeklyAmounts — 보드 외 재결제', () => {
  it('어느 대상도 가져가지 않은 재결제는 결제일 주차의 보드 외로 잡는다', () => {
    const out = resolveWeeklyAmounts(
      [target('2026-09-07', 'eres', 'p1')],
      new Map([['p1', 4_990_000]]),
      [
        payment('p1', 'eres', 4_990_000, '2026-09-10'),
        payment('p2', 'ruby', 4_450_000, '2026-09-10'),
      ]
    );
    expect(out.get('2026-09-07')).toEqual({
      completed_amount: 4_990_000,
      amount_missing: 0,
      off_board_amount: 4_450_000,
    });
  });

  it('되짚기로 가져간 결제는 보드 외에서 빠진다 — 같은 돈을 두 번 세지 않는다', () => {
    const out = resolveWeeklyAmounts(
      [target('2026-08-24', 'grace', null)],
      new Map(),
      [payment('p9', 'grace', 1_650_000, '2026-08-24')]
    );
    expect(out.get('2026-08-24')).toEqual({
      completed_amount: 1_650_000,
      amount_missing: 0,
      off_board_amount: 0,
    });
  });

  it('보드 외 금액은 결제일이 속한 주차에 붙는다 — 선정 주차로 밀지 않는다', () => {
    const out = resolveWeeklyAmounts(
      [],
      new Map(),
      [
        payment('p1', 'ruby', 4_450_000, '2026-09-10'),
        payment('p2', 'other', 1_800_000, '2026-08-18'),
      ]
    );
    expect(out.get('2026-09-07')?.off_board_amount).toBe(4_450_000);
    expect(out.get('2026-08-17')?.off_board_amount).toBe(1_800_000);
  });

  it('주차 정의 범위를 벗어난 결제는 어느 주차에도 넣지 않는다', () => {
    const out = resolveWeeklyAmounts([], new Map(), [payment('p1', 'x', 100_000, '2019-01-01')]);
    expect(out.size).toBe(0);
  });

  it('금액이 비어 있는 결제는 보드 외에 더하지 않는다', () => {
    const out = resolveWeeklyAmounts([], new Map(), [
      { id: 'p1', student_id: 'x', amount: null, paid_at: '2026-09-10T12:00:00+09:00' },
    ]);
    expect(out.get('2026-09-07')?.off_board_amount ?? 0).toBe(0);
  });
});
