import type { RenewalTarget } from '@/types/crm';
import { getRenewalCandidates } from '../renewal-candidate-source';
import type { TutoringEntry, TutoringHours, TutoringRowStudent } from '../TutoringStudentRow';

/** 잔여/초과예약만 지정하고 나머지는 대표값으로 채운다. */
function hours(over: Partial<TutoringHours> = {}): TutoringHours {
  return {
    purchased: 20, completed: 10, refunded: 0,
    remaining: 10, scheduled: 0, unscheduled: 10, overscheduled: 0,
    ...over,
  };
}

function entry(
  id: string,
  over: Partial<TutoringEntry<TutoringRowStudent>> & { name?: string } = {}
): TutoringEntry<TutoringRowStudent> {
  const { name, ...rest } = over;
  return {
    student: {
      id,
      name: name ?? id,
      grade: '고3',
      parent_phone: '',
      is_vip: false,
      needs_attention: false,
      traffic_source: null,
    },
    displayStatus: 'active',
    remainingHours: 10,
    hours: null,
    subjects: [],
    paymentStatus: null,
    bySubject: [],
    ...rest,
  };
}

function target(studentId: string, stage: RenewalTarget['stage']): RenewalTarget {
  return {
    id: `target-${studentId}`,
    student_id: studentId,
    week_start: '2026-08-10',
    stage,
    stage_updated_at: '2026-08-14T00:00:00Z',
    converted_payment_id: null,
    drop_reason: null,
    created_by: null,
    created_at: '2026-08-14T00:00:00Z',
    updated_at: '2026-08-14T00:00:00Z',
  };
}

describe('getRenewalCandidates', () => {
  it('keeps every tutoring entry when there are no existing targets', () => {
    const entries = [entry('a'), entry('b')];
    expect(getRenewalCandidates(entries, []).map((e) => e.student.id)).toEqual(['a', 'b']);
  });

  it('excludes students with an open target but keeps 결제 완료 selectable again', () => {
    const entries = [entry('open'), entry('completed'), entry('fresh')];
    const targets = [target('open', '2'), target('completed', '4')];

    expect(getRenewalCandidates(entries, targets).map((e) => e.student.id)).toEqual([
      'completed',
      'fresh',
    ]);
  });

  it('keeps 미전환 students selectable again in a later week', () => {
    const entries = [entry('dropped')];
    expect(getRenewalCandidates(entries, [target('dropped', '5')]).map((e) => e.student.id)).toEqual(
      ['dropped']
    );
  });

  it('excludes every open stage (1, 2 and 3)', () => {
    const entries = [entry('s1'), entry('s2'), entry('s3')];
    const targets = [target('s1', '1'), target('s2', '2'), target('s3', '3')];
    expect(getRenewalCandidates(entries, targets)).toEqual([]);
  });

  it('puts 재결제세일즈 students first — SRM already flagged them as out of hours', () => {
    const entries = [
      entry('plenty', { hours: hours({ remaining: 80 }) }),
      entry('needs-renewal', { displayStatus: 'sales', hours: hours({ remaining: -4 }) }),
      entry('low', { hours: hours({ remaining: 3 }) }),
    ];
    expect(getRenewalCandidates(entries, []).map((e) => e.student.id)).toEqual([
      'needs-renewal',
      'low',
      'plenty',
    ]);
  });

  it('orders by remaining hours ascending, unknown hours last', () => {
    const entries = [
      entry('unknown', { displayStatus: 'unlinked', remainingHours: null, hours: null }),
      entry('many', { hours: hours({ remaining: 40 }) }),
      entry('few', { hours: hours({ remaining: 2 }) }),
    ];
    expect(getRenewalCandidates(entries, []).map((e) => e.student.id)).toEqual([
      'few',
      'many',
      'unknown',
    ]);
  });

  it('falls back to name order when urgency ties', () => {
    const entries = [
      entry('2', { name: '홍길동', hours: hours({ remaining: 5 }) }),
      entry('1', { name: '김민수', hours: hours({ remaining: 5 }) }),
    ];
    expect(getRenewalCandidates(entries, []).map((e) => e.student.name)).toEqual([
      '김민수',
      '홍길동',
    ]);
  });

  it('does not mutate the input array', () => {
    const entries = [
      entry('b', { hours: hours({ remaining: 1 }) }),
      entry('a', { hours: hours({ remaining: 99 }) }),
    ];
    getRenewalCandidates(entries, []);
    expect(entries.map((e) => e.student.id)).toEqual(['b', 'a']);
  });
});
