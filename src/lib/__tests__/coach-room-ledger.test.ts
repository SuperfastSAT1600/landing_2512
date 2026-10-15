import { describe, it, expect } from 'vitest';
import { buildCoachRoomLedger, UNASSIGNED_SUBJECT, type LedgerInput } from '../coach-room-ledger';

const base: LedgerInput = {
  transactions: [
    { subject: 'SAT', hours: 10, paid_at: '2026-09-01T00:00:00Z', product: 'SAT 10h' },
    { subject: 'SAT', hours: 10, paid_at: '2026-10-01T00:00:00Z', product: 'SAT 10h' },
  ],
  payments: [{ id: 'p1', subject: 'SAT', management_status: 'active' }],
  refunds: [],
  lessons: [
    { id: 'l1', subject: 'SAT', starts_at: '2026-10-02T07:00:00Z', ends_at: '2026-10-02T08:30:00Z', status: 'completed', teacher: '박기훈', matching_id: 'm1' },
    { id: 'l2', subject: 'SAT', starts_at: '2026-10-05T07:00:00Z', ends_at: '2026-10-05T09:00:00Z', status: 'completed', teacher: '박기훈', matching_id: 'm1' },
    { id: 'l3', subject: 'SAT', starts_at: '2026-10-19T07:00:00Z', ends_at: '2026-10-19T09:00:00Z', status: 'approved', teacher: '박기훈', matching_id: 'm1' },
  ],
  sessions: [],
  now: '2026-10-15T06:00:00Z',
};

