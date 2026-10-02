// SFv2 시간 집계 — 구매·환불·완료·예약 시간을 학생(profile_id) 단위와 (학생 × 과목) 단위로 모은다.
// 함수는 iad1, DB는 한국 리전이라 왕복 한 번이 수백 ms다. 모든 테이블을 동시에 읽고,
// 테이블 안의 페이지도 scanAllPages로 동시에 받는다(순차 페이지네이션 대비 왕복 약 30회 → 2회).
import { supabaseSFv2 } from '@/lib/supabase-sfv2';
import { scanAllPages } from '@/lib/supabase-scan';
import type { SubjectKey } from '@/lib/tutoring-subject-breakdown';

/** 학생 → 과목 → 시간. 과목 행(V2 Payment 페이지 단위)을 만들기 위한 이중 집계. */
type HoursBySubject = Map<string, Map<SubjectKey, number>>;

function addSubjectHours(target: HoursBySubject, ownerId: string, subject: SubjectKey, hours: number) {
  const bySubject = target.get(ownerId) ?? new Map<SubjectKey, number>();
  bySubject.set(subject, (bySubject.get(subject) ?? 0) + hours);
  target.set(ownerId, bySubject);
}

const SCHEDULED_STATUSES = ['approved', 'awaiting_confirmation'];

type TxRow = { student_id: string | null; hours: number; created_at: string; subject: string | null };
type RefundRow = { payment_id: string; hours_refunded: number };
type PaymentRow = { id: string; student_id: string | null; subject: string | null; management_status: string | null };
type EventRow = { id: string; starts_at: string; ends_at: string; status: string; matching_id: string | null };
type ParticipantRow = { event_id: string; user_id: string };

/** 시간 집계에 필요한 SFv2 원본 행 — 서로 독립이라 한 번에 동시에 읽는다. */
async function fetchRawRows() {
  const [payments, transactions, refunds, matchings, events, participants] = await Promise.all([
    // 결제 관리 상태(route의 상태 분류)와 환불 → 결제 매핑에 함께 쓴다.
    scanAllPages<PaymentRow>((f, t, c) =>
      supabaseSFv2.from('payments')
        .select('id, student_id, subject, management_status', c)
        .order('id').range(f, t)
    ),
    scanAllPages<TxRow>((f, t, c) =>
      supabaseSFv2.from('payment_transactions')
        .select('student_id, hours, created_at, subject', c)
        .gt('hours', 0).order('id').range(f, t)
    ),
    scanAllPages<RefundRow>((f, t, c) =>
      supabaseSFv2.from('payment_refunds')
        .select('hours_refunded, payment_id', c)
        .order('id').range(f, t)
    ),
    // 수업의 과목은 매칭이 갖고 있다 (scheduled_events → matchings.subject).
    scanAllPages<{ id: string; subject: string | null }>((f, t, c) =>
      supabaseSFv2.from('matchings').select('id, subject', c).order('id').range(f, t)
    ),
    scanAllPages<EventRow>((f, t, c) =>
      supabaseSFv2.from('scheduled_events')
        .select('id, starts_at, ends_at, status, matching_id', c)
        .in('status', ['completed', ...SCHEDULED_STATUSES])
        .eq('category', 'coach_room')
        .order('id').range(f, t)
    ),
    // 참가자 테이블엔 id가 없다 — (event_id, user_id)로 정렬해 페이지 경계를 고정한다.
    scanAllPages<ParticipantRow>((f, t, c) =>
      supabaseSFv2.from('scheduled_event_participants')
        .select('event_id, user_id', c)
        .order('event_id').order('user_id').range(f, t)
    ),
  ]);
  return { payments, transactions, refunds, matchings, events, participants };
}

// 1. 구매 시간 + 최근 결제일: payment_transactions.hours by student_id (과목은 transaction.subject)
function foldPurchased(rows: TxRow[]) {
  const purchased = new Map<string, number>();
  const purchasedBySubject: HoursBySubject = new Map();
  const lastPurchaseDate = new Map<string, string>();
  for (const row of rows) {
    if (!row.student_id) continue;
    purchased.set(row.student_id, (purchased.get(row.student_id) ?? 0) + (row.hours ?? 0));
    addSubjectHours(purchasedBySubject, row.student_id, row.subject, row.hours ?? 0);
    const prev = lastPurchaseDate.get(row.student_id);
    if (!prev || row.created_at > prev) lastPurchaseDate.set(row.student_id, row.created_at);
  }
  return { purchased, purchasedBySubject, lastPurchaseDate };
}

// 2. 환불 시간: payment_refunds.hours_refunded → payments.student_id
function foldRefunded(refunds: RefundRow[], payments: PaymentRow[]) {
  const refunded = new Map<string, number>();
  const refundedBySubject: HoursBySubject = new Map();
  const paymentOwner = new Map(payments.map((p) => [p.id, p]));
  for (const row of refunds) {
    const payment = paymentOwner.get(row.payment_id);
    if (!payment?.student_id) continue;
    refunded.set(payment.student_id, (refunded.get(payment.student_id) ?? 0) + (row.hours_refunded ?? 0));
    addSubjectHours(refundedBySubject, payment.student_id, payment.subject, row.hours_refunded ?? 0);
  }
  return { refunded, refundedBySubject };
}

// 3. 세션 시간 by user_id — 완료(used) / 예약 대기(scheduled) + 최근 세션일.
function foldSessions(
  matchings: { id: string; subject: string | null }[],
  events: EventRow[],
  participants: ParticipantRow[]
) {
  const used = new Map<string, number>();
  const scheduled = new Map<string, number>();
  const usedBySubject: HoursBySubject = new Map();
  const scheduledBySubject: HoursBySubject = new Map();
  const lastSessionDate = new Map<string, string>();

  const matchingSubject = new Map(matchings.map((m) => [m.id, m.subject]));
  const eventMeta = new Map<string, { duration: number; startsAt: string; completed: boolean; subject: SubjectKey }>();
  for (const e of events) {
    eventMeta.set(e.id, {
      duration: (new Date(e.ends_at).getTime() - new Date(e.starts_at).getTime()) / 3_600_000,
      startsAt: e.starts_at,
      completed: e.status === 'completed',
      subject: e.matching_id ? matchingSubject.get(e.matching_id) ?? null : null,
    });
  }

  for (const p of participants) {
    const meta = eventMeta.get(p.event_id);
    if (!meta) continue;
    if (!meta.completed) {
      scheduled.set(p.user_id, (scheduled.get(p.user_id) ?? 0) + meta.duration);
      addSubjectHours(scheduledBySubject, p.user_id, meta.subject, meta.duration);
      continue;
    }
    used.set(p.user_id, (used.get(p.user_id) ?? 0) + meta.duration);
    addSubjectHours(usedBySubject, p.user_id, meta.subject, meta.duration);
    const prev = lastSessionDate.get(p.user_id);
    if (!prev || meta.startsAt > prev) lastSessionDate.set(p.user_id, meta.startsAt);
  }
  return { used, scheduled, usedBySubject, scheduledBySubject, lastSessionDate };
}

/** SFv2 결제 행과 시간 집계. 결제 행은 route가 관리 상태 분류에 다시 쓴다. */
export async function fetchV2Data() {
  const raw = await fetchRawRows();
  return {
    payments: raw.payments,
    ...foldPurchased(raw.transactions),
    ...foldRefunded(raw.refunds, raw.payments),
    ...foldSessions(raw.matchings, raw.events, raw.participants),
  };
}
