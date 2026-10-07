'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';

interface Props {
  onCreate: (name: string) => Promise<unknown>;
}

export function AddCategoryButton({ onCreate }: Props) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    if (!name.trim()) return;
    setSaving(true);
    await onCreate(name.trim());
    setSaving(false);
    setName('');
    setCreating(false);
  }

  if (!creating) {
    return (
      <button
        onClick={() => setCreating(true)}
        className="flex items-center justify-center gap-1 w-full border border-dashed border-gray-200 rounded-xl p-5 text-sm text-gray-400 hover:text-blue-500 hover:border-blue-300 transition-colors"
      >
        <Plus size={14} />새 카테고리
      </button>
    );
  }

  return (
    <div className="border border-gray-200 rounded-xl p-5 flex flex-col gap-2">
      <input
        autoFocus
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setCreating(false);
          if (e.key === 'Enter') handleCreate();
        }}
        placeholder="카테고리 이름 입력..."
        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
      />
      <div className="flex gap-2">
        <button
          onClick={handleCreate}
          disabled={saving || !name.trim()}
          className="text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-3 py-1.5 rounded-lg transition-colors"
        >
          추가
        </button>
        <button onClick={() => setCreating(false)} className="text-xs text-gray-400 hover:text-gray-600 px-2">
          취소
        </button>
      </div>
    </div>
  );
}
