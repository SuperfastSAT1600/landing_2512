import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { supabaseSFv2 } from '@/lib/supabase-sfv2';
import { isAuthenticated } from '@/lib/server-auth';
import { apiError, unauthorized } from '@/lib/api-response';
import { getKstDateString } from '@/lib/week-definitions';
import {
  buildSubjectBreakdown,
  type PaymentManagementStatus,
  type SubjectHours,
  type SubjectKey,
} from '@/lib/tutoring-subject-breakdown';
import { fetchV2Data } from './_lib/v2-hours';

export type TutoringStatus = 'onboarding' | 'active' | 'paused' | 'sales' | 'ended' | 'unclassified';

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

/** CRM 결제 완료 학생 중 SFv2 계정 미연결 — CRM 미연결 탭 전용. */
export interface CrmUnlinkedStudent {
  id: string;
  name: string;
  grade: string | null;
  parent_phone: string | null;
}

export interface TutoringUsersResponse {
  linked: TutoringUser[];
  unlinked: UnlinkedTutoringUser[];
  /** CRM funnel_stage='8' & sfv2_profile_id IS NULL 학생 목록. */
  crmUnlinked: CrmUnlinkedStudent[];
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

/** payments.management_status → TutoringStatus 매핑. */
function managementStatusToTutoring(ms: string | null): TutoringStatus | null {
  if (ms === 'onboarding') return 'onboarding';
  if (ms === 'active') return 'active';
  if (ms === 'paused') return 'paused';
  if (ms === 'inactive') return 'ended';
  if (ms === 'excluded') return 'unclassified';
  return null;
}

export async function GET(request: NextRequest) {
  if (!isAuthenticated(request)) return unauthorized();

  try {
    const today = getKstDateString();

    // SFv2 집계와 CRM 조회는 서로 독립 — 한 번에 동시에 실행한다(원격 리전 왕복이 병목).
    const [v2, crmResult, pauseResult, crmUnlinkedResult] = await Promise.all([
      fetchV2Data(),
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
      // CRM 결제 완료(funnel_stage='8') 학생 중 SFv2 계정 미연결
      supabaseAdmin
        .from('students')
        .select('id, name, grade, parent_phone')
        .eq('funnel_stage', '8')
        .is('sfv2_profile_id', null)
        .order('name'),
    ]);
    const crmError = crmResult.error ?? pauseResult.error ?? crmUnlinkedResult.error;
    if (crmError) throw new Error(crmError.message);

    // SRM v2 카운트와 동일한 소스: payments → profile_id 기준 집계.
    const allPaymentRows = v2.payments.filter(
      (p): p is typeof p & { student_id: string } => p.student_id !== null
    );
    const {
      purchased, refunded, used, scheduled, lastSessionDate,
      purchasedBySubject, refundedBySubject, usedBySubject, scheduledBySubject,
    } = v2;
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

    // 미연결 sfv2 유저: 구매 이력이 있지만 라이프사이클에 연결되지 않은 SFv2 프로필
    const relevantSet = new Set(relevantProfileIds);
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const ninetyDaysAgoStr = ninetyDaysAgo.toISOString();
    const unlinkedProfileIds = [...purchased.keys()].filter((pid) => {
      if (relevantSet.has(pid)) return false;
      const purchasedH = purchased.get(pid) ?? 0;
      const refundedH = refunded.get(pid) ?? 0;
      const usedH = used.get(pid) ?? 0;
      const rawRemainingH = purchasedH - refundedH - usedH;
      if (purchasedH - refundedH <= 0) return false;
      if (rawRemainingH > 0) return true;
      const lastSession = lastSessionDate.get(pid);
      return !!lastSession && lastSession >= ninetyDaysAgoStr;
    });

    // SFv2 profiles 이름 조회 — 연결·미연결 대상을 함께, 배치 500을 동시에
    const profileIds = [...relevantProfileIds, ...unlinkedProfileIds];
    const profileBatches = await Promise.all(
      Array.from({ length: Math.ceil(profileIds.length / 500) }, (_, i) =>
        supabaseSFv2.from('profiles').select('id, full_name').in('id', profileIds.slice(i * 500, i * 500 + 500))
      )
    );
    const sfv2ProfilesById = new Map<string, { id: string; full_name: string | null }>();
    for (const { data, error } of profileBatches) {
      if (error) throw new Error(error.message);
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
      onboarding: 0, active: 1, paused: 2, sales: 3, ended: 4, unclassified: 5,
    };
    results.sort((a, b) =>
      statusOrder[a.status] !== statusOrder[b.status]
        ? statusOrder[a.status] - statusOrder[b.status]
        : a.name.localeCompare(b.name)
    );

    const unlinked: UnlinkedTutoringUser[] = [];
    for (const pid of unlinkedProfileIds) {
      const p = sfv2ProfilesById.get(pid);
      if (!p) continue;
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

    const crmUnlinked: CrmUnlinkedStudent[] = (crmUnlinkedResult.data ?? []).map((s) => ({
      id: s.id,
      name: s.name ?? '',
      grade: s.grade ?? null,
      parent_phone: s.parent_phone ?? null,
    }));

    return NextResponse.json({ linked: results, unlinked, crmUnlinked } satisfies TutoringUsersResponse);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[srm/tutoring-users]', msg);
    return apiError('INTERNAL_ERROR', msg, 500);
  }
}
