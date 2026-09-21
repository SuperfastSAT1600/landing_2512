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
 * 이름들로 계산한다. 카테고리 1개 → 그 이름, 여러 개 → '·'로 이어붙임,
 * 0개(전략 없음) → 고정 폴백. 카테고리를 자유 이동해도 그대로 쓸 수 있도록
 * 1:1 매핑을 강제하지 않는다(146 참고).
 */
export function computeKindLabels(
  strategies: { kind: StrategyHistoryType; category_id: string }[],
  categories: { id: string; name: string }[]
): Record<StrategyHistoryType, string> {
  const categoryNameById = new Map(categories.map((c) => [c.id, c.name]));
  const namesByKind: Record<StrategyHistoryType, Set<string>> = {
    initial_contact: new Set(),
    initial_sales: new Set(),
    retry: new Set(),
  };

  for (const s of strategies) {
    const name = categoryNameById.get(s.category_id);
    if (name) namesByKind[s.kind]?.add(name);
  }

  const labels = { ...DEFAULT_LABELS };
  for (const kind of KINDS) {
    const names = namesByKind[kind];
    if (names.size > 0) labels[kind] = [...names].join(' · ');
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
