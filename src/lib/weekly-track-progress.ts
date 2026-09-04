import type {
  WeeklyExecutionLead,
  WeeklyExecutionRow,
  WeeklyTrack,
  WeeklyTrackMetric,
} from '@/types/crm';
import type { WeeklyFocusRef } from '@/lib/weekly-execution';

/**
 * 트랙 진행률 — 트랙에 연결된 전략의 적용 리드 합집합 기준.
 *
 * 주 전체 실적(`WeeklyPlanResponse.actuals`)을 쓰지 않는 이유: 한 주에 트랙이 여럿이면
 * "신규리드 결제 2건"과 "이탈 리드 캠페인 결제 2건"은 서로 다른 리드 집합이다.
 * 주 전체 paid를 두 트랙에 똑같이 보여주면 둘 다 틀린 숫자가 된다.
 */
export interface WeeklyTrackProgress {
  applied: number;
  contacted: number;
  paid: number;
  revenue: number;
  /** student_id 중복 제거, 적용 시각 최신순 */
  leads: WeeklyExecutionLead[];
  /** metric 기준 현재값 (metric이 null이면 0) */
  value: number;
  /** 달성률(%) — metric과 target_value(>0)가 모두 있을 때만 */
  pct: number | null;
  linkedStrategyIds: string[];
}

/** 트랙 항목에 연결된 전략 id — 중복 제거, 항목 순서 유지. */
function linkedIds(track: WeeklyTrack): string[] {
  const seen = new Set<string>();
  for (const item of track.items ?? []) {
    if (item.strategy_id) seen.add(item.strategy_id);
  }
  return [...seen];
}

const METRIC_VALUE: Record<WeeklyTrackMetric, (p: WeeklyTrackProgress) => number> = {
  applied: (p) => p.applied,
  contacted: (p) => p.contacted,
  paid: (p) => p.paid,
  revenue: (p) => p.revenue,
};

export function computeTrackProgress(
  track: WeeklyTrack,
  execution: WeeklyExecutionRow[],
): WeeklyTrackProgress {
  const ids = linkedIds(track);
  const linked = new Set(ids);

  // 한 리드가 트랙 내 여러 전략을 받을 수 있으므로 리드 단위로 합친다(적용 시각은 최신 것).
  const byLead = new Map<string, WeeklyExecutionLead>();
  for (const row of execution) {
    if (!linked.has(row.strategy_id)) continue;
    for (const lead of row.leads) {
      const prev = byLead.get(lead.student_id);
      if (!prev || lead.applied_at > prev.applied_at) byLead.set(lead.student_id, lead);
    }
  }

  const leads = [...byLead.values()].sort((a, b) => b.applied_at.localeCompare(a.applied_at));
  const progress: WeeklyTrackProgress = {
    applied: leads.length,
    contacted: leads.filter((l) => l.contacted).length,
    paid: leads.filter((l) => l.paid).length,
    revenue: leads.reduce((n, l) => n + l.revenue, 0),
    leads,
    value: 0,
    pct: null,
    linkedStrategyIds: ids,
  };

  if (!track.metric) return progress;
  progress.value = METRIC_VALUE[track.metric](progress);
  progress.pct =
    track.target_value > 0 ? Math.round((progress.value / track.target_value) * 100) : null;
  return progress;
}

/** 어느 트랙에도 연결되지 않은 전략 실행 → '계획 외 실행'. */
export function unplannedRows(
  tracks: WeeklyTrack[],
  execution: WeeklyExecutionRow[],
): WeeklyExecutionRow[] {
  const linked = new Set(tracks.flatMap(linkedIds));
  return execution.filter((row) => !linked.has(row.strategy_id));
}

/**
 * 트랙 항목의 전략 스냅샷 → `fetchWeeklyExecution`의 planned 판정용.
 * 스냅샷이 비어 있어도(구 데이터) 집계는 strategy_id로 하므로 안전한 기본값을 채운다.
 */
export function trackStrategyRefs(tracks: WeeklyTrack[]): WeeklyFocusRef[] {
  const refs = new Map<string, WeeklyFocusRef>();
  for (const track of tracks) {
    for (const item of track.items ?? []) {
      if (!item.strategy_id || refs.has(item.strategy_id)) continue;
      refs.set(item.strategy_id, {
        strategy_id: item.strategy_id,
        strategy_name: item.strategy_name ?? '',
        type: item.strategy_type ?? 'initial_sales',
      });
    }
  }
  return [...refs.values()];
}
