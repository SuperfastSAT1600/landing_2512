import { render, screen, fireEvent } from '@testing-library/react';
import { RenewalCandidateTable } from '../RenewalCandidateTable';
import type { CandidateRow } from '../renewal-candidate-rows';
import type { TutoringHours, TutoringRowStudent } from '../TutoringStudentRow';

function hours(over: Partial<TutoringHours> = {}): TutoringHours {
  return {
    purchased: 20,
    completed: 10,
    refunded: 0,
    remaining: 10,
    scheduled: 4,
    unscheduled: 6,
    overscheduled: 0,
    ...over,
  };
}

function entry(
  id: string,
  over: Partial<CandidateRow> & { name?: string } = {}
): CandidateRow {
  const { name, ...rest } = over;
  return {
    student: {
      id,
      name: name ?? id,
      grade: '11th',
      parent_phone: '010-0000-0000',
      is_vip: false,
      traffic_source: null,
    },
    displayStatus: 'active',
    remainingHours: 10,
    hours: hours(),
    subjects: ['SAT'],
    paymentStatus: 'active',
    subject: null,
    bySubject: [],
    ...rest,
  };
}

/** 같은 학생의 과목 행 — expandSubjectRows가 만드는 모양. */
function subjectRow(
  id: string,
  name: string,
  subject: string,
  hoursOver: Partial<TutoringHours>,
  over: Partial<CandidateRow> = {}
): CandidateRow {
  return entry(id, {
    name,
    subject,
    subjects: [subject],
    hours: hours(hoursOver),
    ...over,
  });
}

/** 특정 학생 행의 셀 텍스트를 컬럼 순서대로 뽑는다. */
function rowCells(name: string): string[] {
  const row = screen.getByText(name).closest('tr')!;
  return [...row.querySelectorAll('td')].map((td) => td.textContent?.trim() ?? '');
}

