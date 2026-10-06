'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Plus, X } from 'lucide-react';
import { SectionCard } from './SectionCard';
import { buildStrategyHistoryEntry, upsertPhaseEntry, withAppliedDate } from '@/lib/strategy-history';
import { toKstDay } from '@/lib/kst-day';
import { getKstDateString } from '@/lib/week-definitions';
import { notifyStrategyHistoryChanged } from '../../../lib/strategy-events';
import { useStrategyCategories } from '../../strategies/useStrategyCategories';
import { groupHistoryByCategory } from '../../strategies/groupByCategory';
import type { Student, RetryStrategy, StrategyHistoryEntry, StrategyPhase } from '@/types/crm';
import { STRATEGY_PHASE_LABELS, STRATEGY_PHASES } from '@/types/crm';

interface Props {
  student: Student;
  adminKey: string;
  onUpdate: (id: string, updates: Partial<Student>) => void;
}

interface AddFormProps {
  /** 이 그룹(카테고리)에서 고를 수 있는 전략. */
  available: RetryStrategy[];
  /** 어느 슬롯에 기록하는지 — 폼 안에서 고르지 않고 슬롯이 이미 정한다. */
  phase: StrategyPhase;
  onSave: (entry: Omit<StrategyHistoryEntry, 'id' | 'applied_at'>) => void;
  onCancel: () => void;
}

