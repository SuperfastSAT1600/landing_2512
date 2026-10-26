// 코치룸 시간 장부 — SRM 관리자 Payment 상세(superfastsat app/src/app/actions/payments/queries.ts
// getSubjectAccountDetail)와 같은 계산. 과목별로 구매·환불·완료·예약을 모으고 잔여를 낸다.
// 순수 함수(I/O 없음). 조회는 /api/crm/students/[id]/coach-room이 한다.
// SRM 기준 값(completed·remaining)에 더해, 지난 '예정' 수업을 접속 기록으로 나눠 실제 진행·실제 잔여를 낸다.
import { attendanceHeld, closeOpenSessions, isPastLesson, togetherMinutes, type RoomSession } from '@/lib/coach-room-attendance';

/**
 * completed: SRM 완료 처리됨 · held: 지난 수업, 접속 확인(완료 처리 대기) · unverified: 지난 수업, 접속 기록 부족(확인 필요)
 * scheduled: 다가올 수업(승인) · pending: 다가올 수업(확인 대기)
 */
export type CoachLessonStatus = 'pending' | 'scheduled' | 'completed' | 'held' | 'unverified';

export interface LedgerInput {
  transactions: { subject: string | null; hours: number | string; paid_at: string | null; product: string | null }[];
  payments: { id: string; subject: string | null; management_status: string | null }[];
  refunds: { payment_id: string; hours_refunded: number | string; refunded_at: string; reason: string | null }[];
  /** 과목은 매칭(matchings.subject)에서 온다. status는 scheduled_events 원본 값 */
  lessons: { id: string; subject: string | null; matching_id: string; starts_at: string; ends_at: string; status: string; teacher: string | null }[];
  /** 코치룸 입퇴장 기록(coach_room_session) */
  sessions: RoomSession[];
  /** 지난 수업/다가올 수업을 가르는 기준 시각(ISO) */
  now: string;
}

export interface CoachLesson {
  id: string;
  startsAt: string;
  endsAt: string;
  hours: number;
  teacher: string | null;
  status: CoachLessonStatus;
  /** 실제 진행(completed·held) 수업이면 이 수업까지의 누적 진행 시간, 아니면 null */
  cumulative: number | null;
  /** 지난 수업이면 코치·학생이 함께 접속해 있던 분, 다가올 수업이면 null */
  togetherMinutes: number | null;
}

export interface CoachSubjectLedger {
  subject: string;
  managementStatus: string | null;
  totals: {
    /** SRM Payment 화면과 같은 값 */
    purchased: number; refunded: number; completed: number; remaining: number; scheduled: number; unscheduled: number;
    /** 접속 기록 반영 */
    held: number; unverified: number; upcoming: number; actualCompleted: number; actualRemaining: number;
  };
  lessons: CoachLesson[]; // 최신순
  transactions: { paidAt: string | null; hours: number; product: string | null }[]; // 최신순
  refunds: { refundedAt: string; hours: number; reason: string | null }[];
}

const STATUS: Record<string, CoachLessonStatus> = { awaiting_confirmation: 'pending', approved: 'scheduled', completed: 'completed' };
const ACTUAL = new Set<CoachLessonStatus>(['completed', 'held']);
const SUBJECT_ORDER = ['SAT', 'AP', 'special'];
/** 매칭에 과목이 없는 수업. SRM Payment 화면은 이 수업을 빼므로 잔여 계산엔 영향이 없지만, 놓치지 않게 따로 보여 준다 */
export const UNASSIGNED_SUBJECT = '과목 미지정';
const round1 = (n: number) => Math.round(n * 10) / 10;
const time = (iso: string | null) => (iso ? new Date(iso).getTime() : 0);
const desc = (a: string | null, b: string | null) => time(b) - time(a);

function lessonsOf(rows: LedgerInput['lessons'], sessions: RoomSession[], now: number): CoachLesson[] {
  const lessons = rows
    .filter((r) => r.status in STATUS)
    .map((r): CoachLesson => {
      const minutes = (time(r.ends_at) - time(r.starts_at)) / 60_000;
      const past = isPastLesson(r.ends_at, now);
      const together = past ? togetherMinutes({ matchingId: r.matching_id, startsAt: r.starts_at, endsAt: r.ends_at }, sessions) : null;
      let status = STATUS[r.status];
      if (status !== 'completed' && past) status = attendanceHeld(together ?? 0, minutes) ? 'held' : 'unverified';
      return {
        id: r.id, startsAt: r.starts_at, endsAt: r.ends_at, teacher: r.teacher,
        hours: minutes / 60, // 반올림은 합계에서만(SRM과 같음)
        status, cumulative: null, togetherMinutes: together,
      };
    })
    .sort((a, b) => time(a.startsAt) - time(b.startsAt));
  let done = 0;
  for (const l of lessons) if (ACTUAL.has(l.status)) { done += l.hours; l.cumulative = round1(done); }
  return lessons.reverse();
}

const sumHours = (lessons: CoachLesson[], pick: (l: CoachLesson) => boolean) => round1(lessons.filter(pick).reduce((s, l) => s + l.hours, 0));

export function buildCoachRoomLedger(input: LedgerInput): CoachSubjectLedger[] {
  const subjects = new Set<string>();
  const lessonRows = input.lessons.map((l) => ({ ...l, subject: l.subject ?? UNASSIGNED_SUBJECT }));
  for (const r of [...input.transactions, ...input.payments, ...lessonRows]) if (r.subject) subjects.add(r.subject);
  const paymentSubject = new Map(input.payments.map((p) => [p.id, p.subject]));

  const out: CoachSubjectLedger[] = [...subjects].map((subject) => {
    const transactions = input.transactions
      .filter((t) => t.subject === subject)
      .map((t) => ({ paidAt: t.paid_at, hours: Number(t.hours), product: t.product }))
      .sort((a, b) => desc(a.paidAt, b.paidAt));
    const refunds = input.refunds
      .filter((r) => paymentSubject.get(r.payment_id) === subject)
      .map((r) => ({ refundedAt: r.refunded_at, hours: Number(r.hours_refunded), reason: r.reason }))
      .sort((a, b) => desc(a.refundedAt, b.refundedAt));
    const lessons = lessonsOf(lessonRows.filter((l) => l.subject === subject), closeOpenSessions(input.sessions, input.now), time(input.now));

    const purchased = round1(transactions.reduce((s, t) => s + t.hours, 0));
    const refunded = round1(refunds.reduce((s, r) => s + r.hours, 0));
    const completed = sumHours(lessons, (l) => l.status === 'completed');
    const scheduled = sumHours(lessons, (l) => l.status !== 'completed'); // SRM: 완료 아닌 수업 전부
    const remaining = round1(purchased - refunded - completed);
    const held = sumHours(lessons, (l) => l.status === 'held');
    const unverified = sumHours(lessons, (l) => l.status === 'unverified');
    const upcoming = sumHours(lessons, (l) => l.status === 'scheduled' || l.status === 'pending');
    return {
      subject,
      managementStatus: input.payments.find((p) => p.subject === subject)?.management_status ?? null,
      totals: {
        purchased, refunded, completed, remaining, scheduled, unscheduled: round1(remaining - scheduled),
        held, unverified, upcoming, actualCompleted: round1(completed + held), actualRemaining: round1(remaining - held),
      },
      lessons, transactions, refunds,
    };
  });

  const rank = (s: string) => { const i = SUBJECT_ORDER.indexOf(s); return i < 0 ? SUBJECT_ORDER.length : i; };
  return out.sort((a, b) => rank(a.subject) - rank(b.subject) || a.subject.localeCompare(b.subject));
}
