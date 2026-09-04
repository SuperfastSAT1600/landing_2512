'use client';

// 튜터링 학생 행 — '튜터링 중' 탭과 '재결제 세일즈' 후보 목록이 같은 UI를 공유한다.
// 우측 액션만 slot으로 갈린다 (튜터링 중 = 환불, 재결제 후보 = 대상 추가).

import { Crown, AlertTriangle, Link2Off, Search } from 'lucide-react';
import type { ReactNode } from 'react';
import type { Student } from '@/types/crm';
import type { TutoringUser } from '@/app/api/admin/srm/tutoring-users/route';
import type { PaymentManagementStatus, SubjectHours } from '@/lib/tutoring-subject-breakdown';

/** 행 렌더에 필요한 학생 필드만 — 부분 조인된 학생도 그대로 넘길 수 있다. */
export type TutoringRowStudent = Pick<
  Student,
  'id' | 'name' | 'grade' | 'parent_phone' | 'is_vip' | 'needs_attention' | 'traffic_source'
>;

// 'ended'는 목록에서 제외하므로 포함하지 않는다
export type TutoringDisplayStatus = 'unlinked' | 'active' | 'paused' | 'partial_end' | 'sales';

/**
 * 플랫폼 Payment 페이지(app.superfastsat.io/admin/payment)의 수치 컬럼과 1:1 대응.
 * 담당자가 재결제 대상을 고를 때 보는 값이라 같은 정의를 그대로 옮긴다.
 */
export interface TutoringHours {
  purchased: number;
  completed: number;
  refunded: number;
  /** 구매 − 환불 − 완료. 음수면 결제분을 넘겨 수업한 상태. */
  remaining: number;
  scheduled: number;
  unscheduled: number;
  overscheduled: number;
}

export interface TutoringEntry<S extends TutoringRowStudent = Student> {
  student: S;
  displayStatus: TutoringDisplayStatus;
  /** 0 하한 잔여 — '튜터링 중' 행 표시용(기존 동작 유지). */
  remainingHours: number | null;
  /** Payment 페이지와 동일한 전체 수치. SRM 미연결이면 null. */
  hours: TutoringHours | null;
  subjects: string[];
  paymentStatus: PaymentManagementStatus | null;
  /**
   * 같은 수치를 과목별로 쪼갠 내역 — V2 Payment 페이지의 (학생 × 과목) 행 단위.
   * 재결제 후보 표가 이걸로 행을 나눈다. SRM 미연결이면 빈 배열.
   */
  bySubject: SubjectHours[];
}

export const TUTORING_STATUS_META: Record<
  TutoringDisplayStatus,
  { label: string; color: string; dot: string }
