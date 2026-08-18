export type SrmStage =
  | 'onboarding_coach'
  | 'onboarding_first_class'
  | 'onboarding_studyhall'
  | 'onboarding_prep'
  | 'active'
  | 'cycle_next_class'
  | 'cycle_studyhall'
  | 'cycle_active'
  | 'renewal_pending'
  | 'churned';

export const STAGE_LABELS: Record<SrmStage, string> = {
  onboarding_coach: '코치 매칭',
  onboarding_first_class: '첫 수업 일정 조율',
  onboarding_studyhall: '스터디홀 일정 조율 (온보딩)',
  onboarding_prep: '사전학습 안내',
  active: '온보딩 완료',
  cycle_next_class: '다음 수업 조율',
  cycle_studyhall: '스터디홀 일정 조율',
  cycle_active: '수업 진행 중',
  renewal_pending: '재결제 대기',
  churned: '이탈',
};

export const NEXT_STAGE: Partial<Record<SrmStage, SrmStage>> = {
  onboarding_coach: 'onboarding_first_class',
  onboarding_first_class: 'onboarding_studyhall',
  onboarding_studyhall: 'onboarding_prep',
  onboarding_prep: 'active',
  active: 'cycle_next_class',
  cycle_next_class: 'cycle_studyhall',
  cycle_studyhall: 'cycle_active',
  cycle_active: 'cycle_next_class',
};
