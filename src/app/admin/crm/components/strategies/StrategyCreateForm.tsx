'use client';

import { useState } from 'react';
import type { RetryStrategy } from '@/types/crm';

interface Props {
  categoryId: string;
  segment: 'b2c' | 'b2b';
  adminKey: string;
  onCreated: (s: RetryStrategy) => void;
  onCancel: () => void;
}

export function StrategyCreateForm({ categoryId, segment, adminKey, onCreated, onCancel }: Props) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [adding, setAdding] = useState(false);

  async function handleCreate() {
    if (!name.trim()) return;
    setAdding(true);
    const res = await fetch('/api/crm/retry-strategies', {
      method: 'POST',
      headers: { 'x-admin-key': adminKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name.trim(),
        description: description.trim() || undefined,
        category_id: categoryId,
        segment,
      }),
    });
    if (res.ok) {
      const json = await res.json();
      onCreated(json.data);
    } else {
      alert('전략 생성에 실패했습니다.');
    }
    setAdding(false);
  }

  return (
    <div className="flex flex-col gap-2 mb-3">
      <input
        autoFocus
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Escape') onCancel(); }}
        placeholder="전략 이름 입력..."
        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
      />
      <textarea
        rows={3}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="전략 내용 입력 (선택)..."
        className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20"
      />
      <div className="flex gap-2">
        <button
          onClick={handleCreate}
          disabled={adding || !name.trim()}
          className="text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-3 py-1.5 rounded-lg transition-colors"
        >
          추가
        </button>
        <button onClick={onCancel} className="text-xs text-gray-400 hover:text-gray-600 px-2">
          취소
        </button>
      </div>
    </div>
  );
}
