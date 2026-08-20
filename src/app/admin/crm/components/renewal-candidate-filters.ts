// 재결제 후보 필터 — 플랫폼 Payment 페이지 좌측 사이드바(SUBJECT / STATUS)와 같은 축.
// 순수 함수로 분리해 체크박스 UI와 무관하게 규칙을 검증한다.

import type { PaymentManagementStatus } from '@/lib/tutoring-subject-breakdown';

/** 필터가 실제로 보는 필드만 — 학생 엔트리와 과목 행 어느 쪽이 와도 그대로 통과시킨다. */
interface FilterableEntry {
  subjects: string[];
  paymentStatus: PaymentManagementStatus | null;
}

/** 과목·결제 상태가 비어 있는 항목(SRM 미연결 등)을 가리키는 옵션 값. */
export const UNSPECIFIED = '__unspecified__';

export interface CandidateFilters {
  /** 체크된 과목 값. UNSPECIFIED가 있으면 과목 없는 항목도 포함. */
  subjects: string[];
  /** 체크된 결제 관리 상태 값. */
  paymentStatuses: string[];
}

export interface FilterOption {
  value: string;
  label: string;
  count: number;
}

// Payment 페이지와 같은 표시 순서 (그 외 값은 뒤에 알파벳순)
const SUBJECT_ORDER = ['SAT', 'AP', 'special'];
const SUBJECT_LABEL: Record<string, string> = { SAT: 'SAT', AP: 'AP', special: 'Special' };

const STATUS_ORDER = ['onboarding', 'active', 'paused', 'inactive', 'excluded'];
const STATUS_LABEL: Record<string, string> = {
  onboarding: 'Onboarding',
  active: 'Active',
  paused: 'Paused',
  inactive: 'Inactive',
  excluded: 'Excluded',
};

function buildOptions(
  counts: Map<string, number>,
  order: string[],
  labels: Record<string, string>
): FilterOption[] {
  const known = order
    .filter((v) => counts.has(v))
    .map((v) => ({ value: v, label: labels[v] ?? v, count: counts.get(v)! }));

  const extra = [...counts.keys()]
    .filter((v) => v !== UNSPECIFIED && !order.includes(v))
    .sort()
    .map((v) => ({ value: v, label: labels[v] ?? v, count: counts.get(v)! }));

  // 미지정은 항상 마지막
  const none = counts.has(UNSPECIFIED)
    ? [{ value: UNSPECIFIED, label: '미지정', count: counts.get(UNSPECIFIED)! }]
    : [];

  return [...known, ...extra, ...none];
}

/** 과목 옵션 + 각 옵션에 해당하는 학생 수. 복수 과목 학생은 각 과목에 모두 계상된다. */
export function subjectOptions(entries: FilterableEntry[]): FilterOption[] {
  const counts = new Map<string, number>();
  for (const e of entries) {
    const values = e.subjects.length > 0 ? e.subjects : [UNSPECIFIED];
    for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  return buildOptions(counts, SUBJECT_ORDER, SUBJECT_LABEL);
}

export function paymentStatusOptions(entries: FilterableEntry[]): FilterOption[] {
  const counts = new Map<string, number>();
  for (const e of entries) {
    const v = e.paymentStatus ?? UNSPECIFIED;
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  return buildOptions(counts, STATUS_ORDER, STATUS_LABEL);
}

/**
 * 기본값은 '전체 선택'.
 * Payment 페이지는 Onboarding+Active만 켜고 시작하지만, 재결제 대상 대부분은 시간이 소진돼
 * 결제가 inactive로 넘어간 학생이다. 같은 기본값을 쓰면 정작 봐야 할 사람이 숨는다.
 */
export function defaultCandidateFilters(entries: FilterableEntry[]): CandidateFilters {
  return {
    subjects: subjectOptions(entries).map((o) => o.value),
    paymentStatuses: paymentStatusOptions(entries).map((o) => o.value),
  };
}

/** 체크된 값에 해당하는 항목만 남긴다. 그룹이 비면(전부 해제) 그 그룹 기준으로 아무것도 남지 않는다. */
export function filterCandidates<E extends FilterableEntry>(
  entries: E[],
  filters: CandidateFilters
): E[] {
  const subjectSet = new Set(filters.subjects);
  const statusSet = new Set(filters.paymentStatuses);

  return entries.filter((e) => {
    const subjectValues = e.subjects.length > 0 ? e.subjects : [UNSPECIFIED];
    if (!subjectValues.some((v) => subjectSet.has(v))) return false;
    return statusSet.has(e.paymentStatus ?? UNSPECIFIED);
  });
}

/** 전체 선택 여부 — '전체' 토글 버튼 상태 표시용. */
export function isAllSelected(options: FilterOption[], selected: string[]): boolean {
  return options.length > 0 && options.every((o) => selected.includes(o.value));
}
