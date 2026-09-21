'use client';

import { useState } from 'react';
import { Plus, Pencil, Check, X, Trash2 } from 'lucide-react';
import type { StrategyCategory } from '@/types/crm';

interface Props {
  category: StrategyCategory;
  isEmpty: boolean;
  onRename: (id: string, name: string) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  onAddStrategy: () => void;
}

export function StrategyCategoryHeader({ category, isEmpty, onRename, onDelete, onAddStrategy }: Props) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  function startEdit() {
    setEditing(true);
    setName(category.name);
  }

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    const ok = await onRename(category.id, name.trim());
    setSaving(false);
    if (ok) setEditing(false);
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2 mb-4">
        <input
          autoFocus
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setEditing(false);
            if (e.key === 'Enter') handleSave();
          }}
          className="text-sm font-semibold border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        />
        <button
          onClick={handleSave}
          disabled={saving || !name.trim()}
          className="text-gray-400 hover:text-blue-600 disabled:opacity-50"
        >
          <Check size={14} />
        </button>
        <button onClick={() => setEditing(false)} className="text-gray-400 hover:text-gray-600">
          <X size={14} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-1.5 group">
        <h3 className="text-sm font-semibold text-gray-800">{category.name}</h3>
        <button onClick={startEdit} className="text-gray-300 hover:text-blue-500 transition-colors" title="이름 변경">
          <Pencil size={12} />
        </button>
        {isEmpty && (
          <button onClick={() => onDelete(category.id)} className="text-gray-300 hover:text-red-500 transition-colors" title="카테고리 삭제">
            <Trash2 size={12} />
          </button>
        )}
      </div>
      <button
        onClick={onAddStrategy}
        className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
      >
        <Plus size={13} />새 전략
      </button>
    </div>
  );
}
