import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { supabaseSFv2 } from '@/lib/supabase-sfv2';
import { isAuthenticated } from '@/lib/server-auth';
import {
  buildSubjectBreakdown,
  type PaymentManagementStatus,
  type SubjectHours,
  type SubjectKey,
} from '@/lib/tutoring-subject-breakdown';

export type TutoringStatus = 'onboarding' | 'active' | 'paused' | 'sales' | 'ended';

/** SFv2 payments.management_status — 결제 관리 상태. 정의는 집계 유틸과 공유한다. */
export type { PaymentManagementStatus, SubjectHours };

export interface TutoringUser {
  sfv2ProfileId: string;
  crmStudentId: string | null;
  name: string;
  grade: string | null;
  purchasedHours: number;
  refundedHours: number;
  /** 완료된 coach_room 시간 (플랫폼 Payment 페이지의 Completed). */
  usedHours: number;
  /**
   * 잔여 시간 — 0 하한. 기존 SRM 화면들이 이 값을 그대로 표시하므로 의미를 바꾸지 않는다.
   * 초과 사용(음수)을 봐야 하면 netRemainingHours를 쓴다.
   */
  remainingHours: number;
  /**
   * 부호가 있는 잔여 = 구매 − 환불 − 완료. 플랫폼 Payment 페이지의 Remaining과 동일.
   * 음수면 결제분을 넘겨 수업한 상태 → 재결제가 이미 늦은 학생이다.
   */
  netRemainingHours: number;
  /** 예약됐지만 아직 진행 전인 coach_room 시간 (approved + awaiting_confirmation). */
  scheduledHours: number;
  /** 결제했지만 아직 캘린더에 없는 시간 = max(0, netRemaining − scheduled). */
  unscheduledHours: number;
  /** 결제분을 넘겨 예약된 시간 = max(0, scheduled − netRemaining). */
  overscheduledHours: number;
  /** 결제 과목 (SAT / AP / special). 여러 결제가 있으면 복수. */
  subjects: string[];
  /** 가장 우선순위 높은 결제의 관리 상태. 결제가 없으면 null. */
  paymentStatus: PaymentManagementStatus | null;
  /**
   * 과목별로 쪼갠 같은 수치 — V2 Payment 페이지가 (학생 × 과목) 한 행으로 보여주는 단위.
   * 합은 위의 학생 단위 값과 일치한다. 과목을 알 수 없는 시간은 subject: null 버킷.
   */
  subjectBreakdown: SubjectHours[];
  status: TutoringStatus;
}

export interface UnlinkedTutoringUser {
  sfv2ProfileId: string;
  name: string;
  purchasedHours: number;
  /** 0 하한 잔여 — 기존 SRM 화면 표시용. */
  remainingHours: number;
  /** 부호 있는 잔여 = 구매 − 환불 − 완료. 활성 결제 + 사용 초과면 음수가 될 수 있다. */
  netRemainingHours: number;
}

export interface TutoringUsersResponse {
  linked: TutoringUser[];
  unlinked: UnlinkedTutoringUser[];
}

// 오프셋 페이지네이션(1000행 캡)을 한 곳에서 처리. 페이지별 처리는 onPage 콜백에 위임.
async function scanAll<T>(
  build: (from: number, to: number) => PromiseLike<{ data: T[] | null }>,
  onPage: (rows: T[]) => void,
): Promise<void> {
  let offset = 0;
  while (true) {
    const { data } = await build(offset, offset + 999);
    if (!data?.length) break;
    onPage(data);
    if (data.length < 1000) break;
    offset += 1000;
  }
}

/** 학생 → 과목 → 시간. 과목 행(V2 Payment 페이지 단위)을 만들기 위한 이중 집계. */
type HoursBySubject = Map<string, Map<SubjectKey, number>>;

function addSubjectHours(target: HoursBySubject, ownerId: string, subject: SubjectKey, hours: number) {
  const bySubject = target.get(ownerId) ?? new Map<SubjectKey, number>();
  bySubject.set(subject, (bySubject.get(subject) ?? 0) + hours);
  target.set(ownerId, bySubject);
}

