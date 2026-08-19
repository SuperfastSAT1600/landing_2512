import {
  EMPTY_RETROSPECTIVE,
  WEEKLY_PLAN_METRIC_KEYS,
  WEEKLY_TRACK_METRIC_KEYS,
  type StrategyHistoryType,
  type WeeklyExecutionNote,
  type WeeklyFocusStrategy,
  type WeeklyPlan,
  type WeeklyPlanAction,
  type WeeklyPlanTarget,
  type WeeklyRetroNextAction,
  type WeeklyRetrospective,
  type WeeklyTrack,
  type WeeklyTrackItem,
  type WeeklyTrackMetric,
} from '@/types/crm';
import { deriveTracksFromLegacy } from '@/lib/weekly-track-derive';

// PUT /api/crm/weekly-plan 의 입력 정제 + 행 정규화 — 순수 함수(테스트 대상).
// 부분 업데이트 원칙: body에 있는 키만 패치에 담는다. 회고 저장이 할 일을 지우면 안 된다.

const STRATEGY_TYPES: StrategyHistoryType[] = ['initial_contact', 'initial_sales', 'retry'];

export interface WeeklyPlanPatch {
  tracks?: WeeklyTrack[];
  targets?: WeeklyPlanTarget[];
  actions?: WeeklyPlanAction[];
  focus_strategies?: WeeklyFocusStrategy[];
  retrospective?: WeeklyRetrospective;
  execution_notes?: WeeklyExecutionNote[];
}

const str = (v: unknown, fallback = '') => (typeof v === 'string' ? v : fallback);
const trimmed = (v: unknown) => str(v).trim();
const newId = () => crypto.randomUUID();

function sanitizeTargets(input: unknown): WeeklyPlanTarget[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter((t): t is Record<string, unknown> => !!t && typeof t === 'object')
    .filter((t) => WEEKLY_PLAN_METRIC_KEYS.includes(t.key as WeeklyPlanTarget['key']))
    .map((t) => ({
      key: t.key as WeeklyPlanTarget['key'],
      label: str(t.label),
      target_value: Number(t.target_value) || 0,
    }));
}

function sanitizeActions(input: unknown): WeeklyPlanAction[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter((a): a is Record<string, unknown> => !!a && typeof a === 'object')
    .filter((a) => typeof a.id === 'string' && typeof a.text === 'string')
    .map((a) => {
      const done = !!a.done;
      return {
        id: a.id as string,
        text: a.text as string,
        done,
        done_at: done ? str(a.done_at, new Date().toISOString()) : null,
        owner: typeof a.owner === 'string' ? a.owner : null,
      };
    });
}

function sanitizeFocusStrategies(input: unknown): WeeklyFocusStrategy[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter((f): f is Record<string, unknown> => !!f && typeof f === 'object')
    .filter((f) => typeof f.strategy_id === 'string' && f.strategy_id.length > 0)
    .filter((f) => STRATEGY_TYPES.includes(f.type as StrategyHistoryType))
    .map((f) => ({
      id: typeof f.id === 'string' && f.id ? f.id : newId(),
      strategy_id: f.strategy_id as string,
      strategy_name: str(f.strategy_name),
      type: f.type as StrategyHistoryType,
      goal: trimmed(f.goal),
      memo: trimmed(f.memo),
      carried_from_week: typeof f.carried_from_week === 'string' ? f.carried_from_week : null,
    }));
}

function sanitizeTrackItems(input: unknown): WeeklyTrackItem[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter((i): i is Record<string, unknown> => !!i && typeof i === 'object')
    .map((i) => {
      const done = !!i.done;
      const strategyId = typeof i.strategy_id === 'string' && i.strategy_id ? i.strategy_id : null;
      return {
        id: typeof i.id === 'string' && i.id ? i.id : newId(),
        text: trimmed(i.text),
        done,
        done_at: done ? str(i.done_at, new Date().toISOString()) : null,
        strategy_id: strategyId,
        strategy_name: strategyId ? str(i.strategy_name) : null,
        strategy_type: STRATEGY_TYPES.includes(i.strategy_type as StrategyHistoryType)
          ? (i.strategy_type as StrategyHistoryType)
          : null,
      };
    })
    .filter((i) => i.text.length > 0);
}

