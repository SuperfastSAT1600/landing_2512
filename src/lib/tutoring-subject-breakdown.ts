/**
 * 과목별 수업 시간 집계 — 플랫폼 V2 Payment 페이지가 (학생 × 과목) 한 행으로 보여주는 수치와 같은 정의.
 *
 * SFv2에서 과목 귀속 경로는 소스마다 다르다:
 *   구매 = payment_transactions.subject
 *   환불 = payment_refunds.payment_id → payments.subject
 *   완료·예약 = scheduled_events.matching_id → matchings.subject
 * 이 파일은 그렇게 모은 과목별 합계를 받아 파생값(잔여·미예약·초과예약)만 만든다.
 */

/** SFv2 payments.management_status — 결제 관리 상태. */
export type PaymentManagementStatus =
  | 'onboarding'
  | 'active'
  | 'paused'
  | 'inactive'
  | 'excluded';

/** 과목 키 — null은 과목을 알 수 없는 시간(미지정 버킷). */
export type SubjectKey = string | null;

export interface SubjectHours {
  subject: SubjectKey;
  purchased: number;
  completed: number;
  refunded: number;
  /** 구매 − 환불 − 완료. 음수면 결제분을 넘겨 수업한 상태. */
  remaining: number;
  scheduled: number;
  unscheduled: number;
  overscheduled: number;
  paymentStatus: PaymentManagementStatus | null;
}

export interface SubjectSources {
  purchased?: Map<SubjectKey, number>;
  refunded?: Map<SubjectKey, number>;
  used?: Map<SubjectKey, number>;
  scheduled?: Map<SubjectKey, number>;
  paymentStatus?: Map<SubjectKey, PaymentManagementStatus>;
}

/** Payment 페이지·필터 사이드바와 같은 표시 순서. 그 외 과목은 뒤에 알파벳순, 미지정은 마지막. */
const SUBJECT_ORDER = ['SAT', 'AP', 'special'];

/** 시간은 0.1 단위 — 학생 단위 집계와 같은 반올림. */
function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function orderIndex(subject: SubjectKey): number {
  if (subject === null) return SUBJECT_ORDER.length + 1;
  const known = SUBJECT_ORDER.indexOf(subject);
  return known >= 0 ? known : SUBJECT_ORDER.length;
}

function compareSubjects(a: SubjectKey, b: SubjectKey): number {
  const diff = orderIndex(a) - orderIndex(b);
  if (diff !== 0) return diff;
  return (a ?? '').localeCompare(b ?? '');
}

/**
 * 어느 소스에든 등장한 과목을 모두 행으로 만든다.
 * 구매 없이 수업만 있는 과목(가결제·이관)이나 결제만 등록된 과목도 화면에서 사라지면 안 된다.
 */
export function buildSubjectBreakdown(sources: SubjectSources): SubjectHours[] {
  const subjects = new Set<SubjectKey>();
  for (const map of [sources.purchased, sources.refunded, sources.used, sources.scheduled, sources.paymentStatus]) {
    for (const key of map?.keys() ?? []) subjects.add(key);
  }

  return [...subjects].sort(compareSubjects).map((subject) => {
    const purchased = round1(sources.purchased?.get(subject) ?? 0);
    const refunded = round1(sources.refunded?.get(subject) ?? 0);
    const completed = round1(sources.used?.get(subject) ?? 0);
    const scheduled = round1(sources.scheduled?.get(subject) ?? 0);
    const remaining = round1(purchased - refunded - completed);

    return {
      subject,
      purchased,
      completed,
      refunded,
      remaining,
      scheduled,
      unscheduled: round1(Math.max(0, remaining - scheduled)),
      overscheduled: round1(Math.max(0, scheduled - remaining)),
      paymentStatus: sources.paymentStatus?.get(subject) ?? null,
    };
  });
}
