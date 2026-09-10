'use client';

import { useEffect, useState } from 'react';
import { Loader2, Search } from 'lucide-react';
import type { Student, WeeklyPlanSegment } from '@/types/crm';
import { appendStrategyHistoryEntry, buildStrategyHistoryEntry } from '@/lib/strategy-history';
import { STRATEGY_TYPE_LABELS } from './format';
import { useStrategyLibrary } from './useStrategyLibrary';

interface Props {
  segment: WeeklyPlanSegment;
  adminKey: string;
  /** 기록 시각(ISO). 지난 주차를 보고 있으면 그 주 안의 날짜를 넘긴다. */
  appliedAt: string;
  /** 있으면 이 전략들만 후보로 둔다(트랙에서 열었을 때). 비어 있으면 세그먼트 전체. */
  strategyIds?: string[];
  onLogged: () => void;
  onClose: () => void;
}

interface Candidate {
  id: string;
  name: string;
  parent_phone: string | null;
  grade: string | null;
}

/**
 * 전략 적용 기록 — students.strategy_history에 엔트리를 추가한다(학생 패널과 동일 shape).
 * 주간 실행 집계가 이 엔트리의 applied_at을 주 범위로 잡아 자동 반영한다.
 */
export function WeeklyQuickLog({ segment, adminKey, appliedAt, strategyIds, onLogged, onClose }: Props) {
  const [query, setQuery] = useState('');
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [picked, setPicked] = useState<Candidate | null>(null);
  const [strategyId, setStrategyId] = useState('');
  const [memo, setMemo] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const library = useStrategyLibrary(segment, adminKey);
  const strategies = strategyIds?.length
    ? library.filter((s) => strategyIds.includes(s.id))
    : library;

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) { setCandidates([]); return; }
    let cancelled = false;
    const timer = setTimeout(() => {
      fetch(`/api/crm/students?name_search=${encodeURIComponent(q)}`, { headers: { 'x-admin-key': adminKey } })
        .then((r) => r.json())
        .then((j) => { if (!cancelled) setCandidates((j.data ?? []) as Candidate[]); })
        .catch(() => { if (!cancelled) setCandidates([]); });
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [query, adminKey]);

  const selected = strategies.find((s) => s.id === strategyId) ?? null;

  async function submit() {
    if (!picked || !selected) return;
    setSaving(true);
    setError('');
    try {
      const cur = await fetch(`/api/crm/students/${picked.id}`, { headers: { 'x-admin-key': adminKey } });
      const curJson = await cur.json();
      if (!cur.ok) throw new Error('학생 정보를 불러오지 못했습니다.');
      const student = curJson.data as Student;

      const entry = buildStrategyHistoryEntry({
        type: selected.type,
        strategy_id: selected.id,
        strategy_name: selected.name,
        memo,
        applied_at: appliedAt,
      });
      const res = await fetch(`/api/crm/students/${picked.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
        body: JSON.stringify({ strategy_history: appendStrategyHistoryEntry(student.strategy_history, entry) }),
      });
      if (!res.ok) throw new Error('기록에 실패했습니다.');
      onLogged();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : '기록에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3 space-y-2">
      <p className="text-xs font-semibold text-gray-600">전략 적용 기록</p>

      {picked ? (
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-800">{picked.name}</span>
          {picked.grade && <span className="text-[10px] text-gray-400">{picked.grade}</span>}
          <button onClick={() => setPicked(null)} className="text-[11px] text-gray-400 hover:text-gray-600">
            변경
          </button>
        </div>
      ) : (
        <div className="space-y-1.5">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="리드 이름 검색 (2자 이상)"
              className="w-full text-xs border border-gray-200 rounded-lg pl-8 pr-2.5 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </div>
          {candidates.length > 0 && (
            <ul className="max-h-40 overflow-y-auto rounded-lg border border-gray-200 bg-white divide-y divide-gray-100">
              {candidates.map((c) => (
                <li key={c.id}>
                  <button
                    onClick={() => setPicked(c)}
                    className="w-full text-left px-2.5 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                  >
                    {c.name}
                    <span className="ml-1.5 text-[10px] text-gray-400">{c.grade ?? ''} {c.parent_phone ?? ''}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <select
        value={strategyId}
        onChange={(e) => setStrategyId(e.target.value)}
        className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
      >
        <option value="">전략 선택…</option>
        {strategies.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name} ({STRATEGY_TYPE_LABELS[s.type]})
          </option>
        ))}
      </select>

      <textarea
        rows={2}
        value={memo}
        onChange={(e) => setMemo(e.target.value)}
        placeholder="무엇을 어떻게 했는지 메모 (선택)"
        className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-2 bg-white resize-none focus:outline-none focus:ring-1 focus:ring-blue-400"
      />

      {error && <p className="text-[11px] text-red-500">{error}</p>}

      <div className="flex items-center gap-2">
        <button
          onClick={submit}
          disabled={!picked || !selected || saving}
          className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-40 rounded-lg"
        >
          {saving && <Loader2 size={12} className="animate-spin" />} 기록
        </button>
        <button onClick={onClose} className="px-2 py-1.5 text-xs text-gray-500 hover:text-gray-700">
          취소
        </button>
      </div>
    </div>
  );
}
