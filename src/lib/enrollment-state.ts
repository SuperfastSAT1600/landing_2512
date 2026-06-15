/** 결제 → "수업 중"(stage 8 / enrolled) 전환 상태 계산 (순수 로직, supabase 비의존). */

export interface StageHistoryEntry {
  stage: string;
  label: string;
  entered_at: string;
}

export interface EnrollmentUpdate {
  lead_status: 'enrolled';
  funnel_stage: '8';
  funnel_stage_updated_at: string;
  stage_history: StageHistoryEntry[];
}

/**
 * 결제 완료 시 학생 레코드에 적용할 업데이트 객체를 계산한다.
 * 멱등: stage_history에 이미 8 진입 기록이 있으면 이력을 중복 추가하지 않는다.
 */
export function buildEnrollmentUpdate(
  stageHistory: StageHistoryEntry[] | null | undefined,
  enrolledAt: string
): EnrollmentUpdate {
  const history = Array.isArray(stageHistory) ? stageHistory : [];
  const alreadyEnrolled = history.some((h) => h.stage === '8');
  return {
    lead_status: 'enrolled',
    funnel_stage: '8',
    funnel_stage_updated_at: enrolledAt,
    stage_history: alreadyEnrolled
      ? history
      : [...history, { stage: '8', label: '수업 중', entered_at: enrolledAt }],
  };
}
