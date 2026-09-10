'use client';

import { useEffect, useState } from 'react';
import { ArrowRight, Check, Plus, Trash2 } from 'lucide-react';
import type { WeeklyRetroNextAction, WeeklyRetrospective } from '@/types/crm';

interface Props {
  /** 섹션 제목 — 세그먼트를 표기해 어느 쪽 회고인지 드러낸다. */
  title?: string;
  retro: WeeklyRetrospective;
  summary: string; // 이 주 실적 한 줄 요약
  nextWeekLabel: string | null;
  onChange: (retro: WeeklyRetrospective) => void;
  /** 다음 주 계획으로 항목 이관. 성공하면 carried_to가 기록된다. */
  onCarryOver: (item: WeeklyRetroNextAction) => Promise<boolean>;
}

/** 주간 회고 — 잘된 것 / 안된 것·원인 / 다음 주에 할 것(다음 주로 이어받기). */
export function WeeklyRetro({ title, retro, summary, nextWeekLabel, onChange, onCarryOver }: Props) {
  const [draft, setDraft] = useState<WeeklyRetrospective>(retro);
  const [newItem, setNewItem] = useState('');
  const [carrying, setCarrying] = useState<string | null>(null);

  useEffect(() => { setDraft(retro); }, [retro]);

  const commit = (next: WeeklyRetrospective = draft) => onChange(next);

  const addItem = () => {
    const text = newItem.trim();
    if (!text) return;
    setNewItem('');
    const next = {
      ...draft,
      next_actions: [...draft.next_actions, { id: crypto.randomUUID(), text, carried_to: null }],
    };
    setDraft(next);
    commit(next);
  };

  const removeItem = (id: string) => {
    const next = { ...draft, next_actions: draft.next_actions.filter((n) => n.id !== id) };
    setDraft(next);
    commit(next);
  };

  const carry = async (item: WeeklyRetroNextAction) => {
    setCarrying(item.id);
    const ok = await onCarryOver(item);
    setCarrying(null);
    if (!ok) return;
    const next = {
      ...draft,
      next_actions: draft.next_actions.map((n) => (n.id === item.id ? { ...n, carried_to: nextWeekLabel } : n)),
    };
    setDraft(next);
    commit(next);
  };

  const field = (key: 'went_well' | 'went_wrong', label: string, placeholder: string) => (
    <div className="flex-1 min-w-[220px]">
      <p className="text-[11px] font-semibold text-gray-500 mb-1.5">{label}</p>
      <textarea
        rows={4}
        value={draft[key]}
        onChange={(e) => setDraft((prev) => ({ ...prev, [key]: e.target.value }))}
        onBlur={() => commit()}
        placeholder={placeholder}
        className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-blue-400"
      />
    </div>
  );

  return (
    <section>
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
        <p className="text-xs font-semibold text-gray-400">{title ?? '이 주 회고'}</p>
        <p className="text-[11px] text-gray-400 tabular-nums">{summary}</p>
      </div>

      <div className="flex flex-wrap gap-4">
        {field('went_well', '잘된 것', '어떤 전략·행동이 통했나')}
        {field('went_wrong', '안된 것·원인', '무엇이 안 됐고 왜 그랬나')}

        <div className="flex-1 min-w-[220px]">
          <p className="text-[11px] font-semibold text-gray-500 mb-1.5">다음 주에 할 것</p>
          <div className="space-y-1.5">
            {draft.next_actions.map((n) => (
              <div key={n.id} className="flex items-start gap-1.5 group">
                <span className="text-xs text-gray-700 flex-1">{n.text}</span>
                {n.carried_to ? (
                  <span className="flex items-center gap-0.5 text-[10px] text-emerald-600 shrink-0">
                    <Check size={10} /> {n.carried_to}로
                  </span>
                ) : (
                  nextWeekLabel && (
                    <button
                      onClick={() => carry(n)}
                      disabled={carrying === n.id}
                      className="flex items-center gap-0.5 text-[10px] text-blue-500 hover:text-blue-700 disabled:opacity-40 shrink-0"
                    >
                      다음 주로 <ArrowRight size={10} />
                    </button>
                  )
                )}
                <button
                  onClick={() => removeItem(n.id)}
                  className="text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                >
                  <Trash2 size={11} />
                </button>
              </div>
            ))}
            {draft.next_actions.length === 0 && (
              <p className="text-[11px] text-gray-400">다음 주에 시도할 것을 적어두세요.</p>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-2">
            <input
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') addItem(); }}
              placeholder="항목 추가…"
              className="flex-1 text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
            <button
              onClick={addItem}
              className="flex items-center gap-1 px-2 py-1.5 text-[11px] font-semibold text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              <Plus size={12} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
