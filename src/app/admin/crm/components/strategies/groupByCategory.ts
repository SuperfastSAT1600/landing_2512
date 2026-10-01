import type { StrategyHistoryEntry } from '@/types/crm';
import { effectivePhase } from '@/lib/strategy-history';

/** 현재 카테고리를 찾을 수 없는 엔트리(삭제된 전략 등)를 모으는 그룹 이름. */
export const ORPHAN_GROUP_LABEL = '분류 없음';

export interface CategoryRef {
  id: string;
  name: string;
  sort_order: number;
}

export interface StrategyRef {
  id: string;
  name: string;
  category_id: string;
}

export interface HistoryGroup {
  /** 카테고리 id. 끊긴 엔트리 그룹은 null. */
  id: string | null;
  label: string;
  /** 이 그룹에 속한 기록 전부 — 총계·'분류 없음' 목록용. */
  entries: StrategyHistoryEntry[];
  /** 진행 전 슬롯(최신 1건). 없으면 null. */
  planned: StrategyHistoryEntry | null;
  /** 진행 후 슬롯(최신 1건). phase 없는 기존 기록도 여기로 온다. */
  applied: StrategyHistoryEntry | null;
  /** 이 그룹에서 새로 적용할 수 있는 전략. */
  strategies: StrategyRef[];
  /** 전략 추가가 가능한 그룹인가. 끊긴 엔트리 그룹은 불가. */
  addable: boolean;
}

/**
 * 전략 히스토리를 **전략 라이브러리 카테고리**로 묶는다.
 *
 * 엔트리에는 kind(`type`)만 스냅샷돼 있지만 그걸로 묶지 않는다 — 한 카테고리에 여러 kind가
 * 섞여 있어(146 이후) kind로는 사용자가 보는 그룹을 표현할 수 없다. 대신 `strategy_id` 로
 * 전략의 **현재** 카테고리를 찾는다. 라이브러리에서 전략을 다른 카테고리로 옮기면 과거 기록도
 * 따라 움직이는데, 이는 "라이브러리가 기준"이라는 사용자 기대와 같은 방향이다.
 *
 * 카테고리를 찾을 수 없는 엔트리(대부분 이미 삭제된 전략)는 버리지 않고 마지막 그룹에 모은다 —
 * 실측 258건 중 70건(27%)이 여기 해당해서, 숨기면 기록의 1/4이 사라진다.
 */
export function groupHistoryByCategory(
  history: StrategyHistoryEntry[],
  categories: CategoryRef[],
  strategies: StrategyRef[]
): HistoryGroup[] {
  const categoryOf = new Map(strategies.map((s) => [s.id, s.category_id]));
  const ordered = [...categories].sort((a, b) => a.sort_order - b.sort_order);

  const groups: HistoryGroup[] = ordered.map((c) => ({
    id: c.id,
    label: c.name,
    entries: [],
    planned: null,
    applied: null,
    strategies: strategies.filter((s) => s.category_id === c.id),
    addable: true,
  }));
  const byId = new Map(groups.map((g) => [g.id, g]));

  const orphan: HistoryGroup = {
    id: null,
    label: ORPHAN_GROUP_LABEL,
    entries: [],
    planned: null,
    applied: null,
    strategies: [],
    addable: false,
  };

  for (const e of history) {
    const group = byId.get(categoryOf.get(e.strategy_id) ?? '');
    (group ?? orphan).entries.push(e);
  }

  // 슬롯은 카테고리 안에서 최신 1건씩. 저장은 슬롯을 교체하지만(upsertPhaseEntry),
  // 과거에 쌓인 중복이나 카테고리 이동으로 2건이 될 수 있어 여기서도 최신을 고른다.
  for (const g of groups) {
    g.planned = newestOfPhase(g.entries, 'planned');
    g.applied = newestOfPhase(g.entries, 'applied');
  }

  return orphan.entries.length ? [...groups, orphan] : groups;
}

function newestOfPhase(
  entries: StrategyHistoryEntry[],
  phase: 'planned' | 'applied'
): StrategyHistoryEntry | null {
  let best: StrategyHistoryEntry | null = null;
  for (const e of entries) {
    if (effectivePhase(e) !== phase) continue;
    if (!best || String(e.applied_at) >= String(best.applied_at)) best = e;
  }
  return best;
}
