// SRM 수강 상태 — SFv2 payments.management_status(학생 × 과목). CRM·SRM 어디서든 이 값 하나를 기준으로 본다.
// SRM 관리 화면(srm.subject_management.lifecycle_status)과는 SFv2 DB 트리거가 양방향으로 맞춘다.
// 순서·라벨·롤업 우선순위는 SRM(app/src/lib/payments/status.ts)과 같다. 순수 모듈.

export const SRM_STATUSES = ['onboarding', 'active', 'paused', 'inactive', 'excluded'] as const;

export type SrmStatus = (typeof SRM_STATUSES)[number];

export const SRM_STATUS_LABEL: Record<SrmStatus, string> = {
  onboarding: '온보딩',
  active: '재원',
  paused: '휴원',
  inactive: '종료',
  excluded: '제외',
};

/** 한 학생이 여러 과목을 가질 때 대표 상태 — 재원 > 온보딩 > 제외 > 휴원 > 종료 */
const ROLLUP_PRIORITY: SrmStatus[] = ['active', 'onboarding', 'excluded', 'paused', 'inactive'];

export function isSrmStatus(value: unknown): value is SrmStatus {
  return typeof value === 'string' && (SRM_STATUSES as readonly string[]).includes(value);
}

export function rollUpSrmStatus(statuses: readonly string[]): SrmStatus | null {
  return ROLLUP_PRIORITY.find((s) => statuses.includes(s)) ?? null;
}
