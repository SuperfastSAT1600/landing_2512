// 코치룸 시간 장부 — SRM 관리자 Payment 상세(superfastsat app/src/app/actions/payments/queries.ts
// getSubjectAccountDetail)와 같은 계산. 과목별로 구매·환불·완료·예약을 모으고 잔여를 낸다.
// 순수 함수(I/O 없음). 조회는 /api/crm/students/[id]/coach-room이 한다.

export type CoachLessonStatus = 'pending' | 'scheduled' | 'completed';

export interface LedgerInput {
  transactions: { subject: string | null; hours: number | string; paid_at: string | null; product: string | null }[];
  payments: { id: string; subject: string | null; management_status: string | null }[];
  refunds: { payment_id: string; hours_refunded: number | string; refunded_at: string; reason: string | null }[];
  /** 과목은 매칭(matchings.subject)에서 온다. status는 scheduled_events 원본 값 */
  lessons: { id: string; subject: string | null; starts_at: string; ends_at: string; status: string; teacher: string | null }[];
}

export interface CoachLesson {
  id: string;
  startsAt: string;
  endsAt: string;
  hours: number;
  teacher: string | null;
  status: CoachLessonStatus;
  /** 완료 수업이면 이 수업까지의 누적 진행 시간, 아니면 null */
  cumulativeCompleted: number | null;
}

export interface CoachSubjectLedger {
  subject: string;
  managementStatus: string | null;
  totals: { purchased: number; refunded: number; completed: number; remaining: number; scheduled: number; unscheduled: number };
  lessons: CoachLesson[]; // 최신순
  transactions: { paidAt: string | null; hours: number; product: string | null }[]; // 최신순
  refunds: { refundedAt: string; hours: number; reason: string | null }[];
}

const STATUS: Record<string, CoachLessonStatus> = { awaiting_confirmation: 'pending', approved: 'scheduled', completed: 'completed' };
const SUBJECT_ORDER = ['SAT', 'AP', 'special'];
/** 매칭에 과목이 없는 수업. SRM Payment 화면은 이 수업을 빼므로 잔여 계산엔 영향이 없지만, 놓치지 않게 따로 보여 준다 */
export const UNASSIGNED_SUBJECT = '과목 미지정';
const round1 = (n: number) => Math.round(n * 10) / 10;
const time = (iso: string | null) => (iso ? new Date(iso).getTime() : 0);
const desc = (a: string | null, b: string | null) => time(b) - time(a);

function lessonsOf(rows: LedgerInput['lessons']): CoachLesson[] {
  const lessons = rows
    .filter((r) => r.status in STATUS)
    .map((r) => ({
      id: r.id, startsAt: r.starts_at, endsAt: r.ends_at, teacher: r.teacher,
      hours: (new Date(r.ends_at).getTime() - new Date(r.starts_at).getTime()) / 3_600_000, // 반올림은 합계에서만(SRM과 같음)
      status: STATUS[r.status], cumulativeCompleted: null as number | null,
    }))
    .sort((a, b) => time(a.startsAt) - time(b.startsAt));
  let done = 0;
  for (const l of lessons) if (l.status === 'completed') { done += l.hours; l.cumulativeCompleted = round1(done); }
  return lessons.reverse();
}

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
    const lessons = lessonsOf(lessonRows.filter((l) => l.subject === subject));

    const purchased = round1(transactions.reduce((s, t) => s + t.hours, 0));
    const refunded = round1(refunds.reduce((s, r) => s + r.hours, 0));
    const completed = round1(lessons.filter((l) => l.status === 'completed').reduce((s, l) => s + l.hours, 0));
    const scheduled = round1(lessons.filter((l) => l.status !== 'completed').reduce((s, l) => s + l.hours, 0));
    const remaining = round1(purchased - refunded - completed);
    return {
      subject,
      managementStatus: input.payments.find((p) => p.subject === subject)?.management_status ?? null,
      totals: { purchased, refunded, completed, remaining, scheduled, unscheduled: round1(remaining - scheduled) },
      lessons, transactions, refunds,
    };
  });

  const rank = (s: string) => { const i = SUBJECT_ORDER.indexOf(s); return i < 0 ? SUBJECT_ORDER.length : i; };
  return out.sort((a, b) => rank(a.subject) - rank(b.subject) || a.subject.localeCompare(b.subject));
}
