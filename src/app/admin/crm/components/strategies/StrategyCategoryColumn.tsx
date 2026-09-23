'use client';

import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { RetryStrategy, StrategyCategory } from '@/types/crm';
import { StrategyCategoryHeader } from './StrategyCategoryHeader';
import { StrategyCreateForm } from './StrategyCreateForm';
import { StrategyCard } from './StrategyCard';

interface Props {
  category: StrategyCategory;
  strategies: RetryStrategy[];
  segment: 'b2c' | 'b2b';
  adminKey: string;
  onRenameCategory: (id: string, name: string) => Promise<boolean>;
  onDeleteCategory: (id: string) => Promise<boolean>;
  onCreated: (s: RetryStrategy) => void;
  onUpdated: (id: string, name: string, description: string | null) => void;
  onDeleted: (id: string) => void;
}

export function StrategyCategoryColumn({
  category,
  strategies,
  segment,
  adminKey,
  onRenameCategory,
  onDeleteCategory,
  onCreated,
  onUpdated,
  onDeleted,
}: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: category.id });
  const [creating, setCreating] = useState(false);

  return (
    <div
      ref={setNodeRef}
      className={`border rounded-xl p-5 transition-colors ${isOver ? 'border-blue-400 bg-blue-50/40' : 'border-gray-200'}`}
    >
      <StrategyCategoryHeader
        category={category}
        isEmpty={strategies.length === 0}
        onRename={onRenameCategory}
        onDelete={onDeleteCategory}
        onAddStrategy={() => setCreating((v) => !v)}
      />

      {creating && (
        <StrategyCreateForm
          categoryId={category.id}
          segment={segment}
          adminKey={adminKey}
          onCreated={(s) => { onCreated(s); setCreating(false); }}
          onCancel={() => setCreating(false)}
        />
      )}

      {strategies.length === 0 ? (
        <p className="text-xs text-gray-400 py-2">등록된 전략이 없습니다. 다른 카테고리에서 카드를 끌어오거나 새로 만드세요.</p>
      ) : (
        <SortableContext items={strategies.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          <ul className="space-y-2">
            {strategies.map((s) => (
              <StrategyCard key={s.id} strategy={s} adminKey={adminKey} onUpdated={onUpdated} onDeleted={onDeleted} />
            ))}
          </ul>
        </SortableContext>
      )}
    </div>
  );
}
