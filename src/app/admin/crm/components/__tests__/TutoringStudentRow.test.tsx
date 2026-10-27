import { render, screen, fireEvent } from '@testing-library/react';
import {
  TutoringStudentRow,
  classifyTutoringEntries,
  countByTutoringStatus,
  TUTORING_SUB_TABS,
  type TutoringRowStudent,
} from '../TutoringStudentRow';
import { buildTutoringByStudentId } from '../renewal-board/renewal-board-utils';
import { expandSubjectRows } from '../renewal-candidate-rows';
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
    expect(screen.getByText('재원')).toBeTruthy();
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

  it('처리 대기 시간이 있으면 잔여 옆에 작게 알려 준다', () => {
    render(
      <TutoringStudentRow student={student()} displayStatus="active" remainingHours={6} heldHours={2} />
    );
    expect(screen.getByText('잔여 6h')).toBeTruthy();
    expect(screen.getByText('처리 대기 2h').getAttribute('title')).toContain('SRM 완료 처리');
  });

  it('처리 대기가 없으면 표시하지 않는다', () => {
    render(<TutoringStudentRow student={student()} displayStatus="active" remainingHours={6} heldHours={0} />);
    expect(screen.queryByText(/처리 대기/)).toBeNull();
  });

  it('omits remaining hours when unknown', () => {
    render(
      <TutoringStudentRow student={student()} displayStatus="active" remainingHours={null} />
    );
    // 잔여만 감춘다. '미연결'은 행 배지가 아니라 하위 탭(isCrmLinked 기반)이다.
    expect(screen.queryByText(/잔여/)).toBeNull();
    expect(screen.queryByText('미연결')).toBeNull();
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
  // 학생 소스가 CRM(enrolled)에서 SRM 라이프사이클(linked)로 바뀌었다.
  // enrolled 인자는 하위 호환으로 남아 있을 뿐 더는 행을 만들지 않는다.
  it('SRM 목록이 비면 CRM 학생이 있어도 행을 만들지 않는다', () => {
    expect(classifyTutoringEntries([student()], [])).toEqual([]);
  });

  it('carries the per-subject breakdown through for the candidate table', () => {
    const [entry] = classifyTutoringEntries(
      [student()],
      [
        tutoringUser({
          subjectBreakdown: [
            {
              subject: 'SAT', purchased: 62, completed: 22, refunded: 0,
              remaining: 40, scheduled: 22, unscheduled: 18, overscheduled: 0, held: 0, paymentStatus: 'active',
            },
          ],
        }),
      ]
    );

    expect(entry.bySubject).toEqual([
      {
        subject: 'SAT', purchased: 62, completed: 22, refunded: 0,
        remaining: 40, scheduled: 22, unscheduled: 18, overscheduled: 0, held: 0, paymentStatus: 'active',
      },
    ]);
  });

  // 종료·미분류 제외는 API(/api/admin/srm/tutoring-users)가 맡는다.
  // 여기서 또 걸러내면 '종료'·'미분류' 하위 탭이 영원히 비게 된다.
  it('종료 상태도 그대로 통과시킨다 — 제외는 API 몫이다', () => {
    const entries = classifyTutoringEntries([student()], [tutoringUser({ status: 'ended' })]);
    expect(entries).toHaveLength(1);
    expect(entries[0].displayStatus).toBe('ended');
  });

  it('carries the SRM status and remaining hours through', () => {
    const entries = classifyTutoringEntries(
      [student()],
      [tutoringUser({ status: 'sales', remainingHours: 4, netRemainingHours: 4 })]
    );
    expect(entries[0].displayStatus).toBe('sales');
    expect(entries[0].remainingHours).toBe(4);
    expect(entries[0].heldHours).toBe(0);
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

  it('과목별 처리 대기 합을 완료로 옮기고 잔여·예약에서 뺀다 — 학생 카드·후보 표·보드 카드와 같은 기준', () => {
    const sub = (subject: string, held: number) => ({
      subject, purchased: 0, completed: 0, refunded: 0, remaining: 0,
      scheduled: 0, unscheduled: 0, overscheduled: 0, held, paymentStatus: 'active' as const,
    });
    const [entry] = classifyTutoringEntries(
      [student()],
      [
        tutoringUser({
          purchasedHours: 80, usedHours: 72, refundedHours: 0,
          remainingHours: 8, netRemainingHours: 8,
          scheduledHours: 6, unscheduledHours: 2, overscheduledHours: 0,
          subjectBreakdown: [sub('SAT', 1.5), sub('AP', 0.5)],
        }),
      ]
    );
    expect(entry.heldHours).toBe(2);
    expect(entry.hours).toEqual({
      purchased: 80, completed: 74, refunded: 0,
      remaining: 6, scheduled: 4, unscheduled: 2, overscheduled: 0,
    });
    expect(entry.remainingHours).toBe(6);
  });

  it('처리 대기가 잔여보다 크면 행 표시용 잔여는 0 하한, 전체 수치는 음수 유지', () => {
    const [entry] = classifyTutoringEntries(
      [student()],
      [
        tutoringUser({
          remainingHours: 1, netRemainingHours: 1, scheduledHours: 4,
          subjectBreakdown: [{
            subject: 'SAT', purchased: 0, completed: 0, refunded: 0, remaining: 0,
            scheduled: 0, unscheduled: 0, overscheduled: 0, held: 3, paymentStatus: 'active',
          }],
        }),
      ]
    );
    expect(entry.hours?.remaining).toBe(-2);
    expect(entry.remainingHours).toBe(0);
  });

  // CRM 미연결 SFv2 계정도 목록에 남긴다 — '미연결' 탭에서 연결 작업을 해야 하기 때문.
  // 미연결 여부는 displayStatus 가 아니라 isCrmLinked 로 표현한다(라이프사이클 축과 별개).
  it('CRM 미연결 계정은 isCrmLinked=false 로 남기고 라이프사이클 상태는 보존한다', () => {
    const entries = classifyTutoringEntries(
      [student()],
      [tutoringUser({ crmStudentId: null, status: 'active' })]
    );
    expect(entries[0].isCrmLinked).toBe(false);
    expect(entries[0].displayStatus).toBe('active');
  });
});


describe('하위 탭 구성', () => {
  it('부분종료는 없고, 미연결·미분류·종료가 있다', () => {
    expect(TUTORING_SUB_TABS.map((t) => t.key)).toEqual([
      'all', 'unlinked', 'onboarding', 'active', 'paused', 'unclassified', 'ended',
    ]);
    expect(TUTORING_SUB_TABS.some((t) => t.label === '부분종료')).toBe(false);
  });

  it('카운트는 CRM 미연결을 라이프사이클 상태와 배타적으로 센다', () => {
    const counts = countByTutoringStatus([
      { displayStatus: 'active', isCrmLinked: true },
      { displayStatus: 'paused', isCrmLinked: true },
      { displayStatus: 'active', isCrmLinked: false }, // 미연결 → unlinked 로만 센다
    ]);
    expect(Object.keys(counts).sort()).toEqual(
      ['active', 'all', 'ended', 'onboarding', 'paused', 'sales', 'unclassified', 'unlinked']
    );
    expect(counts.all).toBe(3);
    expect(counts.unlinked).toBe(1);
    expect(counts.active).toBe(1); // 미연결 건은 active 에 중복 계상되지 않는다
  });
});

// 처리 대기 차감은 classifyTutoringEntries 한 곳에서만 — 보드 카드·후보 표가 다시 빼면 안 된다.
describe('처리 대기 차감은 한 번만', () => {
  const [entry] = classifyTutoringEntries([], [
    tutoringUser({
      purchasedHours: 80, usedHours: 72, refundedHours: 0,
      remainingHours: 8, netRemainingHours: 8,
      scheduledHours: 6, unscheduledHours: 2, overscheduledHours: 0,
      subjectBreakdown: [{
        subject: 'SAT', purchased: 80, completed: 72, refunded: 0, remaining: 8,
        scheduled: 6, unscheduled: 2, overscheduled: 0, held: 2, paymentStatus: 'active',
      }],
    }),
  ]);

  it('보드 카드: 잔여 6h · 예약 4h · 처리 대기 2h', () => {
    const card = buildTutoringByStudentId([entry as never]).get('s-1');
    expect(card).toMatchObject({ remainingHours: 6, scheduledHours: 4, heldHours: 2 });
  });

  it('후보 표 과목 행: 완료 74 · 잔여 6 · 예약 4', () => {
    const [row] = expandSubjectRows([entry]);
    expect(row.hours).toMatchObject({ completed: 74, remaining: 6, scheduled: 4 });
    expect(row.heldHours).toBe(2);
  });
});