function AddForm({ available, phase, onSave, onCancel }: AddFormProps) {
  const [strategyId, setStrategyId] = useState('');
  const [memo, setMemo] = useState('');

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
        placeholder={phase === 'planned' ? '왜 이 전략으로 준비했는지 메모하세요... (선택)' : '실제로 어떻게 진행됐는지 메모하세요... (선택)'}
        className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white"
      />
      <div className="flex gap-2">
        <button
          disabled={!strategyId}
          onClick={() => onSave({ strategy_id: strategyId, strategy_name: selected!.name, memo: memo.trim(), phase })}
          className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-40 rounded-lg transition-colors"
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
  const [sectionOpen, setSectionOpen] = useState(true);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  // '<그룹키>:<phase>' — 어느 카테고리의 어느 슬롯에 폼을 열었는지.
  const [addingFor, setAddingFor] = useState<string | null>(null);
  const [strategies, setStrategies] = useState<RetryStrategy[]>([]);
  const [saving, setSaving] = useState(false);

  // 전략 세그먼트 분리(097): B2B 학생은 B2B 전략만, 그 외는 B2C 전략만 배정 선택지에 노출
  const segment = student.lead_type === 'B2B' ? 'b2b' : 'b2c';
  // 섹션은 전략 라이브러리 카테고리를 그대로 따른다 — 라이브러리에서 바꾸면 여기도 바뀐다.
  const { categories } = useStrategyCategories(segment, adminKey);

  useEffect(() => {
    if (!sectionOpen) return;
    fetch(`/api/crm/retry-strategies?segment=${segment}`, { headers: { 'x-admin-key': adminKey } })
      .then(r => r.json())
      .then(j => setStrategies(j.data ?? []));
  }, [sectionOpen, adminKey, segment]);

  const history: StrategyHistoryEntry[] = student.strategy_history ?? [];

  // 라이브 전략명 우선, 삭제된 전략은 기록 시점 스냅샷으로 폴백 (전략 통계·이번 주 실행과 동일 패턴)
  const strategyNameById = new Map(strategies.map(s => [s.id, s.name]));
  const displayName = (e: StrategyHistoryEntry) => strategyNameById.get(e.strategy_id) ?? e.strategy_name;

  /** strategy_history 전체를 저장한다. 성공하면 패널 상태를 갱신하고 세일즈 전략 통계에 알린다. */
  // 기록 전체를 덮어쓰는 저장이라, 저장 중에 다른 수정이 들어가면 서로 되돌린다 — 저장 중엔 잠근다.
  async function persist(updated: StrategyHistoryEntry[]): Promise<boolean> {
    setSaving(true);
    try {
      const res = await fetch(`/api/crm/students/${student.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
        body: JSON.stringify({ strategy_history: updated }),
      });
      if (!res.ok) return false;
      onUpdate(student.id, { strategy_history: updated });
      notifyStrategyHistoryChanged(student.id);
      return true;
    } catch (e) {
      console.error('[StrategyHistorySection persist]', e);
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function handleDateChange(entryId: string, kstDay: string) {
    let updated: StrategyHistoryEntry[];
    try {
      updated = withAppliedDate(history, entryId, kstDay);
    } catch {
      alert('날짜 형식이 올바르지 않습니다.');
      return;
    }
    if (!(await persist(updated))) alert('진행 날짜를 저장하지 못했습니다.');
  }

  async function handleSave(entry: Omit<StrategyHistoryEntry, 'id' | 'applied_at'>) {
    setSaving(true);
    // 엔트리 shape은 주차 계획의 '전략 적용 기록'과 공유한다(집계가 이 shape에 의존).
    // 카테고리 × 진행 전/후 = 슬롯 1개. 같은 슬롯에 다시 고르면 갈아끼운다.
    const categoryOfStrategy = new Map(strategies.map((s) => [s.id, s.category_id]));
    const updated = upsertPhaseEntry(history, buildStrategyHistoryEntry(entry), categoryOfStrategy);
    await persist(updated);
    setAddingFor(null);
  }

  async function handleDelete(entryId: string) {
    await persist(history.filter(e => e.id !== entryId));
  }

  const totalCount = history.length;
  const groups = groupHistoryByCategory(history, categories, strategies);

  return (
    <SectionCard
      title="전략 히스토리"
      count={totalCount}
      defaultOpen={false}
      bodyClassName=""
      onOpenChange={setSectionOpen}
    >
      <div className="divide-y divide-gray-100">
        {groups.map((group) => {
            const key = group.id ?? '__orphan__';
            const { label, entries } = group;
            const isOpen = openGroup === key;
            return (
              <div key={key}>
                <button
                  onClick={() => setOpenGroup(isOpen ? null : key)}
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
                    {group.addable && group.strategies.length === 0 ? (
                      // 세그먼트 라이브러리가 비어 있으면 빈 드롭다운을 여는 대신 원인을 말해준다 —
                      // b2b 전략이 0건이던 동안 화면이 침묵해 코드 버그로 오인됐다.
                      <p className="text-[11px] text-gray-400 py-1">
                        {segment === 'b2b' ? 'B2B' : 'B2C'} 전략 라이브러리에 등록된 전략이 없습니다 — 전략 라이브러리에서 먼저 추가하세요.
                      </p>
                    ) : group.addable ? (
                      STRATEGY_PHASES.map((phase) => {
                        const slotKey = `${key}:${phase}`;
                        const slot = phase === 'planned' ? group.planned : group.applied;
                        return (
                          <div key={phase} className="space-y-1">
                            <p className="text-[10px] font-semibold text-gray-400">{STRATEGY_PHASE_LABELS[phase]}</p>
                            {slot ? (
                              <EntryRow entry={slot} name={displayName(slot)} disabled={saving} onDelete={() => handleDelete(slot.id)} onDateChange={(d) => handleDateChange(slot.id, d)} />
                            ) : addingFor !== slotKey ? (
                              <button
                                disabled={saving}
                                onClick={() => setAddingFor(slotKey)}
                                className="flex items-center gap-1 text-[11px] text-blue-500 hover:text-blue-700 transition-colors"
                              >
                                <Plus size={11} />
                                {STRATEGY_PHASE_LABELS[phase]} 기록
                              </button>
                            ) : null}
                            {addingFor === slotKey && (
                              <AddForm
                                available={group.strategies as RetryStrategy[]}
                                phase={phase}
                                onSave={handleSave}
                                onCancel={() => setAddingFor(null)}
                              />
                            )}
                            {slot && addingFor !== slotKey && (
                              <button
                                disabled={saving}
                                onClick={() => setAddingFor(slotKey)}
                                className="text-[11px] text-gray-400 hover:text-gray-600 transition-colors"
                              >
                                다른 전략으로 변경
                              </button>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <>
                        {entries.length === 0 && (
                          <p className="text-[11px] text-gray-400 py-1">적용된 전략이 없습니다.</p>
                        )}
                        {entries.map((e) => (
                          <EntryRow key={e.id} entry={e} name={displayName(e)} disabled={saving} onDelete={() => handleDelete(e.id)} onDateChange={(d) => handleDateChange(e.id, d)} />
                        ))}
                      </>
                    )}
                  </div>
                )}
              </div>
            );
        })}
      </div>
    </SectionCard>
  );
}

function EntryRow({
  entry,
  name,
  disabled,
  onDelete,
  onDateChange,
}: {
  entry: StrategyHistoryEntry;
  name: string;
  /** 저장 중 — 다른 수정이 겹쳐 서로 덮어쓰지 않게 잠근다. */
  disabled: boolean;
  onDelete: () => void;
  /** 진행 날짜(KST YYYY-MM-DD) 변경 — 기록한 날과 실제 진행한 날이 다를 때. */
  onDateChange: (kstDay: string) => void;
}) {
  const [editingDate, setEditingDate] = useState(false);
  const day = toKstDay(entry.applied_at) ?? entry.applied_at.slice(0, 10);
  function commitDate(next: string) {
    setEditingDate(false);
    if (!next || next === day || next < '2020-01-01' || next > getKstDateString()) return;
    onDateChange(next);
  }
  return (
    <div className="rounded-lg bg-gray-50 border border-gray-100 px-3 py-2 space-y-1">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-gray-700 min-w-0 truncate">{name}</span>
        <div className="flex items-center gap-2 shrink-0">
          {editingDate ? (
            <input
              type="date"
              aria-label="진행 날짜"
              autoFocus
              defaultValue={day}
              min="2020-01-01"
              max={getKstDateString()}
              // 연도를 손으로 치는 동안에도 change가 발생한다(0002-… 같은 중간값) — 입력을 마칠 때만 저장한다.
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitDate(e.currentTarget.value);
                if (e.key === 'Escape') setEditingDate(false);
              }}
              onBlur={(e) => commitDate(e.currentTarget.value)}
              className="text-[10px] text-gray-600 border border-gray-200 rounded px-1 py-0.5 bg-white"
            />
          ) : (
            <button
              type="button"
              aria-label={`진행 날짜 수정: ${day}`}
              title="진행 날짜 수정"
              disabled={disabled}
              onClick={() => setEditingDate(true)}
              className="text-[10px] text-gray-400 hover:text-blue-500 hover:underline transition-colors"
            >
              {day}
            </button>
          )}
          <button onClick={onDelete} disabled={disabled} className="text-gray-300 hover:text-red-400 disabled:opacity-40 transition-colors">
            <X size={11} />
          </button>
        </div>
      </div>
      {entry.memo?.trim() && (
        <p className="text-[11px] text-gray-600 whitespace-pre-wrap leading-relaxed">{entry.memo}</p>
      )}
    </div>
  );
}
