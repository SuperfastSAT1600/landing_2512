import { Student, ChurnType, TrafficSource, FUNNEL_STAGE_LABELS } from '@/types/crm';
import { FUNNEL_FLOW_ORDER, effectiveChurnStage } from '@/lib/funnel-stats';
import { daysSince } from '../../lib/format';

// ─── Filters ──────────────────────────────────────────────────────────────────

// 이탈 단계 필터에서 '미상'(stage_history 없음)을 가리키는 sentinel
export const CHURN_STAGE_NONE = '__none__';

export interface LeadPoolFilters {
  churnTag: string;
  churnType: ChurnType | '';
  churnStage: string; // 이탈 직전 단계 코드, 또는 CHURN_STAGE_NONE
  grade: string;
  trafficSource: TrafficSource | '';
  daysSinceChurn: '30' | '60' | '90' | '180' | '';
  keyword: string;
}

export const DEFAULT_FILTERS: LeadPoolFilters = {
  churnTag: '',
  churnType: '',
  churnStage: '',
  grade: '',
  trafficSource: '',
  daysSinceChurn: '',
  keyword: '',
};

export type PoolTab = 'inactive' | 'reactivating' | 'plays';

export const POOL_PAGE_SIZE = 50;

export interface ChurnStageGroup {
  key: string;
  label: string;
  count: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// updated_at이 lead_status 변경 시 갱신되므로 이탈 경과일 기준으로 사용
export function churnedDaysAgo(student: Student): number {
  return daysSince(student.updated_at);
}

// ─── Tab base lists ─────────────────────────────────────────────────────────

export function splitByLeadStatus(students: Student[]) {
  return {
    inactive: students.filter((s) => s.lead_status === 'inactive'),
    reactivating: students.filter((s) => s.lead_status === 'reactivating'),
  };
}

// ─── Filtered list (inactive tab only) ─────────────────────────────────────

export function matchesFilters(s: Student, filters: LeadPoolFilters): boolean {
  // churn_tag는 "{태그}: {사유}"로 저장되므로 카테고리 prefix로 매칭 (bare 태그도 매칭됨)
  if (filters.churnTag && !(s.churn_tag ?? '').startsWith(filters.churnTag)) return false;
  if (filters.churnType && s.churn_type !== filters.churnType) return false;
  if (filters.churnStage) {
    const cs = effectiveChurnStage(s);
    if (filters.churnStage === CHURN_STAGE_NONE ? cs !== null : cs !== filters.churnStage)
      return false;
  }
  if (filters.grade && s.grade !== filters.grade) return false;
  if (filters.trafficSource && s.traffic_source !== filters.trafficSource) return false;

  if (filters.daysSinceChurn) {
    const threshold = parseInt(filters.daysSinceChurn, 10);
    if (churnedDaysAgo(s) > threshold) return false;
  }

  if (filters.keyword) {
    const kw = filters.keyword.toLowerCase();
    const hit = (s.consultation_timeline ?? []).some(
      (e) => e.ai_purified?.toLowerCase().includes(kw) || e.raw_memo?.toLowerCase().includes(kw)
    );
    if (!hit) return false;
  }

  return true;
}

export function filterInactiveStudents(inactive: Student[], filters: LeadPoolFilters): Student[] {
  return inactive.filter((s) => matchesFilters(s, filters));
}

// 이탈 단계별 건수 (전체 이탈 학생 기준, 퍼널 순서 + 미상)
export function buildChurnStageGroups(inactive: Student[]): ChurnStageGroup[] {
  const counts = new Map<string, number>();
  for (const s of inactive) {
    const key = effectiveChurnStage(s) ?? CHURN_STAGE_NONE;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const ordered: ChurnStageGroup[] = [];
  for (const stage of FUNNEL_FLOW_ORDER) {
    const c = counts.get(stage);
    if (c) ordered.push({ key: stage, label: FUNNEL_STAGE_LABELS[stage], count: c });
  }
  const none = counts.get(CHURN_STAGE_NONE);
  if (none) ordered.push({ key: CHURN_STAGE_NONE, label: '미상', count: none });
  return ordered;
}

// ─── Grade options ─────────────────────────────────────────────────────────

export function listGradeOptions(inactive: Student[]): string[] {
  return Array.from(new Set(inactive.map((s) => s.grade))).sort();
}

// ─── Summary stats ─────────────────────────────────────────────────────────

export function computeSuccessRate(students: Student[]): number | null {
  const allEntries = students.flatMap((s) => s.reactivation_log ?? []);
  const decided = allEntries.filter((e) => e.outcome !== 'pending');
  const reactivated = allEntries.filter((e) => e.outcome === 'reactivated');
  if (decided.length === 0) return null;
  return Math.round((reactivated.length / decided.length) * 100);
}