// REQ-001 (crm-coach-room-card)
describe('buildCoachRoomLedger', () => {
  it('구매 − 환불 − 완료 = 잔여, 예약은 따로', () => {
    const [sat] = buildCoachRoomLedger(base);
    expect(sat.subject).toBe('SAT');
    expect(sat.managementStatus).toBe('active');
    expect(sat.totals).toMatchObject({ purchased: 20, refunded: 0, completed: 3.5, remaining: 16.5, scheduled: 2, unscheduled: 14.5, upcoming: 2, held: 0, actualRemaining: 16.5 });
  });

  it('수업은 최신순, 완료 수업엔 누적 진행 시간', () => {
    const [sat] = buildCoachRoomLedger(base);
    expect(sat.lessons.map((l) => [l.id, l.status, l.hours, l.cumulative])).toEqual([
      ['l3', 'scheduled', 2, null],
      ['l2', 'completed', 2, 3.5],
      ['l1', 'completed', 1.5, 1.5],
    ]);
  });

  it('확인 대기는 pending, 환불은 결제 과목에서 빠진다', () => {
    const [sat] = buildCoachRoomLedger({
      ...base,
      refunds: [{ payment_id: 'p1', hours_refunded: 5, refunded_at: '2026-10-10T00:00:00Z', reason: '부분 환불' }],
      lessons: [{ ...base.lessons[2], status: 'awaiting_confirmation' }],
    });
    expect(sat.lessons[0].status).toBe('pending');
    expect(sat.totals.refunded).toBe(5);
    expect(sat.totals.remaining).toBe(15);
  });

  it('완료가 결제분을 넘으면 잔여는 음수 그대로', () => {
    const [sat] = buildCoachRoomLedger({ ...base, transactions: [base.transactions[0]], lessons: [
      { ...base.lessons[0], ends_at: '2026-10-02T13:00:00Z' },
      { ...base.lessons[1], ends_at: '2026-10-05T13:00:00Z' },
    ] });
    expect(sat.totals.completed).toBe(12);
    expect(sat.totals.remaining).toBe(-2);
  });

  it('과목은 SAT → AP → special 순, 결제는 최신순', () => {
    const subjects = buildCoachRoomLedger({
      ...base,
      transactions: [...base.transactions, { subject: 'AP', hours: 5, paid_at: '2026-09-05T00:00:00Z', product: 'AP' }],
      lessons: [],
    });
    expect(subjects.map((s) => s.subject)).toEqual(['SAT', 'AP']);
    expect(subjects[0].transactions.map((t) => t.paidAt)).toEqual(['2026-10-01T00:00:00Z', '2026-09-01T00:00:00Z']);
  });

  it('아무것도 없으면 빈 배열', () => {
    expect(buildCoachRoomLedger({ transactions: [], payments: [], refunds: [], lessons: [], sessions: [], now: base.now })).toEqual([]);
  });

  it('과목 없는 매칭의 수업은 SAT 잔여에 섞지 않고 따로 보인다', () => {
    const subjects = buildCoachRoomLedger({ ...base, lessons: [...base.lessons, { ...base.lessons[0], id: 'x', subject: null }] });
    expect(subjects.map((s) => s.subject)).toEqual(['SAT', UNASSIGNED_SUBJECT]);
    expect(subjects[0].totals.completed).toBe(3.5);
    expect(subjects[1].totals.completed).toBe(1.5);
  });

  it('시각 표기(Z / +00:00)가 섞여도 시간순', () => {
    const [sat] = buildCoachRoomLedger({ ...base, lessons: [
      { ...base.lessons[0], id: 'a', starts_at: '2026-10-02T07:00:00+00:00', ends_at: '2026-10-02T08:00:00+00:00' },
      { ...base.lessons[0], id: 'b', starts_at: '2026-10-02T06:30:00Z', ends_at: '2026-10-02T07:00:00Z' },
    ] });
    expect(sat.lessons.map((l) => l.id)).toEqual(['a', 'b']);
  });

  // REQ-005: 지난 '예정' 수업을 접속 기록으로 나눈다
  it('지난 수업: 접속 확인되면 완료 처리 대기(실제 진행), 기록 없으면 확인 필요', () => {
    const past = (id: string, day: string) => ({ ...base.lessons[2], id, starts_at: `2026-10-${day}T02:00:00Z`, ends_at: `2026-10-${day}T03:00:00Z` });
    const [sat] = buildCoachRoomLedger({
      ...base,
      lessons: [...base.lessons, past('p13', '13'), past('p14', '14')],
      sessions: [
        { matching_id: 'm1', role: 'teacher', started_at: '2026-10-13T01:59:00Z', ended_at: '2026-10-13T03:03:00Z' },
        { matching_id: 'm1', role: 'student', started_at: '2026-10-13T02:00:00Z', ended_at: '2026-10-13T02:58:00Z' },
      ],
    });
    const byId = Object.fromEntries(sat.lessons.map((l) => [l.id, l]));
    expect(byId.p13.status).toBe('held');
    expect(byId.p13.togetherMinutes).toBe(58);
    expect(byId.p13.cumulative).toBe(4.5);
    expect(byId.p14.status).toBe('unverified');
    expect(byId.p14.togetherMinutes).toBe(0);
    expect(byId.l3.togetherMinutes).toBeNull();
    expect(sat.totals).toMatchObject({ completed: 3.5, held: 1, unverified: 1, upcoming: 2, actualCompleted: 4.5, remaining: 16.5, actualRemaining: 15.5 });
  });

  it('끝난 지 30분 안 된 수업은 아직 판정하지 않고, 닫히지 않은 접속은 지금까지로 본다', () => {
    const just = { ...base.lessons[2], id: 'just', starts_at: '2026-10-15T05:00:00Z', ends_at: '2026-10-15T05:50:00Z' };
    const earlier = { ...base.lessons[2], id: 'open', starts_at: '2026-10-15T04:00:00Z', ends_at: '2026-10-15T05:00:00Z' };
    const [sat] = buildCoachRoomLedger({
      ...base,
      lessons: [just, earlier],
      sessions: [
        { matching_id: 'm1', role: 'teacher', started_at: '2026-10-15T04:00:00Z', ended_at: null },
        { matching_id: 'm1', role: 'student', started_at: '2026-10-15T04:00:00Z', ended_at: null },
      ],
    });
    const byId = Object.fromEntries(sat.lessons.map((l) => [l.id, l]));
    expect(byId.just.status).toBe('scheduled');
    expect(byId.open.status).toBe('held');
    expect(byId.open.togetherMinutes).toBe(90);
  });
});
