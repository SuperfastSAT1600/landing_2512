import type { Student } from '@/types/crm';
import { daysInStage, isStageStalled, FUNNEL_STAGE_SLA_DAYS } from '@/types/crm';

// 리드 건강도 배지 — 기존 신호(SLA 정체·미접촉일)만 조합. 신규 데이터 없음.
// normal(정상) / watch(주의) / risk(위험). 수업중(8)·이탈은 세일즈 대상이 아니라 배지 없음(null).

export type LeadHealthLevel = 'normal' | 'watch' | 'risk';

export interface LeadHealth {
  level: LeadHealthLevel;
  label: string; // '정상' | '주의' | '위험'
  reason: string; // 사람이 읽는 사유 (예: '3일 정체 · SLA 2일 초과')
}

const LABELS: Record<LeadHealthLevel, string> = {
  normal: '정상',
  watch: '주의',
  risk: '위험',
};

type HealthInput = Pick<
  Student,
  'funnel_stage' | 'funnel_stage_updated_at' | 'created_at' | 'lead_status' | 'last_contacted_at' | 'retry_strategy_id'
>;

const DAY = 86_400_000;

/**
 * 리드 건강도 판정. 세일즈 진행 중인 활성 리드에만 의미가 있으므로
 * 수업중(funnel_stage '8')·이탈(churned)·비활성 리드는 null(배지 미표시).
 */
export function leadHealth(s: HealthInput, nowMs: number = Date.now()): LeadHealth | null {
  // 세일즈 대상이 아닌 리드는 배지 없음
  if (s.funnel_stage === '8' || s.funnel_stage === 'churned') return null;
  if (s.lead_status !== 'active') return null;

  const stalled = isStageStalled(s, nowMs);
  const inStage = daysInStage(s, nowMs);
  const sla = FUNNEL_STAGE_SLA_DAYS[s.funnel_stage];

  const noContactDays = s.last_contacted_at
    ? Math.floor((nowMs - new Date(s.last_contacted_at).getTime()) / DAY)
    : null;

  // ── 위험: 단계 정체 or 14일+ 미접촉 ──
  if (stalled && inStage !== null && sla !== undefined) {
    return { level: 'risk', label: LABELS.risk, reason: `${inStage}일 정체 · SLA ${sla}일 초과` };
  }
  if (noContactDays !== null && noContactDays >= 14) {
    return { level: 'risk', label: LABELS.risk, reason: `${noContactDays}일 미접촉` };
  }

  // ── 주의: 5~13일 미접촉, or SLA 임박(경과 == SLA) ──
  if (noContactDays !== null && noContactDays >= 5) {
    return { level: 'watch', label: LABELS.watch, reason: `${noContactDays}일 미접촉` };
  }
  if (sla !== undefined && inStage !== null && inStage === sla) {
    return { level: 'watch', label: LABELS.watch, reason: `SLA(${sla}일) 임박` };
  }

  return { level: 'normal', label: LABELS.normal, reason: '정상 진행' };
}

/** 배지 색상 클래스 (미니멀·플랫 팔레트에 맞춘 점 표시용). */
export const LEAD_HEALTH_DOT: Record<LeadHealthLevel, string> = {
  normal: 'bg-emerald-400',
  watch: 'bg-amber-400',
  risk: 'bg-rose-500',
};

export const LEAD_HEALTH_TEXT: Record<LeadHealthLevel, string> = {
  normal: 'text-emerald-600',
  watch: 'text-amber-600',
  risk: 'text-rose-600',
};
