'use client';

import { useState } from 'react';
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ChevronDown, ChevronUp, GripVertical } from 'lucide-react';

export interface OrderItem { slug: string; name: string }

interface RowProps { item: OrderItem; index: number; last: number; move: (from: number, to: number) => void }

function Row({ item, index, last, move }: RowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.slug });
  return (
    <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-2 rounded-lg border bg-white px-2 py-1.5 text-sm ${isDragging ? 'border-blue-300 shadow' : 'border-gray-200'}`}>
      <button {...attributes} {...listeners} aria-label={`${item.name} 끌어서 이동`} className="cursor-grab text-gray-300 hover:text-gray-500">
        <GripVertical size={14} />
      </button>
      <span className="w-6 text-right text-[11px] text-gray-400">{index + 1}</span>
      <span className="flex-1 truncate">{item.name}</span>
      <button aria-label={`${item.name} 위로`} disabled={index === 0} onClick={() => move(index, index - 1)} className="p-0.5 text-gray-400 hover:text-gray-700 disabled:opacity-20"><ChevronUp size={14} /></button>
      <button aria-label={`${item.name} 아래로`} disabled={index === last} onClick={() => move(index, index + 1)} className="p-0.5 text-gray-400 hover:text-gray-700 disabled:opacity-20"><ChevronDown size={14} /></button>
    </li>
  );
}

interface Props { initial: OrderItem[]; saving: boolean; error: string | null; onSave: (slugs: string[]) => void; onCancel: () => void }

// 코치 순서 편집 — 끌거나 화살표로 옮기고 저장한다(coaches.sort_order)
export function CoachOrderEditor({ initial, saving, error, onSave, onCancel }: Props) {
  const [items, setItems] = useState(initial);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const move = (from: number, to: number) => setItems((xs) => arrayMove(xs, from, to));
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    move(items.findIndex((x) => x.slug === active.id), items.findIndex((x) => x.slug === over.id));
  };

  return (
    <div className="max-w-md space-y-3">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={items.map((x) => x.slug)} strategy={verticalListSortingStrategy}>
          <ol className="space-y-1">
            {items.map((item, i) => <Row key={item.slug} item={item} index={i} last={items.length - 1} move={move} />)}
          </ol>
        </SortableContext>
      </DndContext>
      {error && <p role="alert" className="text-[12px] text-red-500">{error}</p>}
      <div className="flex gap-2">
        <button onClick={() => onSave(items.map((x) => x.slug))} disabled={saving} className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50">
          {saving ? '저장 중…' : '순서 저장'}
        </button>
        <button onClick={onCancel} disabled={saving} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600">취소</button>
      </div>
    </div>
  );
}
