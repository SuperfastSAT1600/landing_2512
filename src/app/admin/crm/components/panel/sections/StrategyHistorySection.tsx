'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Plus, X } from 'lucide-react';
import type { Student, RetryStrategy, StrategyHistoryEntry, StrategyHistoryType } from '@/types/crm';

const HISTORY_TYPES: { type: StrategyHistoryType; label: string }[] = [
  { type: 'initial_contact', label: '컨텍 전략' },
  { type: 'initial_sales',   label: '최초 세일즈 전략' },
  { type: 'retry',           label: '재시도 세일즈 전략' },
];

interface Props {
  student: Student;
  adminKey: string;
  onUpdate: (id: string, updates: Partial<Student>) => void;
}

interface AddFormProps {
  type: StrategyHistoryType;
  strategies: RetryStrategy[];
  onSave: (entry: Omit<StrategyHistoryEntry, 'id' | 'applied_at'>) => void;
  onCancel: () => void;
}

function AddForm({ type, strategies, onSave, onCancel }: AddFormProps) {
  const [strategyId, setStrategyId] = useState('');
  const [memo, setMemo] = useState('');

  const available = strategies.filter(s => s.type === type);
  const selected = available.find(s => s.id === strategyId);

  return (
    <div className="mt-2 rounded-lg border border-blue-200 bg-blue-50/50 p-3 space-y-2">
      <select
        value={strategyId}
        onChange={e => setStrategyId(e.target.value)}
        className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white"
      >
        <option value="">전략 선택...</option>
        {available.map(s => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </select>
      <textarea
        rows={3}
        value={memo}
        onChange={e => setMemo(e.target.value)}
        placeholder="이 전략을 적용하는 이유나 계획을 메모하세요..."
        className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white"
      />
      <div className="flex gap-2">
        <button
          disabled={!strategyId || !memo.trim()}
          onClick={() => onSave({ type, strategy_id: strategyId, strategy_name: selected!.name, memo: memo.trim() })}
          className="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-40 rounded-lg transition-colors"
        >
          저장
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-1.5 text-xs text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
        >
          취소
        </button>
      </div>
    </div>
  );
}

export function StrategyHistorySection({ student, adminKey, onUpdate }: Props) {
  const [open, setOpen] = useState(false);
  const [openType, setOpenType] = useState<StrategyHistoryType | null>(null);
  const [addingFor, setAddingFor] = useState<StrategyHistoryType | null>(null);
  const [strategies, setStrategies] = useState<RetryStrategy[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    fetch('/api/crm/retry-strategies', { headers: { 'x-admin-key': adminKey } })
      .then(r => r.json())
      .then(j => setStrategies(j.data ?? []));
  }, [open, adminKey]);

  const history: StrategyHistoryEntry[] = student.strategy_history ?? [];

  async function handleSave(entry: Omit<StrategyHistoryEntry, 'id' | 'applied_at'>) {
    setSaving(true);
    const newEntry: StrategyHistoryEntry = {
      ...entry,
      id: crypto.randomUUID(),
      applied_at: new Date().toISOString(),
    };
    const updated = [...history, newEntry];
    const res = await fetch(`/api/crm/students/${student.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
      body: JSON.stringify({ strategy_history: updated }),
    });
    if (res.ok) {
      onUpdate(student.id, { strategy_history: updated });
    }
    setAddingFor(null);
    setSaving(false);
  }

  async function handleDelete(entryId: string) {
    const updated = history.filter(e => e.id !== entryId);
    const res = await fetch(`/api/crm/students/${student.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
      body: JSON.stringify({ strategy_history: updated }),
    });
    if (res.ok) onUpdate(student.id, { strategy_history: updated });
  }

  const totalCount = history.length;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          {open ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400" />}
          <span className="text-sm font-bold text-gray-800">전략 히스토리</span>
          {totalCount > 0 && (
            <span className="text-[11px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">{totalCount}</span>
          )}
        </div>
      </button>

      {open && (
        <div className="border-t border-gray-100 divide-y divide-gray-100">
          {HISTORY_TYPES.map(({ type, label }) => {
            const entries = history.filter(e => e.type === type);
            const isOpen = openType === type;
            return (
              <div key={type}>
                <button
                  onClick={() => setOpenType(isOpen ? null : type)}
                  className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {isOpen ? <ChevronDown size={12} className="text-gray-300" /> : <ChevronRight size={12} className="text-gray-300" />}
                    <span className="text-xs font-semibold text-gray-600">{label}</span>
                    {entries.length > 0 && (
                      <span className="text-[10px] text-gray-400">{entries.length}건</span>
                    )}
                  </div>
                </button>

                {isOpen && (
                  <div className="px-4 pb-3 space-y-2">
                    {entries.length === 0 && addingFor !== type && (
                      <p className="text-[11px] text-gray-400 py-1">적용된 전략이 없습니다.</p>
                    )}
                    {entries.map(e => (
                      <div key={e.id} className="rounded-lg bg-gray-50 border border-gray-100 px-3 py-2 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-gray-700">{e.strategy_name}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-gray-400">{e.applied_at.slice(0, 10)}</span>
                            <button
                              onClick={() => handleDelete(e.id)}
                              className="text-gray-300 hover:text-red-400 transition-colors"
                            >
                              <X size={11} />
                            </button>
                          </div>
                        </div>
                        <p className="text-[11px] text-gray-600 whitespace-pre-wrap leading-relaxed">{e.memo}</p>
                      </div>
                    ))}

                    {addingFor === type ? (
                      <AddForm
                        type={type}
                        strategies={strategies}
                        onSave={handleSave}
                        onCancel={() => setAddingFor(null)}
                      />
                    ) : (
                      <button
                        disabled={saving}
                        onClick={() => setAddingFor(type)}
                        className="flex items-center gap-1 text-[11px] text-blue-500 hover:text-blue-700 transition-colors mt-1"
                      >
                        <Plus size={11} />
                        전략 추가
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
