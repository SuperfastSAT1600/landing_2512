import { describe, it, expect } from 'vitest';
import { expandSubjectRows, countStudents, dedupeByStudent } from '../renewal-candidate-rows';
import { filterCandidates, subjectOptions, UNSPECIFIED } from '../renewal-candidate-filters';
import type { TutoringEntry, TutoringRowStudent } from '../TutoringStudentRow';

function student(id: string, name = id): TutoringRowStudent {
  return { id, name, grade: '10th', parent_phone: '010-0000-0000', is_vip: false, needs_attention: false, traffic_source: null };
}

/** 노윤재 — SAT 62/22(예약 22), special 68/68. 학생 단위는 합산값. */
const yoonjae: TutoringEntry<TutoringRowStudent> = {
  student: student('s1', '노윤재'),
  displayStatus: 'active',
  remainingHours: 40,
  hours: {
    purchased: 130, completed: 90, refunded: 0,
    remaining: 40, scheduled: 22, unscheduled: 18, overscheduled: 0,
  },
  subjects: ['SAT', 'special'],
  paymentStatus: 'active',
  bySubject: [
    {
      subject: 'SAT', purchased: 62, completed: 22, refunded: 0,
      remaining: 40, scheduled: 22, unscheduled: 18, overscheduled: 0, paymentStatus: 'active',
    },
    {
      subject: 'special', purchased: 68, completed: 68, refunded: 0,
      remaining: 0, scheduled: 0, unscheduled: 0, overscheduled: 0, paymentStatus: 'inactive',
    },
  ],
};

/** SRM 미연결 — 과목 내역이 없다. */
const unlinked: TutoringEntry<TutoringRowStudent> = {
  student: student('s2', '김미연결'),
  displayStatus: 'unlinked',
  remainingHours: null,
  hours: null,
  subjects: [],
  paymentStatus: null,
  bySubject: [],
};

describe('expandSubjectRows', () => {
  it('과목 내역이 있으면 과목마다 한 행씩 만든다', () => {
    const rows = expandSubjectRows([yoonjae]);

    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.subject)).toEqual(['SAT', 'special']);
    expect(rows[0].hours).toMatchObject({ purchased: 62, completed: 22, remaining: 40, scheduled: 22 });
    expect(rows[1].hours).toMatchObject({ purchased: 68, completed: 68, remaining: 0 });
  });

  it('행마다 그 과목의 결제 상태를 갖는다 (학생 단위 상태로 덮지 않는다)', () => {
    const [sat, special] = expandSubjectRows([yoonjae]);

    expect(sat.paymentStatus).toBe('active');
    expect(special.paymentStatus).toBe('inactive');
  });

  it('행의 과목 배지는 그 과목 하나만 — 학생 전체 과목을 반복하지 않는다', () => {
    expect(expandSubjectRows([yoonjae]).map((r) => r.subjects)).toEqual([['SAT'], ['special']]);
  });

  it('학생 정보와 튜터링 상태는 모든 과목 행이 공유한다', () => {
    for (const row of expandSubjectRows([yoonjae])) {
      expect(row.student.name).toBe('노윤재');
      expect(row.displayStatus).toBe('active');
    }
  });

  it('과목 내역이 없으면 학생 단위 1행 그대로 (SRM 미연결)', () => {
    const rows = expandSubjectRows([unlinked]);

    expect(rows).toHaveLength(1);
    expect(rows[0].subject).toBeNull();
    expect(rows[0].hours).toBeNull();
    expect(rows[0].paymentStatus).toBeNull();
  });

  it('입력 순서를 유지한다 — 정렬은 표가 담당한다', () => {
    const rows = expandSubjectRows([yoonjae, unlinked]);
    expect(rows.map((r) => r.student.id)).toEqual(['s1', 's1', 's2']);
  });
});

describe('과목 행 + 좌측 필터', () => {
  it('과목 체크를 해제하면 그 과목 행만 사라진다', () => {
    const rows = expandSubjectRows([yoonjae]);

    const visible = filterCandidates(rows, {
      subjects: ['SAT'],
      paymentStatuses: ['active', 'inactive'],
    });

    expect(visible.map((r) => r.subject)).toEqual(['SAT']);
  });

  it('결제 상태 필터도 과목 행 단위로 걸린다', () => {
    const rows = expandSubjectRows([yoonjae]);

    const visible = filterCandidates(rows, {
      subjects: ['SAT', 'special'],
      paymentStatuses: ['inactive'],
    });

    expect(visible.map((r) => r.subject)).toEqual(['special']);
  });

  it('과목 없는 행은 미지정으로 걸러진다', () => {
    const rows = expandSubjectRows([unlinked]);

    expect(filterCandidates(rows, { subjects: [UNSPECIFIED], paymentStatuses: [UNSPECIFIED] })).toHaveLength(1);
    expect(filterCandidates(rows, { subjects: ['SAT'], paymentStatuses: [UNSPECIFIED] })).toHaveLength(0);
  });

  it('과목 옵션 카운트는 행 수 = (학생 × 과목)', () => {
    const opts = subjectOptions(expandSubjectRows([yoonjae, unlinked]));

    expect(opts).toEqual([
      { value: 'SAT', label: 'SAT', count: 1 },
      { value: 'special', label: 'Special', count: 1 },
      { value: UNSPECIFIED, label: '미지정', count: 1 },
    ]);
  });
});

describe('countStudents', () => {
  it('같은 학생의 과목 행은 한 명으로 센다', () => {
    expect(countStudents(expandSubjectRows([yoonjae, unlinked]))).toBe(2);
  });

  it('빈 목록은 0', () => {
    expect(countStudents([])).toBe(0);
  });
});

describe('dedupeByStudent', () => {
  it('학생당 첫 행만 남긴다 — 상태 카운트가 과목 수만큼 부풀지 않게', () => {
    const kept = dedupeByStudent(expandSubjectRows([yoonjae, unlinked]));

    expect(kept.map((r) => r.student.id)).toEqual(['s1', 's2']);
    expect(kept[0].subject).toBe('SAT');
  });
});