// 1. 구매 시간 + 최근 결제일: payment_transactions.hours by student_id (과목은 transaction.subject)
async function fetchPurchased() {
  const purchased = new Map<string, number>();
  const purchasedBySubject: HoursBySubject = new Map();
  const lastPurchaseDate = new Map<string, string>();
  await scanAll<{ student_id: string | null; hours: number; created_at: string; subject: string | null }>(
    (f, t) => supabaseSFv2.from('payment_transactions').select('student_id, hours, created_at, subject').gt('hours', 0).range(f, t),
    (rows) => {
      for (const row of rows) {
        if (!row.student_id) continue;
        purchased.set(row.student_id, (purchased.get(row.student_id) ?? 0) + (row.hours ?? 0));
        addSubjectHours(purchasedBySubject, row.student_id, row.subject, row.hours ?? 0);
        const prev = lastPurchaseDate.get(row.student_id);
        if (!prev || row.created_at > prev) lastPurchaseDate.set(row.student_id, row.created_at);
      }
    },
  );
  return { purchased, purchasedBySubject, lastPurchaseDate };
}

// 2. 환불 시간: payment_refunds.hours_refunded → payments.student_id
async function fetchRefunded() {
  const refunded = new Map<string, number>();
  const refundedBySubject: HoursBySubject = new Map();
  // payment_refunds → payments(student_id, subject) 매핑이 필요하므로 전 페이지 수집 후 배치 처리.
  const refundRows: { payment_id: string; hours_refunded: number }[] = [];
  await scanAll<{ payment_id: string; hours_refunded: number }>(
    (f, t) => supabaseSFv2.from('payment_refunds').select('hours_refunded, payment_id').range(f, t),
    (rows) => refundRows.push(...rows),
  );
  for (let i = 0; i < refundRows.length; i += 1000) {
    const batch = refundRows.slice(i, i + 1000);
    const { data: payments } = await supabaseSFv2
      .from('payments').select('id, student_id, subject').in('id', batch.map((r) => r.payment_id));
    const paymentOwner = new Map(
      (payments ?? []).map((p: { id: string; student_id: string | null; subject: string | null }) => [p.id, p])
    );
    for (const row of batch) {
      const payment = paymentOwner.get(row.payment_id);
      if (!payment?.student_id) continue;
      refunded.set(payment.student_id, (refunded.get(payment.student_id) ?? 0) + (row.hours_refunded ?? 0));
      addSubjectHours(refundedBySubject, payment.student_id, payment.subject, row.hours_refunded ?? 0);
    }
  }
  return { refunded, refundedBySubject };
}

// 3. 세션 시간 by user_id — 완료(used) / 예약 대기(scheduled) + 최근 세션일.
//    두 상태를 한 번의 events 스캔 + 한 번의 participants 스캔으로 함께 집계한다
//    (participants 전량 스캔이 병목이므로 상태별로 두 번 돌리지 않는다).
const SCHEDULED_STATUSES = ['approved', 'awaiting_confirmation'];

