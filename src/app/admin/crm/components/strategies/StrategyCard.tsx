'use client';

import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Pencil, Check, X, Trash2 } from 'lucide-react';
import type { RetryStrategy } from '@/types/crm';

interface Props {
  strategy: RetryStrategy;
  adminKey: string;
  onUpdated: (id: string, name: string, description: string | null) => void;
  onDeleted: (id: string) => void;
}

export function StrategyCard({ strategy, adminKey, onUpdated, onDeleted }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: strategy.id });
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [saving, setSaving] = useState(false);

  function startEdit() {
    setEditing(true);
    setEditName(strategy.name);
    setEditDesc(strategy.description ?? '');
  }

  function cancelEdit() {
    setEditing(false);
  }

  async function handleSave() {
    if (!editName.trim()) return;
    setSaving(true);
    const res = await fetch(`/api/crm/retry-strategies/${strategy.id}`, {
      method: 'PATCH',
      headers: { 'x-admin-key': adminKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName.trim(), description: editDesc.trim() || null }),
    });
    if (res.ok) {
      onUpdated(strategy.id, editName.trim(), editDesc.trim() || null);
      setEditing(false);
    } else {
      alert('수정에 실패했습니다.');
    }
    setSaving(false);
  }

  async function handleDelete() {
    if (!confirm(`"${strategy.name}" 전략을 삭제할까요?`)) return;
    const res = await fetch(`/api/crm/retry-strategies/${strategy.id}`, {
      method: 'DELETE',
      headers: { 'x-admin-key': adminKey },
    });
    if (res.ok) {
      onDeleted(strategy.id);
    } else {
      alert('삭제에 실패했습니다.');
    }
  }

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  if (editing) {
    return (
      <li ref={setNodeRef} style={style} className="bg-gray-50 rounded-lg px-3 py-2">
        <div className="flex flex-col gap-2">
          <input
            autoFocus
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') cancelEdit();
              if (e.key === 'Enter' && !e.shiftKey) handleSave();
            }}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
          <textarea
            rows={3}
            value={editDesc}
            onChange={(e) => setEditDesc(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Escape') cancelEdit(); }}
            placeholder="전략 내용 (선택)..."
            className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving || !editName.trim()}
              className="flex items-center gap-1 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-3 py-1.5 rounded-lg transition-colors"
            >
              <Check size={12} /> 저장
            </button>
            <button
              onClick={cancelEdit}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 px-2"
            >
              <X size={12} /> 취소
            </button>
          </div>
        </div>
      </li>
    );
  }

  return (
    <li ref={setNodeRef} style={style} className="bg-gray-50 rounded-lg px-3 py-2" {...attributes}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1 cursor-grab active:cursor-grabbing" {...listeners}>
          <p className="text-sm text-gray-700 font-medium">{strategy.name}</p>
          {strategy.description && (
            <p className="text-xs text-gray-400 mt-0.5 whitespace-pre-wrap">{strategy.description}</p>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button onClick={startEdit} className="text-gray-300 hover:text-blue-500 transition-colors" title="수정">
            <Pencil size={13} />
          </button>
          <button onClick={handleDelete} className="text-gray-300 hover:text-red-500 transition-colors" title="삭제">
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </li>
  );
}
