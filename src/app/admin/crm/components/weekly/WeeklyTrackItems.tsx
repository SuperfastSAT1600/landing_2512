'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, Link2, Trash2 } from 'lucide-react';
import type { RetryStrategy, WeeklyTrackItem } from '@/types/crm';
import { STRATEGY_TYPE_LABELS } from './format';

interface Props {
  items: WeeklyTrackItem[];
  strategies: RetryStrategy[];
  /** 구조 변경(추가·삭제·체크·전략 연결)은 즉시, 텍스트는 blur에서 호출된다. */
  onChange: (items: WeeklyTrackItem[]) => void;
}

/** 트랙의 실행 항목 체크리스트 — Enter로 연속 입력, 항목별 전략 연결(선택). */
export function WeeklyTrackItems({ items, strategies, onChange }: Props) {
  const [draft, setDraft] = useState(items);
  const [text, setText] = useState('');
  const [linking, setLinking] = useState<string | null>(null);
  const addRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setDraft(items); }, [items]);

  const add = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onChange([
      ...draft,
      {
        id: crypto.randomUUID(),
        text: trimmed,
        done: false,
        done_at: null,
        strategy_id: null,
        strategy_name: null,
        strategy_type: null,
      },
    ]);
    setText('');
    addRef.current?.focus(); // 연속 입력
  };

  const patch = (id: string, updates: Partial<WeeklyTrackItem>) =>
    draft.map((i) => (i.id === id ? { ...i, ...updates } : i));

  const toggle = (item: WeeklyTrackItem) =>
    onChange(patch(item.id, {
      done: !item.done,
      done_at: item.done ? null : new Date().toISOString(),
    }));

  const link = (id: string, s: RetryStrategy | null) => {
    setLinking(null);
    onChange(patch(id, {
      strategy_id: s?.id ?? null,
      strategy_name: s?.name ?? null,
      strategy_type: s?.type ?? null,
    }));
  };

  return (
    <div className="mt-2">
      <ul className="space-y-0.5">
        {draft.map((item) => (
          <li key={item.id} className="group relative flex items-center gap-2">
            <button
              onClick={() => toggle(item)}
              aria-label="완료 토글"
              className={`shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                item.done ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              {item.done && <Check size={11} strokeWidth={3} />}
            </button>

            <input
              value={item.text}
              aria-label="실행 항목"
              onChange={(e) =>
                setDraft((prev) => prev.map((i) => (i.id === item.id ? { ...i, text: e.target.value } : i)))
              }
              onBlur={() => onChange(draft)}
              className={`flex-1 min-w-0 text-[13px] bg-transparent border-0 border-b border-transparent px-0 py-1 focus:outline-none focus:border-blue-300 ${
                item.done ? 'text-gray-400 line-through' : 'text-gray-800'
              }`}
            />

            {item.strategy_id ? (
              <button
                onClick={() => setLinking(linking === item.id ? null : item.id)}
                className="shrink-0 max-w-[9rem] truncate text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-100 hover:border-blue-300"
              >
                {item.strategy_name}
              </button>
            ) : (
              <button
                onClick={() => setLinking(linking === item.id ? null : item.id)}
                aria-label="전략 연결"
                className="shrink-0 text-gray-300 hover:text-blue-500 opacity-0 group-hover:opacity-100 focus:opacity-100"
              >
                <Link2 size={12} />
              </button>
            )}

            <button
              onClick={() => onChange(draft.filter((i) => i.id !== item.id))}
              aria-label="항목 삭제"
              className="shrink-0 text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 focus:opacity-100"
            >
              <Trash2 size={12} />
            </button>

            {linking === item.id && (
              <div className="absolute right-0 top-7 z-10 w-60 rounded-lg border border-gray-200 bg-white shadow-lg p-1.5">
                {strategies.length === 0 ? (
                  <p className="text-[11px] text-gray-400 px-1.5 py-1">전략 라이브러리가 비어 있습니다.</p>
                ) : (
                  strategies.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => link(item.id, s)}
                      className="w-full text-left text-[11px] px-1.5 py-1 rounded hover:bg-gray-50"
                    >
                      {s.name}
                      <span className="ml-1 text-[10px] text-gray-400">{STRATEGY_TYPE_LABELS[s.type]}</span>
                    </button>
                  ))
                )}
                {item.strategy_id && (
                  <button
                    onClick={() => link(item.id, null)}
                    className="w-full text-left text-[11px] px-1.5 py-1 rounded text-red-500 hover:bg-red-50"
                  >
                    연결 해제
                  </button>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>

      <input
        ref={addRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); add(); }
          if (e.key === 'Escape') setText('');
        }}
        onBlur={add}
        placeholder="실행 항목 추가… (Enter로 계속)"
        className="mt-1 w-full text-[13px] bg-transparent border-0 border-b border-dashed border-gray-200 px-0 py-1 placeholder:text-gray-300 focus:outline-none focus:border-blue-300"
      />
    </div>
  );
}