describe('RenewalCandidateTable', () => {
  const noop = () => {};

  it('renders every payment-page metric column for a student', () => {
    render(
      <RenewalCandidateTable
        entries={[entry('s1', { name: '김학생' })]}
        onAdd={noop}
        pendingStudentId={null}
      />
    );
    for (const header of ['구매', '완료', '환불', '잔여', '예약', '미예약', '초과예약']) {
      expect(screen.getByRole('button', { name: (n) => n === header })).toBeTruthy();
    }
    const cells = rowCells('김학생');
    expect(cells).toContain('20'); // 구매
    expect(cells).toContain('10'); // 완료 / 잔여
    expect(cells).toContain('4'); // 예약
    expect(cells).toContain('6'); // 미예약
  });

  it('shows a negative 잔여 with its sign instead of clamping to zero', () => {
    render(
      <RenewalCandidateTable
        entries={[
          entry('s1', {
            name: 'Ruby Chung',
            hours: hours({ purchased: 12, completed: 15, remaining: -3, scheduled: 19, unscheduled: 0, overscheduled: 22 }),
          }),
        ]}
        onAdd={noop}
        pendingStudentId={null}
      />
    );
    expect(screen.getByTestId('cell-remaining-s1').textContent).toBe('-3');
    expect(screen.getByTestId('cell-remaining-s1').className).toContain('text-red');
    expect(screen.getByTestId('cell-overscheduled-s1').textContent).toBe('22');
  });

  it('dashes zero only in the exception columns, matching the payment page', () => {
    render(
      <RenewalCandidateTable
        entries={[
          entry('s1', {
            name: '김학생',
            hours: hours({ purchased: 20, completed: 20, refunded: 0, remaining: 0, scheduled: 0, unscheduled: 0, overscheduled: 0 }),
          }),
        ]}
        onAdd={noop}
        pendingStudentId={null}
      />
    );
    // 환불·미예약·초과예약은 0이면 '—'
    expect(screen.getByTestId('cell-refunded-s1').textContent).toBe('—');
    expect(screen.getByTestId('cell-unscheduled-s1').textContent).toBe('—');
    expect(screen.getByTestId('cell-overscheduled-s1').textContent).toBe('—');
    // 잔여·예약은 0도 숫자로 — 잔여 0h는 '지금 재결제 대상'이라는 정보다
    expect(screen.getByTestId('cell-remaining-s1').textContent).toBe('0');
    expect(screen.getByTestId('cell-scheduled-s1').textContent).toBe('0');
    expect(screen.getByTestId('cell-remaining-s1').className).toContain('text-red');
  });

  it('sorts by 초과예약 desc then 잔여 asc by default — the most urgent first', () => {
    render(
      <RenewalCandidateTable
        entries={[
          entry('calm', { name: '여유', hours: hours({ remaining: 40, overscheduled: 0 }) }),
          entry('over', { name: '초과', hours: hours({ remaining: -3, overscheduled: 22 }) }),
          entry('low', { name: '임박', hours: hours({ remaining: 1, overscheduled: 0 }) }),
        ]}
        onAdd={noop}
        pendingStudentId={null}
      />
    );
    const names = screen.getAllByTestId(/^cell-name-/).map((el) => el.textContent);
    expect(names).toEqual(['초과', '임박', '여유']);
  });

  it('re-sorts when a column header is clicked, and toggles direction', () => {
    render(
      <RenewalCandidateTable
        entries={[
          entry('a', { name: '적게', hours: hours({ purchased: 5 }) }),
          entry('b', { name: '많이', hours: hours({ purchased: 90 }) }),
        ]}
        onAdd={noop}
        pendingStudentId={null}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: (n) => n === '구매' }));
    expect(screen.getAllByTestId(/^cell-name-/).map((el) => el.textContent)).toEqual(['많이', '적게']);

    fireEvent.click(screen.getByRole('button', { name: (n) => n === '구매' }));
    expect(screen.getAllByTestId(/^cell-name-/).map((el) => el.textContent)).toEqual(['적게', '많이']);
  });

  it('puts SRM-unlinked students last and shows dashes for unknown hours', () => {
    render(
      <RenewalCandidateTable
        entries={[
          entry('unlinked', { name: '미연결', displayStatus: 'unlinked', hours: null, subjects: [], paymentStatus: null }),
          entry('known', { name: '연결', hours: hours({ remaining: 30 }) }),
        ]}
        onAdd={noop}
        pendingStudentId={null}
      />
    );
    expect(screen.getAllByTestId(/^cell-name-/).map((el) => el.textContent)).toEqual(['연결', '미연결']);
    expect(screen.getByTestId('cell-remaining-unlinked').textContent).toBe('—');
  });

  it('adds the student when 추가 is clicked', () => {
    const onAdd = vi.fn();
    render(
      <RenewalCandidateTable
        entries={[entry('s1', { name: '김학생' })]}
        onAdd={onAdd}
        pendingStudentId={null}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: '추가' }));
    expect(onAdd).toHaveBeenCalledWith('s1');
  });

  it('disables the add button while that student is pending', () => {
    render(
      <RenewalCandidateTable
        entries={[entry('s1', { name: '김학생' })]}
        onAdd={vi.fn()}
        pendingStudentId="s1"
      />
    );
    expect(screen.getByRole('button', { name: '추가' }).getAttribute('disabled')).not.toBeNull();
  });

  it('shows the VIP badge alongside the tutoring status', () => {
    render(
      <RenewalCandidateTable
        entries={[
          entry('s1', {
            name: '김학생',
            student: { id: 's1', name: '김학생', grade: '11th', parent_phone: '', is_vip: true, traffic_source: null },
            subject: 'SAT',
            subjects: ['SAT'],
            displayStatus: 'sales',
          }),
        ]}
        onAdd={noop}
        pendingStudentId={null}
      />
    );
    expect(screen.getByText('VIP')).toBeTruthy();
    expect(screen.getByText('재결제세일즈')).toBeTruthy();
    // 과목은 이름 옆이 아니라 전용 컬럼에 — V2 Payment 페이지와 같은 배치
    expect(screen.getByTestId('cell-subject-s1-SAT').textContent).toBe('SAT');
  });

  it('opens the student panel when the name is clicked', () => {
    const onSelectStudent = vi.fn();
    render(
      <RenewalCandidateTable
        entries={[entry('s1', { name: '김학생' })]}
        onAdd={noop}
        pendingStudentId={null}
        onSelectStudent={onSelectStudent}
      />
    );
    fireEvent.click(screen.getByText('김학생'));
    expect(onSelectStudent).toHaveBeenCalledWith('s1');
  });

  describe('과목별 행', () => {
    const yoonjae = [
      subjectRow('s1', '노윤재', 'SAT', {
        purchased: 62, completed: 22, remaining: 40, scheduled: 22, unscheduled: 18, overscheduled: 0,
      }),
      subjectRow('s1', '노윤재', 'special', {
        purchased: 68, completed: 68, remaining: 0, scheduled: 0, unscheduled: 0, overscheduled: 0,
      }, { paymentStatus: 'inactive' }),
    ];

    it('과목마다 행을 그리되 이름과 추가 버튼은 학생당 한 번만', () => {
      render(<RenewalCandidateTable entries={yoonjae} onAdd={noop} pendingStudentId={null} />);

      expect(document.querySelectorAll('tbody tr')).toHaveLength(2);
      expect(screen.getAllByTestId(/^cell-name-/)).toHaveLength(1);
      expect(screen.getAllByRole('button', { name: '추가' })).toHaveLength(1);
    });

    it('행마다 그 과목의 수치를 보여준다', () => {
      render(<RenewalCandidateTable entries={yoonjae} onAdd={noop} pendingStudentId={null} />);

      expect(screen.getByTestId('cell-purchased-s1-SAT').textContent).toBe('62');
      expect(screen.getByTestId('cell-completed-s1-SAT').textContent).toBe('22');
      expect(screen.getByTestId('cell-remaining-s1-SAT').textContent).toBe('40');
      expect(screen.getByTestId('cell-purchased-s1-special').textContent).toBe('68');
      expect(screen.getByTestId('cell-remaining-s1-special').textContent).toBe('0');
    });

    it('행마다 그 과목의 배지와 결제 상태를 보여준다', () => {
      render(<RenewalCandidateTable entries={yoonjae} onAdd={noop} pendingStudentId={null} />);

      expect(screen.getByText('SAT')).toBeTruthy();
      expect(screen.getByText('Special')).toBeTruthy();
      expect(screen.getByText('Active')).toBeTruthy();
      expect(screen.getByText('Inactive')).toBeTruthy();
    });

    it('추가는 어느 과목 행에서 눌러도 학생 단위로 보낸다', () => {
      const onAdd = vi.fn();
      render(<RenewalCandidateTable entries={yoonjae} onAdd={onAdd} pendingStudentId={null} />);

      fireEvent.click(screen.getByRole('button', { name: '추가' }));
      expect(onAdd).toHaveBeenCalledWith('s1');
    });

    it('그룹 순서는 학생의 가장 급한 과목 행이 정한다', () => {
      render(
        <RenewalCandidateTable
          entries={[
            subjectRow('a', '여유', 'SAT', { remaining: 30, overscheduled: 0 }),
            subjectRow('a', '여유', 'special', { remaining: 25, overscheduled: 0 }),
            subjectRow('b', '급함', 'SAT', { remaining: 50, overscheduled: 0 }),
            subjectRow('b', '급함', 'special', { remaining: -4, overscheduled: 6 }),
          ]}
          onAdd={noop}
          pendingStudentId={null}
        />
      );
      expect(screen.getAllByTestId(/^cell-name-/).map((el) => el.textContent)).toEqual(['급함', '여유']);
    });

    it('정렬을 바꿔도 같은 학생의 과목 행은 붙어 있다', () => {
      render(
        <RenewalCandidateTable
          entries={[
            subjectRow('a', '가학생', 'SAT', { purchased: 10 }),
            subjectRow('a', '가학생', 'special', { purchased: 90 }),
            subjectRow('b', '나학생', 'SAT', { purchased: 50 }),
            subjectRow('b', '나학생', 'special', { purchased: 20 }),
          ]}
          onAdd={noop}
          pendingStudentId={null}
        />
      );
      fireEvent.click(screen.getByRole('button', { name: (n) => n === '구매' }));

      const rows = [...document.querySelectorAll('tbody tr')].map((tr) => tr.getAttribute('data-student'));
      expect(rows).toEqual(['a', 'a', 'b', 'b']);
      expect(screen.getAllByTestId(/^cell-name-/).map((el) => el.textContent)).toEqual(['가학생', '나학생']);
    });

    it('과목을 전용 컬럼에 그린다 (V2 Payment 페이지와 같은 배치)', () => {
      render(<RenewalCandidateTable entries={yoonjae} onAdd={noop} pendingStudentId={null} />);

      expect(screen.getByRole('columnheader', { name: '과목' })).toBeTruthy();
      expect(screen.getByTestId('cell-subject-s1-SAT').textContent).toBe('SAT');
      expect(screen.getByTestId('cell-subject-s1-special').textContent).toBe('Special');
    });

    it('과목 내역이 없는 행은 과목 칸이 비어 있다', () => {
      render(
        <RenewalCandidateTable
          entries={[entry('u1', { name: '미연결', hours: null, subjects: [], paymentStatus: null })]}
          onAdd={noop}
          pendingStudentId={null}
        />
      );
      expect(screen.getByTestId('cell-subject-u1').textContent).toBe('—');
    });

    it('한 학생 안에서는 SAT → AP → special 순으로 그린다', () => {
      render(
        <RenewalCandidateTable
          entries={[
            subjectRow('s1', '노윤재', 'special', { remaining: 0 }),
            subjectRow('s1', '노윤재', 'AP', { remaining: 12 }),
            subjectRow('s1', '노윤재', 'SAT', { remaining: 40 }),
          ]}
          onAdd={noop}
          pendingStudentId={null}
        />
      );
      const order = [...document.querySelectorAll('tbody tr')].map(
        (tr) => tr.querySelector('[data-testid^="cell-subject-"]')?.textContent
      );
      expect(order).toEqual(['SAT', 'AP', 'Special']);
    });

    it('그룹 첫 행(=이름·추가 버튼)은 과목 순서상 첫 과목이 갖는다', () => {
      render(<RenewalCandidateTable entries={yoonjae} onAdd={noop} pendingStudentId={null} />);

      const firstRow = document.querySelector('tbody tr')!;
      expect(firstRow.querySelector('[data-testid="cell-name-s1"]')?.textContent).toBe('노윤재');
      expect(firstRow.querySelector('[data-testid="cell-subject-s1-SAT"]')).toBeTruthy();
    });
  });
});
