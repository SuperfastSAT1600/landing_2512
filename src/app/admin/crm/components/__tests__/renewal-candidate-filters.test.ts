import {
  UNSPECIFIED,
  defaultCandidateFilters,
  filterCandidates,
  isAllSelected,
  paymentStatusOptions,
  subjectOptions,
} from '../renewal-candidate-filters';
import type { TutoringEntry, TutoringRowStudent } from '../TutoringStudentRow';

function entry(
  id: string,
  subjects: string[],
  paymentStatus: TutoringEntry<TutoringRowStudent>['paymentStatus']
): TutoringEntry<TutoringRowStudent> {
  return {
    student: {
      id,
      name: id,
      grade: '11th',
      parent_phone: '',
      is_vip: false,
      traffic_source: null,
    },
    displayStatus: 'active',
    remainingHours: 0,
    hours: null,
    subjects,
    paymentStatus,
    bySubject: [],
  };
}

const SAMPLE = [
  entry('sat-active', ['SAT'], 'active'),
  entry('sat-inactive', ['SAT'], 'inactive'),
  entry('ap-sat-paused', ['AP', 'SAT'], 'paused'),
  entry('special-excluded', ['special'], 'excluded'),
  entry('onboarding', ['SAT'], 'onboarding'),
  entry('unlinked', [], null),
];

describe('subjectOptions', () => {
  it('orders options like the payment page and labels special as Special', () => {
    expect(subjectOptions(SAMPLE).map((o) => [o.label, o.count])).toEqual([
      ['SAT', 4],
      ['AP', 1],
      ['Special', 1],
      ['미지정', 1],
    ]);
  });

  it('counts a multi-subject student under each of their subjects', () => {
    const opts = subjectOptions([entry('multi', ['AP', 'SAT'], 'active')]);
    expect(opts.map((o) => [o.value, o.count])).toEqual([
      ['SAT', 1],
      ['AP', 1],
    ]);
  });

  it('omits the 미지정 option when every student has a subject', () => {
    const opts = subjectOptions([entry('a', ['SAT'], 'active')]);
    expect(opts.some((o) => o.value === UNSPECIFIED)).toBe(false);
  });
});

describe('paymentStatusOptions', () => {
  it('orders statuses like the payment page', () => {
    expect(paymentStatusOptions(SAMPLE).map((o) => [o.label, o.count])).toEqual([
      ['Onboarding', 1],
      ['Active', 1],
      ['Paused', 1],
      ['Inactive', 1],
      ['Excluded', 1],
      ['미지정', 1],
    ]);
  });
});

describe('defaultCandidateFilters', () => {
  it('starts with everything checked — renewal targets are mostly Inactive payments', () => {
    const filters = defaultCandidateFilters(SAMPLE);
    expect(filters.paymentStatuses).toContain('inactive');
    expect(filters.paymentStatuses).toContain('excluded');
    expect(filterCandidates(SAMPLE, filters)).toHaveLength(SAMPLE.length);
  });
});

describe('filterCandidates', () => {
  const all = defaultCandidateFilters(SAMPLE);

  it('keeps only the checked subjects', () => {
    const result = filterCandidates(SAMPLE, { ...all, subjects: ['special'] });
    expect(result.map((e) => e.student.id)).toEqual(['special-excluded']);
  });

  it('keeps a multi-subject student when any one of their subjects is checked', () => {
    const result = filterCandidates(SAMPLE, { ...all, subjects: ['AP'] });
    expect(result.map((e) => e.student.id)).toEqual(['ap-sat-paused']);
  });

  it('keeps only the checked payment statuses', () => {
    const result = filterCandidates(SAMPLE, { ...all, paymentStatuses: ['inactive'] });
    expect(result.map((e) => e.student.id)).toEqual(['sat-inactive']);
  });

  it('applies subject and status together', () => {
    const result = filterCandidates(SAMPLE, {
      subjects: ['SAT'],
      paymentStatuses: ['active', 'onboarding'],
    });
    expect(result.map((e) => e.student.id)).toEqual(['sat-active', 'onboarding']);
  });

  it('includes students with no subject only when 미지정 is checked', () => {
    const withNone = filterCandidates(SAMPLE, { ...all, subjects: [UNSPECIFIED] });
    expect(withNone.map((e) => e.student.id)).toEqual(['unlinked']);

    const withoutNone = filterCandidates(SAMPLE, { ...all, subjects: ['SAT', 'AP', 'special'] });
    expect(withoutNone.some((e) => e.student.id === 'unlinked')).toBe(false);
  });

  it('includes students with no payment status only when 미지정 is checked', () => {
    const result = filterCandidates(SAMPLE, { ...all, paymentStatuses: [UNSPECIFIED] });
    expect(result.map((e) => e.student.id)).toEqual(['unlinked']);
  });

  it('returns nothing when a group is fully unchecked', () => {
    expect(filterCandidates(SAMPLE, { ...all, subjects: [] })).toEqual([]);
    expect(filterCandidates(SAMPLE, { ...all, paymentStatuses: [] })).toEqual([]);
  });

  it('does not mutate the input array', () => {
    const before = SAMPLE.map((e) => e.student.id);
    filterCandidates(SAMPLE, { ...all, subjects: ['SAT'] });
    expect(SAMPLE.map((e) => e.student.id)).toEqual(before);
  });
});

describe('isAllSelected', () => {
  it('is true only when every option is checked', () => {
    const opts = subjectOptions(SAMPLE);
    expect(isAllSelected(opts, opts.map((o) => o.value))).toBe(true);
    expect(isAllSelected(opts, ['SAT'])).toBe(false);
    expect(isAllSelected([], [])).toBe(false);
  });
});
