'use client';

import { useState } from 'react';
import { Check, Plus, Trash2 } from 'lucide-react';
import type { WeeklyPlanAction } from '@/types/crm';

interface Props {
  actions: WeeklyPlanAction[];
  onChange: (actions: WeeklyPlanAction[]) => void;
}

/** 이번 주 할 일 체크리스트. 회고 '다음 주에 할 것' 이어받기 항목도 여기로 들어온다. */
export function WeeklyActions({ actions, onChange }: Props) {
  const [text, setText] = useState('');

  const add = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setText('');
    onChange([...actions, { id: crypto.randomUUID(), text: trimmed, done: false, done_at: null }]);
  };
  const toggle = (id: string) =>
    onChange(
      actions.map((a) =>
        a.id === id ? { ...a, done: !a.done, done_at: !a.done ? new Date().toISOString() : null } : a,
      ),
    );
  const remove = (id: string) => onChange(actions.filter((a) => a.id !== id));

  const doneCount = actions.filter((a) => a.done).length;

  return (
    <section>
      <p className="text-xs font-semibold text-gray-400 mb-3">
        이번 주 할 일 <span className="text-gray-300 font-normal">({doneCount}/{actions.length})</span>
      </p>
      <div className="space-y-1.5">
        {actions.map((a) => (
          <div key={a.id} className="flex items-center gap-2.5 group">
            <button
              onClick={() => toggle(a.id)}
              className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                a.done ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              {a.done && <Check size={11} strokeWidth={3} />}
            </button>
            <span className={`text-sm flex-1 ${a.done ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
              {a.text}
            </span>
            <button
              onClick={() => remove(a.id)}
              className="text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))}
        {actions.length === 0 && <p className="text-sm text-gray-400 py-4 text-center">할 일을 추가하세요.</p>}
      </div>
      <div className="flex items-center gap-2 mt-3">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') add(); }}
          placeholder="할 일 추가…"
          className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
        />
        <button
          onClick={add}
          className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg"
        >
          <Plus size={13} /> 추가
        </button>
      </div>
    </section>
  );
}
