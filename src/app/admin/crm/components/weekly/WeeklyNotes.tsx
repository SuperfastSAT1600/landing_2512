'use client';

import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { WeeklyExecutionNote } from '@/types/crm';
import { shortDay } from './format';

interface Props {
  notes: WeeklyExecutionNote[];
  onChange: (notes: WeeklyExecutionNote[]) => void;
}

/** 자동 집계 밖 활동 기록 — 인스타 DM 대량발송처럼 리드 단위로 남지 않는 실행. */
export function WeeklyNotes({ notes, onChange }: Props) {
  const [text, setText] = useState('');

  const add = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setText('');
    onChange([...notes, { id: crypto.randomUUID(), text: trimmed, created_at: new Date().toISOString() }]);
  };
  const remove = (id: string) => onChange(notes.filter((n) => n.id !== id));

  return (
    <div className="mt-4">
      <p className="text-[11px] font-semibold text-gray-400 mb-1.5">보완 기록 (리드 단위로 안 남는 실행)</p>
      {notes.length > 0 && (
        <ul className="space-y-1 mb-1.5">
          {notes.map((n) => (
            <li key={n.id} className="flex items-center gap-2 group">
              <span className="text-[10px] text-gray-400 shrink-0">{shortDay(n.created_at)}</span>
              <span className="text-xs text-gray-700 flex-1">{n.text}</span>
              <button
                onClick={() => remove(n.id)}
                className="text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 size={12} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex items-center gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') add(); }}
          placeholder="예: 인스타 DM 40건 발송"
          className="flex-1 text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
        />
        <button
          onClick={add}
          className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
        >
          <Plus size={12} /> 기록
        </button>
      </div>
    </div>
  );
}
