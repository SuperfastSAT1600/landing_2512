'use client';

import { useEffect, useState } from 'react';
import { DndContext, DragOverlay } from '@dnd-kit/core';
import type { RetryStrategy } from '@/types/crm';
import { useStrategyCategories } from './useStrategyCategories';
import { useStrategyLibraryDnd } from './useStrategyLibraryDnd';
import { StrategyCategoryColumn } from './StrategyCategoryColumn';
import { AddCategoryButton } from './AddCategoryButton';
import { StrategyCard } from './StrategyCard';

interface Props {
  adminKey: string;
  segment: 'b2c' | 'b2b';
}

export function StrategyLibrary({ adminKey, segment }: Props) {
  const { categories, loading: categoriesLoading, create, rename, remove } = useStrategyCategories(segment, adminKey);
  const [strategies, setStrategies] = useState<RetryStrategy[]>([]);
  const [loadingStrategies, setLoadingStrategies] = useState(true);

  useEffect(() => {
    let alive = true;
    fetch(`/api/crm/retry-strategies?segment=${segment}`, { headers: { 'x-admin-key': adminKey } })
      .then((r) => r.json())
      .then((json) => {
        if (!alive) return;
        setStrategies(json.data ?? []);
        setLoadingStrategies(false);
      })
      .catch(() => { if (alive) setLoadingStrategies(false); });
    return () => { alive = false; };
  }, [segment, adminKey]);

  function handleCreated(s: RetryStrategy) {
    setStrategies((prev) => [...prev, s]);
  }
  function handleUpdated(id: string, name: string, description: string | null) {
    setStrategies((prev) => prev.map((s) => (s.id === id ? { ...s, name, description } : s)));
  }
  function handleDeleted(id: string) {
    setStrategies((prev) => prev.filter((s) => s.id !== id));
  }

  async function handleMove(strategyId: string, targetCategoryId: string) {
    setStrategies((prev) => prev.map((s) => (s.id === strategyId ? { ...s, category_id: targetCategoryId } : s)));
    await fetch(`/api/crm/retry-strategies/${strategyId}`, {
      method: 'PATCH',
      headers: { 'x-admin-key': adminKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ category_id: targetCategoryId }),
    });
  }

  const { sensors, activeStrategy, handleDragStart, handleDragEnd } = useStrategyLibraryDnd(
    strategies,
    categories,
    handleMove
  );

  if (categoriesLoading || loadingStrategies) {
    return <div className="text-sm text-gray-400 py-8 text-center">불러오는 중...</div>;
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-400">
        전략을 만들고 학생 패널의 인입 정보에서 배정할 수 있습니다. 카드를 드래그해 다른 카테고리로 옮길 수 있습니다.
      </p>
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="space-y-4">
          {categories.map((category) => (
            <StrategyCategoryColumn
              key={category.id}
              category={category}
              strategies={strategies.filter((s) => s.category_id === category.id)}
              segment={segment}
              adminKey={adminKey}
              onRenameCategory={rename}
              onDeleteCategory={remove}
              onCreated={handleCreated}
              onUpdated={handleUpdated}
              onDeleted={handleDeleted}
            />
          ))}
          <AddCategoryButton onCreate={create} />
        </div>

        <DragOverlay>
          {activeStrategy && (
            <div className="w-[300px]">
              <ul>
                <StrategyCard strategy={activeStrategy} adminKey={adminKey} onUpdated={() => {}} onDeleted={() => {}} />
              </ul>
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
