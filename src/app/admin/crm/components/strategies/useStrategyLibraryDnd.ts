'use client';

import { useState } from 'react';
import { PointerSensor, useSensor, useSensors, DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import type { RetryStrategy, StrategyCategory } from '@/types/crm';

/**
 * 전략 카드를 다른 카테고리로 드래그하면 category_id를 바꿔 이동한다 (146).
 * over.id가 카테고리 id면 그대로, 다른 카드의 id면 그 카드가 속한 카테고리를 타깃으로
 * 삼는다 — SalesKanban.tsx의 컬럼/카드 폴백 로직과 동일.
 */
export function resolveTargetCategoryId(
  overId: string,
  strategies: RetryStrategy[],
  categories: StrategyCategory[]
): string | null {
  if (categories.some((c) => c.id === overId)) return overId;
  const overStrategy = strategies.find((s) => s.id === overId);
  return overStrategy?.category_id ?? null;
}

export function useStrategyLibraryDnd(
  strategies: RetryStrategy[],
  categories: StrategyCategory[],
  onMove: (strategyId: string, targetCategoryId: string) => void
) {
  const [activeStrategy, setActiveStrategy] = useState<RetryStrategy | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  function handleDragStart(event: DragStartEvent) {
    const strategy = strategies.find((s) => s.id === event.active.id);
    setActiveStrategy(strategy ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveStrategy(null);
    const { active, over } = event;
    if (!over) return;

    const strategy = strategies.find((s) => s.id === active.id);
    if (!strategy) return;

    const targetCategoryId = resolveTargetCategoryId(String(over.id), strategies, categories);
    if (!targetCategoryId || targetCategoryId === strategy.category_id) return;

    onMove(strategy.id, targetCategoryId);
  }

  return { sensors, activeStrategy, handleDragStart, handleDragEnd };
}