function sanitizeTracks(input: unknown): WeeklyTrack[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter((t): t is Record<string, unknown> => !!t && typeof t === 'object')
    .map((t) => ({
      id: typeof t.id === 'string' && t.id ? t.id : newId(),
      name: trimmed(t.name),
      goal_text: trimmed(t.goal_text),
      metric: WEEKLY_TRACK_METRIC_KEYS.includes(t.metric as WeeklyTrackMetric)
        ? (t.metric as WeeklyTrackMetric)
        : null,
      target_value: Math.max(0, Number(t.target_value) || 0),
      achieved: !!t.achieved,
      items: sanitizeTrackItems(t.items),
      carried_from_week: typeof t.carried_from_week === 'string' ? t.carried_from_week : null,
    }))
    // 이름·목표·항목이 모두 빈 트랙은 사용자가 의도한 내용이 없다.
    .filter((t) => t.name.length > 0 || t.goal_text.length > 0 || t.items.length > 0);
}

function sanitizeNextActions(input: unknown): WeeklyRetroNextAction[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter((n): n is Record<string, unknown> => !!n && typeof n === 'object')
    .map((n) => ({
      id: typeof n.id === 'string' && n.id ? n.id : newId(),
      text: trimmed(n.text),
      carried_to: typeof n.carried_to === 'string' ? n.carried_to : null,
    }))
    .filter((n) => n.text.length > 0);
}

function sanitizeRetro(input: unknown): WeeklyRetrospective {
  const src = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  return {
    went_well: str(src.went_well),
    went_wrong: str(src.went_wrong),
    next_actions: sanitizeNextActions(src.next_actions),
    updated_at: new Date().toISOString(),
  };
}

function sanitizeNotes(input: unknown): WeeklyExecutionNote[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter((n): n is Record<string, unknown> => !!n && typeof n === 'object')
    .map((n) => ({
      id: typeof n.id === 'string' && n.id ? n.id : newId(),
      text: trimmed(n.text),
      created_at: str(n.created_at, new Date().toISOString()),
    }))
    .filter((n) => n.text.length > 0);
}

/** body에 존재하는 키만 정제해 패치로 만든다. 없는 키는 건드리지 않는다. */
export function buildPlanPatch(body: Record<string, unknown>): WeeklyPlanPatch {
  const patch: WeeklyPlanPatch = {};
  if ('tracks' in body) patch.tracks = sanitizeTracks(body.tracks);
  if ('targets' in body) patch.targets = sanitizeTargets(body.targets);
  if ('actions' in body) patch.actions = sanitizeActions(body.actions);
  if ('focus_strategies' in body) patch.focus_strategies = sanitizeFocusStrategies(body.focus_strategies);
  if ('retrospective' in body) patch.retrospective = sanitizeRetro(body.retrospective);
  if ('execution_notes' in body) patch.execution_notes = sanitizeNotes(body.execution_notes);
  return patch;
}

/**
 * DB 행 → WeeklyPlan. 마이그레이션 112/116 이전에 만들어진 행도 기본값으로 채운다.
 *
 * tracks는 NULL(=트랙 체제 이전 주차)과 [](=사용자가 트랙을 모두 비운 상태)를 구분한다.
 * NULL일 때만 focus_strategies+actions에서 파생한다 — 안 그러면 지운 트랙이 되살아난다.
 */
export function normalizePlanRow(row: Record<string, unknown> | null | undefined): WeeklyPlan | null {
  if (!row) return null;
  const retro = row.retrospective as Partial<WeeklyRetrospective> | null | undefined;
  const legacyFocus = Array.isArray(row.focus_strategies)
    ? (row.focus_strategies as WeeklyFocusStrategy[])
    : [];
  const legacyActions = Array.isArray(row.actions) ? (row.actions as WeeklyPlanAction[]) : [];
  return {
    id: str(row.id),
    segment: row.segment as WeeklyPlan['segment'],
    week_start: str(row.week_start),
    tracks:
      row.tracks == null
        ? deriveTracksFromLegacy(legacyFocus, legacyActions)
        : sanitizeTracks(row.tracks),
    targets: Array.isArray(row.targets) ? (row.targets as WeeklyPlanTarget[]) : [],
    actions: legacyActions,
    focus_strategies: legacyFocus,
    retrospective: {
      went_well: str(retro?.went_well),
      went_wrong: str(retro?.went_wrong),
      next_actions: Array.isArray(retro?.next_actions) ? retro.next_actions : [],
      updated_at: typeof retro?.updated_at === 'string' ? retro.updated_at : null,
    },
    execution_notes: Array.isArray(row.execution_notes)
      ? (row.execution_notes as WeeklyExecutionNote[])
      : [],
    created_at: str(row.created_at),
    updated_at: str(row.updated_at),
  };
}

export { EMPTY_RETROSPECTIVE };
