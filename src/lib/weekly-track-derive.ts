import type {
  WeeklyFocusStrategy,
  WeeklyPlanAction,
  WeeklyTrack,
  WeeklyTrackItem,
} from '@/types/crm';

/** 트랙에 안 묶이는 잡일이 모이는 트랙 이름. */
export const MISC_TRACK_NAME = '기타';

/**
 * 트랙 체제 이전 주차(`weekly_plans.tracks IS NULL`)를 읽을 때 쓰는 파생.
 * 집중 전략 1건 → 트랙 1개, 할 일 전체 → '기타' 트랙 1개.
 *
 * 읽기 전용이다 — 사용자가 그 주차를 저장할 때 비로소 tracks 컬럼에 기록된다.
 * 그래서 이 함수 결과는 저장된 트랙과 id가 달라도 무해하다.
 */
export function deriveTracksFromLegacy(
  focus: WeeklyFocusStrategy[],
  actions: WeeklyPlanAction[],
): WeeklyTrack[] {
  const tracks: WeeklyTrack[] = (focus ?? []).map((f) => ({
    id: crypto.randomUUID(),
    name: f.strategy_name,
    goal_text: joinGoal(f.goal, f.memo),
    metric: null,
    target_value: 0,
    achieved: false,
    items: [
      {
        id: crypto.randomUUID(),
        text: f.strategy_name,
        done: false,
        done_at: null,
        strategy_id: f.strategy_id,
        strategy_name: f.strategy_name,
        strategy_type: f.type,
      },
    ],
    carried_from_week: f.carried_from_week ?? null,
  }));

  const misc: WeeklyTrackItem[] = (actions ?? [])
    .filter((a) => a.text.trim().length > 0)
    .map((a) => ({
      id: crypto.randomUUID(),
      text: a.text.trim(),
      done: Boolean(a.done),
      done_at: a.done_at ?? null,
      strategy_id: null,
      strategy_name: null,
      strategy_type: null,
    }));

  if (misc.length > 0) {
    tracks.push({
      id: crypto.randomUUID(),
      name: MISC_TRACK_NAME,
      goal_text: '',
      metric: null,
      target_value: 0,
      achieved: false,
      items: misc,
      carried_from_week: null,
    });
  }

  return tracks;
}

/** 목표와 메모를 한 문장으로 — 둘 중 하나만 있으면 그것만. */
function joinGoal(goal: string, memo: string): string {
  const g = (goal ?? '').trim();
  const m = (memo ?? '').trim();
  if (g && m) return `${g} — ${m}`;
  return g || m;
}