> = {
  unlinked:     { label: '미연결',      color: 'bg-gray-100 text-gray-500',       dot: 'bg-gray-400' },
  active:       { label: '수업중',      color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
  paused:       { label: '휴원',        color: 'bg-amber-100 text-amber-700',     dot: 'bg-amber-400' },
  partial_end:  { label: '부분종료',    color: 'bg-orange-100 text-orange-700',   dot: 'bg-orange-500' },
  sales:        { label: '재결제세일즈', color: 'bg-blue-100 text-blue-700',      dot: 'bg-blue-500' },
};

export type TutoringSubTab = 'all' | TutoringDisplayStatus;

export const TUTORING_SUB_TABS: { key: TutoringSubTab; label: string }[] = [
  { key: 'all',          label: '전체' },
  { key: 'unlinked',     label: '미연결' },
  { key: 'active',       label: '수업중' },
  { key: 'paused',       label: '휴원' },
  { key: 'partial_end',  label: '부분종료' },
  { key: 'sales',        label: '재결제세일즈' },
];

/**
 * enrolled 학생을 SRM 튜터링 상태와 결합한다. enrolled가 유일한 학생 소스이며
 * 튜터링 상태는 (a) 종료 학생 제외 (b) 잔여시간·상태 보강만 한다.
 */
export function classifyTutoringEntries<S extends TutoringRowStudent>(
  enrolled: S[],
  linked: TutoringUser[]
): TutoringEntry<S>[] {
  const crmMap = new Map<string, TutoringUser>();
  for (const u of linked) {
    if (u.crmStudentId) crmMap.set(u.crmStudentId, u);
  }

  const entries: TutoringEntry<S>[] = [];
  for (const student of enrolled) {
    const tu = crmMap.get(student.id);
    if (!tu) {
      // SRM 미연결 또는 구매 이력 없음
      entries.push({
        student,
        displayStatus: 'unlinked',
        remainingHours: null,
        hours: null,
        subjects: [],
        paymentStatus: null,
        bySubject: [],
      });
      continue;
    }
    if (tu.status === 'ended') continue; // 종료 학생은 목록에서 제외

    entries.push({
      student,
      displayStatus: tu.status as TutoringDisplayStatus,
      remainingHours: tu.remainingHours,
      hours: {
        purchased: tu.purchasedHours,
        completed: tu.usedHours,
        refunded: tu.refundedHours,
        remaining: tu.netRemainingHours,
        scheduled: tu.scheduledHours,
        unscheduled: tu.unscheduledHours,
        overscheduled: tu.overscheduledHours,
      },
      subjects: tu.subjects ?? [],
      paymentStatus: tu.paymentStatus ?? null,
      bySubject: tu.subjectBreakdown ?? [],
    });
  }
  return entries;
}

/**
 * 연락 우선순위: 결제분 초과 예약이 많은 순 → 잔여 적은 순 → 재결제세일즈 → 이름.
 * 초과 예약은 이미 결제 없이 수업이 잡혀 있다는 뜻이라 가장 급하다.
 */
export function compareTutoringUrgency<S extends TutoringRowStudent>(
  a: TutoringEntry<S>,
  b: TutoringEntry<S>
): number {
  const overDiff = (b.hours?.overscheduled ?? 0) - (a.hours?.overscheduled ?? 0);
  if (overDiff !== 0) return overDiff;

  // 잔여는 부호 있는 값 기준 — 미연결(알 수 없음)은 맨 뒤로.
  const ah = a.hours ? a.hours.remaining : Number.POSITIVE_INFINITY;
  const bh = b.hours ? b.hours.remaining : Number.POSITIVE_INFINITY;
  if (ah !== bh) return ah - bh;

  const salesFirst = Number(b.displayStatus === 'sales') - Number(a.displayStatus === 'sales');
  if (salesFirst !== 0) return salesFirst;
  return (a.student.name ?? '').localeCompare(b.student.name ?? '');
}

export function TutoringStudentRow({
  student,
  displayStatus,
  remainingHours,
  onClick,
  action,
  badge,
}: {
  student: TutoringRowStudent;
  displayStatus: TutoringDisplayStatus;
  remainingHours: number | null;
  onClick?: () => void;
  /** 우측 액션 버튼 — 클릭은 행으로 전파되지 않는다. */
  action?: ReactNode;
  /** 상태 배지 뒤에 붙는 추가 배지(예: 선정 주차). */
  badge?: ReactNode;
}) {
  const meta = TUTORING_STATUS_META[displayStatus];

  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 p-3.5 bg-white border border-gray-100 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-colors ${onClick ? 'cursor-pointer' : ''}`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-sm text-gray-900">{student.name}</span>
          {student.grade && <span className="text-xs text-gray-500">{student.grade}</span>}
          {student.is_vip && (
            <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded font-semibold tracking-wide bg-amber-100 text-amber-700">
              <Crown size={9} />VIP
            </span>
          )}
          {student.needs_attention && (
            <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded font-semibold tracking-wide bg-red-100 text-red-700">
              <AlertTriangle size={9} />주의
            </span>
          )}
          <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-semibold ${meta.color}`}>
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${meta.dot}`} />
            {meta.label}
          </span>
          {displayStatus === 'unlinked' && (
            <Link2Off size={11} className="text-gray-400 shrink-0" />
          )}
          {badge}
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="text-xs text-gray-400">{student.parent_phone}</span>
          {remainingHours !== null && (
            <span className="text-xs text-gray-400">잔여 {remainingHours}h</span>
          )}
          {student.traffic_source && (
            <span className="text-xs text-gray-400">{student.traffic_source}</span>
          )}
        </div>
      </div>
      {action && (
        <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
          {action}
        </div>
      )}
    </div>
  );
}

/** 상태 서브탭 + VIP 토글 + 이름 검색. 두 목록이 동일한 컨트롤을 쓴다. */
export function TutoringListControls({
  subTab,
  onSubTabChange,
  counts,
  vipOnly,
  onVipOnlyChange,
  searchQuery,
  onSearchChange,
  showCounts = true,
  showSearch = true,
}: {
  subTab: TutoringSubTab;
  onSubTabChange: (tab: TutoringSubTab) => void;
  counts: Record<TutoringSubTab, number>;
  vipOnly: boolean;
  onVipOnlyChange: (v: boolean) => void;
  searchQuery: string;
  onSearchChange: (v: string) => void;
  showCounts?: boolean;
  /** 이름 검색을 다른 곳(예: 좌측 필터 사이드바)이 갖고 있으면 끈다. */
  showSearch?: boolean;
}) {
  return (
    <>
      <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5 w-fit max-w-full overflow-x-auto scrollbar-none">
        {TUTORING_SUB_TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => onSubTabChange(key)}
            className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-md transition-colors shrink-0 whitespace-nowrap ${
              subTab === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
            {showCounts && counts[key] > 0 && (
              <span className={`text-[10px] px-1 py-0.5 rounded-full font-bold ${
                subTab === key ? 'bg-gray-100 text-gray-700' : 'bg-gray-200 text-gray-500'
              }`}>
                {counts[key]}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onVipOnlyChange(false)}
          className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
            !vipOnly ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          전체
        </button>
        <button
          onClick={() => onVipOnlyChange(true)}
          className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
            vipOnly ? 'bg-amber-400 text-white' : 'text-gray-500 hover:text-amber-600'
          }`}
        >
          <Crown size={10} />
          VIP
        </button>
        {showSearch && (
          <div className="relative ml-auto">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="이름 검색"
              className="pl-7 pr-3 py-1 text-xs border border-gray-200 rounded-md bg-white text-gray-800 placeholder-gray-400 focus:outline-none focus:border-gray-400 w-32"
            />
          </div>
        )}
      </div>
    </>
  );
}

/** 서브탭별 카운트 — 두 목록이 같은 방식으로 센다. */
export function countByTutoringStatus(
  entries: Pick<TutoringEntry<TutoringRowStudent>, 'displayStatus'>[]
): Record<TutoringSubTab, number> {
  const c: Record<TutoringSubTab, number> = {
    all: 0, unlinked: 0, active: 0, paused: 0, partial_end: 0, sales: 0,
  };
  for (const e of entries) {
    c.all++;
    c[e.displayStatus]++;
  }
  return c;
}

/** 서브탭 + VIP + 이름 검색 필터. */
export function filterTutoringEntries<E extends Pick<TutoringEntry<TutoringRowStudent>, 'student' | 'displayStatus'>>(
  entries: E[],
  { subTab, vipOnly, searchQuery }: { subTab: TutoringSubTab; vipOnly: boolean; searchQuery: string }
): E[] {
  const q = searchQuery.trim().toLowerCase();
  return entries.filter((e) => {
    if (subTab !== 'all' && e.displayStatus !== subTab) return false;
    if (vipOnly && !e.student.is_vip) return false;
    if (q && !e.student.name?.toLowerCase().includes(q)) return false;
    return true;
  });
}