async function fetchSessionHours() {
  const used = new Map<string, number>();
  const scheduled = new Map<string, number>();
  const usedBySubject: HoursBySubject = new Map();
  const scheduledBySubject: HoursBySubject = new Map();
  const lastSessionDate = new Map<string, string>();
  const eventMeta = new Map<
    string,
    { duration: number; startsAt: string; completed: boolean; subject: SubjectKey }
  >();

  // 수업의 과목은 매칭이 갖고 있다 (scheduled_events → matchings.subject).
  const matchingSubject = new Map<string, string | null>();
  await scanAll<{ id: string; subject: string | null }>(
    (f, t) => supabaseSFv2.from('matchings').select('id, subject').range(f, t),
    (rows) => {
      for (const m of rows) matchingSubject.set(m.id, m.subject);
    },
  );

  await scanAll<{ id: string; starts_at: string; ends_at: string; status: string; matching_id: string | null }>(
    (f, t) => supabaseSFv2
      .from('scheduled_events')
      .select('id, starts_at, ends_at, status, matching_id')
      .in('status', ['completed', ...SCHEDULED_STATUSES])
      .eq('category', 'coach_room')
      .range(f, t),
    (rows) => {
      for (const e of rows) {
        const dur = (new Date(e.ends_at).getTime() - new Date(e.starts_at).getTime()) / 3_600_000;
        eventMeta.set(e.id, {
          duration: dur,
          startsAt: e.starts_at,
          completed: e.status === 'completed',
          subject: e.matching_id ? matchingSubject.get(e.matching_id) ?? null : null,
        });
      }
    },
  );
  await scanAll<{ event_id: string; user_id: string }>(
    (f, t) => supabaseSFv2.from('scheduled_event_participants').select('event_id, user_id').range(f, t),
    (rows) => {
      for (const p of rows) {
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
    },
  );
  return { used, scheduled, usedBySubject, scheduledBySubject, lastSessionDate };
}

async function fetchV2Hours() {
  // 세 집계는 서로 독립 → 병렬 실행(원격 SFv2 왕복 지연이 병목이므로 순차 대비 큰 단축).
  const [p, r, u] = await Promise.all([fetchPurchased(), fetchRefunded(), fetchSessionHours()]);
  return {
    purchased: p.purchased,
    purchasedBySubject: p.purchasedBySubject,
    lastPurchaseDate: p.lastPurchaseDate,
    refunded: r.refunded,
    refundedBySubject: r.refundedBySubject,
    used: u.used,
    scheduled: u.scheduled,
    usedBySubject: u.usedBySubject,
    scheduledBySubject: u.scheduledBySubject,
    lastSessionDate: u.lastSessionDate,
  };
}

// 결제 과목·관리 상태. Payment 페이지의 Subject / Status 컬럼과 같은 소스.
// 한 학생이 여러 결제를 가질 수 있어 상태는 우선순위가 가장 높은 하나로 접는다.
const PAYMENT_STATUS_PRIORITY: PaymentManagementStatus[] = [
  'active', 'onboarding', 'paused', 'inactive', 'excluded',
];

function foldPayments(rows: { student_id: string; subject: string | null; management_status: string | null }[]) {
  const subjects = new Map<string, Set<string>>();
  const paymentStatus = new Map<string, PaymentManagementStatus>();
  const statusBySubject = new Map<string, Map<SubjectKey, PaymentManagementStatus>>();
  for (const row of rows) {
    if (row.subject) {
      const set = subjects.get(row.student_id) ?? new Set<string>();
      set.add(row.subject);
      subjects.set(row.student_id, set);
    }
    const next = row.management_status as PaymentManagementStatus | null;
    if (!next || !PAYMENT_STATUS_PRIORITY.includes(next)) continue;
    const prev = paymentStatus.get(row.student_id);
    if (!prev || PAYMENT_STATUS_PRIORITY.indexOf(next) < PAYMENT_STATUS_PRIORITY.indexOf(prev)) {
      paymentStatus.set(row.student_id, next);
    }
    // 과목별 상태 — (학생, 과목)은 결제 1행이 원칙이지만, 중복이 생겨도 같은 우선순위로 접는다.
    const bySubject = statusBySubject.get(row.student_id) ?? new Map<SubjectKey, PaymentManagementStatus>();
    const prevForSubject = bySubject.get(row.subject);
    if (!prevForSubject || PAYMENT_STATUS_PRIORITY.indexOf(next) < PAYMENT_STATUS_PRIORITY.indexOf(prevForSubject)) {
      bySubject.set(row.subject, next);
      statusBySubject.set(row.student_id, bySubject);
    }
  }
  return { subjects, paymentStatus, statusBySubject };
}

/** payments.management_status → TutoringStatus 매핑.
 *  inactive·excluded는 미분류/이탈이므로 null 반환 → 목록에서 제외. */
function managementStatusToTutoring(ms: string | null): TutoringStatus | null {
  if (ms === 'onboarding') return 'onboarding';
  if (ms === 'active') return 'active';
  if (ms === 'paused') return 'paused';
  return null; // inactive, excluded → 제외
}

export async function GET(request: NextRequest) {
  if (!isAuthenticated(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const today = new Date().toISOString().slice(0, 10);

    // payments는 학생×과목 단위라 1000행 cap을 넘을 수 있다 → scanAll 필요.
    // SRM v2 카운트와 동일한 소스: payments 먼저 수집 → profile_id 기준 집계.
    const allPaymentRows: { student_id: string; subject: string | null; management_status: string | null }[] = [];
    await scanAll<{ student_id: string; subject: string | null; management_status: string | null }>(
      (f, t) => supabaseSFv2
        .from('payments')
        .select('student_id, subject, management_status')
        .not('student_id', 'is', null)
        .range(f, t),
      (rows) => allPaymentRows.push(...rows),
    );

    const [v2Hours, crmResult, pauseResult] = await Promise.all([
      fetchV2Hours(),
      supabaseAdmin
        .from('students')
        .select('id, name, grade, sfv2_profile_id')
        .not('sfv2_profile_id', 'is', null),
      supabaseAdmin
        .from('student_pauses')
        .select('student_id, sfv2_profile_id')
        .is('ended_at', null)
        .lte('pause_start', today)
        .or(`pause_until.is.null,pause_until.gte.${today}`),
    ]);

    const {
      purchased, refunded, used, scheduled, lastSessionDate,
      purchasedBySubject, refundedBySubject, usedBySubject, scheduledBySubject,
    } = v2Hours;
    const {
      subjects: subjectsByStudent,
      paymentStatus: statusByStudent,
      statusBySubject,
    } = foldPayments(allPaymentRows);

    // profile_id → 가장 우선순위 높은 management_status
    // PAYMENT_STATUS_PRIORITY와 동일 순서 사용
    const MGMT_PRIORITY = ['active', 'onboarding', 'paused', 'inactive', 'excluded'];
    const mgmtByProfile = new Map<string, string>();
    for (const row of allPaymentRows) {
      if (!row.student_id || !row.management_status) continue;
      const prev = mgmtByProfile.get(row.student_id);
      if (!prev || MGMT_PRIORITY.indexOf(row.management_status) < MGMT_PRIORITY.indexOf(prev)) {
        mgmtByProfile.set(row.student_id, row.management_status);
      }
    }

    // onboarding·active·paused 인 profile_id만 (SRM v2 카운트와 동일하게)
    const relevantProfileIds = [...mgmtByProfile.entries()]
      .filter(([, ms]) => managementStatusToTutoring(ms) !== null)
      .map(([pid]) => pid);

    // SFv2 profiles 이름 조회 — 배치 500
    const sfv2ProfilesById = new Map<string, { id: string; full_name: string | null }>();
    for (let i = 0; i < relevantProfileIds.length; i += 500) {
      const { data } = await supabaseSFv2
        .from('profiles')
        .select('id, full_name')
        .in('id', relevantProfileIds.slice(i, i + 500));
      for (const p of data ?? []) sfv2ProfilesById.set(p.id, p);
    }

    // CRM 학생은 enrichment (이름·학년·crmStudentId)
    const crmStudents = (crmResult.data ?? []) as {
      id: string; name: string; grade: string | null; sfv2_profile_id: string;
    }[];
    const crmByProfile = new Map<string, typeof crmStudents[0]>();
    for (const s of crmStudents) crmByProfile.set(s.sfv2_profile_id, s);

    const pausedByStudentId = new Set((pauseResult.data ?? []).map((p) => p.student_id).filter(Boolean) as string[]);
    const pausedByProfileId = new Set((pauseResult.data ?? []).map((p) => p.sfv2_profile_id).filter(Boolean) as string[]);

    const results: TutoringUser[] = [];

    for (const pid of relevantProfileIds) {
      const mgmt = mgmtByProfile.get(pid) ?? null;
      const baseStatus = managementStatusToTutoring(mgmt);
      if (!baseStatus) continue;

      const crmStudent = crmByProfile.get(pid);
      const isPaused = (crmStudent ? pausedByStudentId.has(crmStudent.id) : false) || pausedByProfileId.has(pid);
      // active 상태에서 휴원 중이면 paused로 override (onboarding은 유지)
      const status: TutoringStatus = (isPaused && baseStatus === 'active') ? 'paused' : baseStatus;

      const sfv2Profile = sfv2ProfilesById.get(pid);
      const name = crmStudent?.name ?? sfv2Profile?.full_name ?? pid;
      const grade = crmStudent?.grade ?? null;

      const purchasedH = Math.round((purchased.get(pid) ?? 0) * 10) / 10;
      const refundedH  = Math.round((refunded.get(pid) ?? 0) * 10) / 10;
      const usedH      = Math.round((used.get(pid) ?? 0) * 10) / 10;
      const rawRemainingH = purchasedH - refundedH - usedH;
      const remainingH    = Math.round(Math.max(0, rawRemainingH) * 10) / 10;
      const scheduledH    = Math.round((scheduled.get(pid) ?? 0) * 10) / 10;
      const netRemainingH = Math.round(rawRemainingH * 10) / 10;

      results.push({
        sfv2ProfileId: pid,
        crmStudentId: crmStudent?.id ?? null,
        name,
        grade,
        purchasedHours: purchasedH,
        refundedHours: refundedH,
        usedHours: usedH,
        remainingHours: remainingH,
        netRemainingHours: netRemainingH,
        scheduledHours: scheduledH,
        unscheduledHours: Math.round(Math.max(0, netRemainingH - scheduledH) * 10) / 10,
        overscheduledHours: Math.round(Math.max(0, scheduledH - netRemainingH) * 10) / 10,
        subjects: [...(subjectsByStudent.get(pid) ?? [])].sort(),
        paymentStatus: statusByStudent.get(pid) ?? null,
        subjectBreakdown: buildSubjectBreakdown({
          purchased: purchasedBySubject.get(pid),
          refunded: refundedBySubject.get(pid),
          used: usedBySubject.get(pid),
          scheduled: scheduledBySubject.get(pid),
          paymentStatus: statusBySubject.get(pid),
        }),
        status,
      });
    }

    const statusOrder: Record<TutoringStatus, number> = {
      onboarding: 0, active: 1, paused: 2, sales: 3, ended: 4,
    };
    results.sort((a, b) =>
      statusOrder[a.status] !== statusOrder[b.status]
        ? statusOrder[a.status] - statusOrder[b.status]
        : a.name.localeCompare(b.name)
    );

    // 미연결 sfv2 유저: 구매 이력이 있지만 라이프사이클에 연결되지 않은 SFv2 프로필
    const linkedProfileIds = new Set(results.map((r) => r.sfv2ProfileId).filter(Boolean));
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const ninetyDaysAgoStr = ninetyDaysAgo.toISOString();

    const unlinkedProfileIds = [...purchased.keys()].filter((pid) => {
      if (linkedProfileIds.has(pid)) return false;
      const purchasedH = purchased.get(pid) ?? 0;
      const refundedH = refunded.get(pid) ?? 0;
      const usedH = used.get(pid) ?? 0;
      const rawRemainingH = purchasedH - refundedH - usedH;
      if (purchasedH - refundedH <= 0) return false;
      if (rawRemainingH > 0) return true;
      const lastSession = lastSessionDate.get(pid);
      return !!lastSession && lastSession >= ninetyDaysAgoStr;
    });

    const unlinked: UnlinkedTutoringUser[] = [];
    if (unlinkedProfileIds.length > 0) {
      const { data: profiles } = await supabaseSFv2
        .from('profiles')
        .select('id, full_name')
        .in('id', unlinkedProfileIds);

      for (const p of profiles ?? []) {
        const purchasedH = Math.round((purchased.get(p.id) ?? 0) * 10) / 10;
        const refundedH = Math.round((refunded.get(p.id) ?? 0) * 10) / 10;
        const usedH = Math.round((used.get(p.id) ?? 0) * 10) / 10;
        const netRemainingH = Math.round((purchasedH - refundedH - usedH) * 10) / 10;
        const remainingH = Math.max(0, netRemainingH);
        unlinked.push({
          sfv2ProfileId: p.id,
          name: p.full_name ?? p.id,
          purchasedHours: purchasedH,
          remainingHours: remainingH,
          netRemainingHours: netRemainingH,
        });
      }
      unlinked.sort((a, b) => b.netRemainingHours - a.netRemainingHours || a.name.localeCompare(b.name));
    }

    return NextResponse.json({ linked: results, unlinked } satisfies TutoringUsersResponse);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
