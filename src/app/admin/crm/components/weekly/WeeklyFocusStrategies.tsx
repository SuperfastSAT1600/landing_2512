'use client';

import { useEffect, useState } from 'react';
import { ArrowUpRight, Plus, Trash2 } from 'lucide-react';
import type { RetryStrategy, WeeklyFocusStrategy, WeeklyPlanSegment } from '@/types/crm';
import { STRATEGY_TYPE_LABELS } from './format';

interface Props {
  segment: WeeklyPlanSegment;
  adminKey: string;
  focus: WeeklyFocusStrategy[];
  onChange: (focus: WeeklyFocusStrategy[]) => void;
  onOpenLibrary?: () => void;
}

/** 이번 주 밀어볼 전략 선택 + 전략별 목표·메모. 실행 결과는 WeeklyExecution이 자동 집계한다. */
export function WeeklyFocusStrategies({ segment, adminKey, focus, onChange, onOpenLibrary }: Props) {
  const [library, setLibrary] = useState<RetryStrategy[]>([]);
  const [picking, setPicking] = useState(false);
  // 목표·메모는 타이핑 중 저장하지 않고 draft에 담아 blur에서 커밋한다.
  const [draft, setDraft] = useState<WeeklyFocusStrategy[]>(focus);
  useEffect(() => { setDraft(focus); }, [focus]);

  useEffect(() => {
    if (!picking) return;
    fetch(`/api/crm/retry-strategies?segment=${segment}`, { headers: { 'x-admin-key': adminKey } })
      .then((r) => r.json())
      .then((j) => setLibrary((j.data ?? []) as RetryStrategy[]))
      .catch(() => setLibrary([]));
  }, [picking, segment, adminKey]);

  const chosen = new Set(draft.map((f) => f.strategy_id));
  const selectable = library.filter((s) => !chosen.has(s.id));

  const add = (s: RetryStrategy) => {
    setPicking(false);
    onChange([
      ...draft,
      {
        id: crypto.randomUUID(),
        strategy_id: s.id,
        strategy_name: s.name,
        type: s.type,
        goal: '',
        memo: '',
        carried_from_week: null,
      },
    ]);
  };
  const patch = (id: string, updates: Partial<WeeklyFocusStrategy>) =>
    setDraft((prev) => prev.map((f) => (f.id === id ? { ...f, ...updates } : f)));
  const commit = () => onChange(draft);
  const remove = (id: string) => onChange(draft.filter((f) => f.id !== id));

  return (
    <section className="border-b border-gray-100 pb-6">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-gray-400">이번 주 집중 전략</p>
        <div className="flex items-center gap-3">
          {onOpenLibrary && (
            <button onClick={onOpenLibrary} className="flex items-center gap-0.5 text-xs text-gray-400 hover:text-gray-600">
              전략 라이브러리 <ArrowUpRight size={11} />
            </button>
          )}
          <button
            onClick={() => setPicking((v) => !v)}
            className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
          >
            <Plus size={13} /> 전략 선택
          </button>
        </div>
      </div>

      {picking && (
        <div className="mb-3 rounded-lg border border-blue-200 bg-blue-50/50 p-3">
          {selectable.length === 0 ? (
            <p className="text-xs text-gray-500">추가할 전략이 없습니다. 전략 라이브러리에서 먼저 만드세요.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {selectable.map((s) => (
                <button
                  key={s.id}
                  onClick={() => add(s)}
                  className="text-xs px-2.5 py-1 rounded-md bg-white border border-gray-200 text-gray-700 hover:border-blue-400 hover:text-blue-600"
                >
                  {s.name}
                  <span className="ml-1 text-[10px] text-gray-400">{STRATEGY_TYPE_LABELS[s.type]}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {draft.length === 0 ? (
        <p className="text-sm text-gray-400 py-6 text-center border border-dashed border-gray-200 rounded-lg">
          ‘전략 선택’으로 이번 주에 밀어볼 전략을 정하세요.
        </p>
      ) : (
        <ul className="space-y-2">
          {draft.map((f) => (
            <li key={f.id} className="rounded-lg border border-gray-200 px-3 py-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-900 truncate">{f.strategy_name}</span>
                  <span className="text-[10px] text-gray-400 shrink-0">{STRATEGY_TYPE_LABELS[f.type]}</span>
                  {f.carried_from_week && (
                    <span className="text-[10px] text-blue-500 shrink-0">지난주 회고에서</span>
                  )}
                </div>
                <button onClick={() => remove(f.id)} className="text-gray-300 hover:text-red-400 shrink-0">
                  <Trash2 size={13} />
                </button>
              </div>
              <div className="mt-2 flex flex-col sm:flex-row gap-2">
                <input
                  value={f.goal}
                  onChange={(e) => patch(f.id, { goal: e.target.value })}
                  onBlur={commit}
                  placeholder="목표 (예: 결제 3건)"
                  className="sm:w-44 text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
                <input
                  value={f.memo}
                  onChange={(e) => patch(f.id, { memo: e.target.value })}
                  onBlur={commit}
                  placeholder="왜 이 전략인가 (선택)"
                  className="flex-1 text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
