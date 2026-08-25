import { render, screen, fireEvent } from '@testing-library/react';
import {
  TutoringStudentRow,
  classifyTutoringEntries,
  type TutoringRowStudent,
} from '../TutoringStudentRow';
import type { TutoringUser } from '@/app/api/admin/srm/tutoring-users/route';

function student(over: Partial<TutoringRowStudent> = {}): TutoringRowStudent {
  return {
    id: 's-1',
    name: '김학생',
    grade: '11',
    parent_phone: '010-1111-2222',
    is_vip: false,
    needs_attention: false,
    traffic_source: '소개',
    ...over,
  };
}

function tutoringUser(over: Partial<TutoringUser> = {}): TutoringUser {
  return {
    sfv2ProfileId: 'p-1',
    crmStudentId: 's-1',
    name: '김학생',
    grade: '11',
    purchasedHours: 100,
    refundedHours: 0,
    usedHours: 50,
    remainingHours: 50,
    status: 'active',
    ...over,
  } as TutoringUser;
}

describe('TutoringStudentRow', () => {
  it('renders name, grade, status badge, phone, remaining hours and traffic source', () => {
    render(
      <TutoringStudentRow student={student()} displayStatus="active" remainingHours={12} />
    );

    expect(screen.getByText('김학생')).toBeTruthy();
    expect(screen.getByText('11')).toBeTruthy();
    expect(screen.getByText('수업중')).toBeTruthy();
    expect(screen.getByText('010-1111-2222')).toBeTruthy();
    expect(screen.getByText('잔여 12h')).toBeTruthy();
    expect(screen.getByText('소개')).toBeTruthy();
  });

  it('renders the VIP badge only for VIP students', () => {
    const { unmount } = render(
      <TutoringStudentRow student={student()} displayStatus="active" remainingHours={null} />
    );
    expect(screen.queryByText('VIP')).toBeNull();
    unmount();

    render(
      <TutoringStudentRow
        student={student({ is_vip: true })}
        displayStatus="active"
        remainingHours={null}
      />
    );
    expect(screen.getByText('VIP')).toBeTruthy();
  });

  it('renders the 주의 badge only for flagged students', () => {
    const { unmount } = render(
      <TutoringStudentRow student={student()} displayStatus="active" remainingHours={null} />
    );
    expect(screen.queryByText('주의')).toBeNull();
    unmount();

    render(
      <TutoringStudentRow
        student={student({ needs_attention: true })}
        displayStatus="active"
        remainingHours={null}
      />
    );
    expect(screen.getByText('주의')).toBeTruthy();
  });

  it('omits remaining hours when unknown', () => {
    render(
      <TutoringStudentRow student={student()} displayStatus="unlinked" remainingHours={null} />
    );
    expect(screen.queryByText(/잔여/)).toBeNull();
    expect(screen.getByText('미연결')).toBeTruthy();
  });

  it('labels the 재결제세일즈 status', () => {
    render(<TutoringStudentRow student={student()} displayStatus="sales" remainingHours={0} />);
    expect(screen.getByText('재결제세일즈')).toBeTruthy();
    expect(screen.getByText('잔여 0h')).toBeTruthy();
  });

  it('renders the action slot and keeps its click from bubbling to the row', () => {
    const onClick = vi.fn();
    const onAction = vi.fn();
    render(
      <TutoringStudentRow
        student={student()}
        displayStatus="active"
        remainingHours={5}
        onClick={onClick}
        action={
          <button type="button" onClick={onAction}>
            대상 추가
          </button>
        }
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '대상 추가' }));
    expect(onAction).toHaveBeenCalledTimes(1);
    expect(onClick).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText('김학생'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe('classifyTutoringEntries', () => {
  it('marks students with no SRM match as unlinked with unknown hours', () => {
    const entries = classifyTutoringEntries([student()], []);
    expect(entries).toEqual([
      {
        student: student(),
        displayStatus: 'unlinked',
        remainingHours: null,
        hours: null,
        subjects: [],
        paymentStatus: null,
        bySubject: [],
      },
    ]);
  });

  it('carries the per-subject breakdown through for the candidate table', () => {
    const [entry] = classifyTutoringEntries(
      [student()],
      [
        tutoringUser({
          subjectBreakdown: [
            {
              subject: 'SAT', purchased: 62, completed: 22, refunded: 0,
              remaining: 40, scheduled: 22, unscheduled: 18, overscheduled: 0, paymentStatus: 'active',
            },
          ],
        }),
      ]
    );

    expect(entry.bySubject).toEqual([
      {
        subject: 'SAT', purchased: 62, completed: 22, refunded: 0,
        remaining: 40, scheduled: 22, unscheduled: 18, overscheduled: 0, paymentStatus: 'active',
      },
    ]);
  });

  it('drops students whose tutoring has ended', () => {
    const entries = classifyTutoringEntries(
      [student()],
      [tutoringUser({ status: 'ended' })]
    );
    expect(entries).toEqual([]);
  });

  it('carries the SRM status and remaining hours through', () => {
    const entries = classifyTutoringEntries(
      [student()],
      [tutoringUser({ status: 'sales', remainingHours: -3 })]
    );
    expect(entries[0].displayStatus).toBe('sales');
    expect(entries[0].remainingHours).toBe(-3);
  });

  it('carries the full payment-page hour breakdown, keeping a negative 잔여 signed', () => {
    const entries = classifyTutoringEntries(
      [student()],
      [
        tutoringUser({
          status: 'sales',
          purchasedHours: 12,
          usedHours: 15,
          refundedHours: 0,
          remainingHours: 0, // API의 0 하한 값
          netRemainingHours: -3,
          scheduledHours: 19,
          unscheduledHours: 0,
          overscheduledHours: 22,
          subjects: ['SAT'],
          paymentStatus: 'active',
        }),
      ]
    );
    expect(entries[0].hours).toEqual({
      purchased: 12,
      completed: 15,
      refunded: 0,
      remaining: -3,
      scheduled: 19,
      unscheduled: 0,
      overscheduled: 22,
    });
    expect(entries[0].subjects).toEqual(['SAT']);
    expect(entries[0].paymentStatus).toBe('active');
    // 행 표시용 값은 기존대로 0 하한을 유지한다
    expect(entries[0].remainingHours).toBe(0);
  });

  it('ignores tutoring users that are not linked to a CRM student', () => {
    const entries = classifyTutoringEntries(
      [student()],
      [tutoringUser({ crmStudentId: null, status: 'active' })]
    );
    expect(entries[0].displayStatus).toBe('unlinked');
  });
});
