import { render, screen, fireEvent } from '@testing-library/react';
import { RenewalCandidateTable } from '../RenewalCandidateTable';
import type { TutoringEntry, TutoringHours, TutoringRowStudent } from '../TutoringStudentRow';

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
  over: Partial<TutoringEntry<TutoringRowStudent>> & { name?: string } = {}
): TutoringEntry<TutoringRowStudent> {
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
    ...rest,
  };
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

  it('shows the subject and VIP badges alongside the tutoring status', () => {
    render(
      <RenewalCandidateTable
        entries={[
          entry('s1', {
            name: '김학생',
            student: { id: 's1', name: '김학생', grade: '11th', parent_phone: '', is_vip: true, traffic_source: null },
            subjects: ['AP', 'SAT'],
            displayStatus: 'sales',
          }),
        ]}
        onAdd={noop}
        pendingStudentId={null}
      />
    );
    expect(screen.getByText('VIP')).toBeTruthy();
    expect(screen.getByText('SAT')).toBeTruthy();
    expect(screen.getByText('AP')).toBeTruthy();
    expect(screen.getByText('재결제세일즈')).toBeTruthy();
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
});
