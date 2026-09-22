'use client';

import { useEffect, useState } from 'react';
import type { StrategyHistoryType } from '@/types/crm';

const DEFAULT_LABELS: Record<StrategyHistoryType, string> = {
  initial_contact: '최초 컨텍 전략',
  initial_sales: '최초 세일즈 전략',
  retry: '재시도 세일즈 전략',
};

const KINDS: StrategyHistoryType[] = ['initial_contact', 'initial_sales', 'retry'];

/**
 * kind(기능 분류)별 제목을, 그 kind에 실제로 속한 전략들이 현재 속한 카테고리
 * 이름으로 계산한다. 카테고리를 자유 이동·분할해도 쓸 수 있도록 1:1 매핑을
 * 강제하지 않지만(146 참고), 여러 카테고리에 걸쳐 있어도 제목엔 하나만 보여준다
 * — 라이브러리 표시 순서(sort_order)상 가장 먼저인 카테고리를 대표로 쓴다.
 * 전략이 하나도 없으면 고정 폴백.
 */
export function computeKindLabels(
  strategies: { kind: StrategyHistoryType; category_id: string }[],
  categories: { id: string; name: string; sort_order: number }[]
): Record<StrategyHistoryType, string> {
  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const categoryIdsByKind: Record<StrategyHistoryType, Set<string>> = {
    initial_contact: new Set(),
    initial_sales: new Set(),
    retry: new Set(),
  };

  for (const s of strategies) {
    if (categoryById.has(s.category_id)) categoryIdsByKind[s.kind]?.add(s.category_id);
  }

  const labels = { ...DEFAULT_LABELS };
  for (const kind of KINDS) {
    const ids = categoryIdsByKind[kind];
    if (ids.size === 0) continue;
    const representative = [...ids]
      .map((id) => categoryById.get(id)!)
      .sort((a, b) => a.sort_order - b.sort_order)[0];
    labels[kind] = representative.name;
  }
  return labels;
}

export function useKindLabels(segment: 'b2c' | 'b2b', adminKey: string): Record<StrategyHistoryType, string> {
  const [labels, setLabels] = useState<Record<StrategyHistoryType, string>>(DEFAULT_LABELS);

  useEffect(() => {
    let alive = true;
    Promise.all([
      fetch(`/api/crm/retry-strategies?segment=${segment}`, { headers: { 'x-admin-key': adminKey } }).then((r) => r.json()),
      fetch(`/api/crm/strategy-categories?segment=${segment}`, { headers: { 'x-admin-key': adminKey } }).then((r) => r.json()),
    ])
      .then(([stratJson, catJson]) => {
        if (!alive) return;
        setLabels(computeKindLabels(stratJson.data ?? [], catJson.data ?? []));
      })
      .catch(() => { if (alive) setLabels(DEFAULT_LABELS); });
    return () => { alive = false; };
  }, [segment, adminKey]);

  return labels;
}
