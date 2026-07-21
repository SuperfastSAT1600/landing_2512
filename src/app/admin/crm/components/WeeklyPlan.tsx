'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Plus, Trash2, Loader2, Check } from 'lucide-react';
import {
  WEEKLY_PLAN_METRIC_KEYS,
  WEEKLY_PLAN_METRIC_LABELS,
  WEEKLY_PLAN_CURRENCY_METRICS,
  type WeeklyPlanSegment,
  type WeeklyPlanMetricKey,
  type WeeklyPlanResponse,
  type WeeklyPlanTarget,
  type WeeklyPlanAction,
} from '@/types/crm';
import { getWeekDef, weekByOffset, type WeekDef } from '@/lib/week-definitions';

interface Props {
  segment: WeeklyPlanSegment;
  adminKey: string;
  dailyView?: React.ReactNode; // 있으면 '오늘 실행' 서브뷰 노출(b2c)
  todayISO?: string; // 초기 주차 계산용. 기본 현재 시각.
}

const isCurrency = (k: WeeklyPlanMetricKey) => WEEKLY_PLAN_CURRENCY_METRICS.includes(k);
const fmtVal = (k: WeeklyPlanMetricKey, n: number) =>
  isCurrency(k) ? `${Math.round(n / 10000).toLocaleString()}만` : n.toLocaleString();

export function WeeklyPlan({ segment, adminKey, dailyView, todayISO }: Props) {
  const today = todayISO ?? new Date().toISOString();
  const [subView, setSubView] = useState<'plan' | 'today'>('plan');
  const [week, setWeek] = useState<WeekDef | null>(() => getWeekDef(today));
  const [resp, setResp] = useState<WeeklyPlanResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [targets, setTargets] = useState<WeeklyPlanTarget[]>([]);
  const [actions, setActions] = useState<WeeklyPlanAction[]>([]);
  const [editTargets, setEditTargets] = useState(false);
  const [newAction, setNewAction] = useState('');

  const weekStart = week?.start ?? null;

  const load = useCallback(async () => {
    if (!weekStart) { setLoading(false); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/crm/weekly-plan?segment=${segment}&week_start=${weekStart}`, {
        headers: { 'x-admin-key': adminKey },
      });
      const json = await res.json();
      if (res.ok && json.data) {
        const data = json.data as WeeklyPlanResponse;
        setResp(data);
        setTargets(data.plan?.targets ?? []);
        setActions(data.plan?.actions ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [segment, weekStart, adminKey]);

  useEffect(() => { load(); }, [load]);

  const save = useCallback(async (nextTargets: WeeklyPlanTarget[], nextActions: WeeklyPlanAction[]) => {
    if (!weekStart) return;
    await fetch('/api/crm/weekly-plan', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
      body: JSON.stringify({ segment, week_start: weekStart, targets: nextTargets, actions: nextActions }),
    });
  }, [segment, weekStart, adminKey]);

  const actuals = resp?.actuals ?? {};
  const usedKeys = new Set(targets.map((t) => t.key));
  const availableKeys = WEEKLY_PLAN_METRIC_KEYS.filter((k) => !usedKeys.has(k));

  // ── target 편집 ──
  const setTargetValue = (key: WeeklyPlanMetricKey, value: number) =>
    setTargets((prev) => prev.map((t) => (t.key === key ? { ...t, target_value: value } : t)));
  const addTarget = (key: WeeklyPlanMetricKey) =>
    setTargets((prev) => [...prev, { key, label: WEEKLY_PLAN_METRIC_LABELS[key], target_value: 0 }]);
  const removeTarget = (key: WeeklyPlanMetricKey) => setTargets((prev) => prev.filter((t) => t.key !== key));
  const saveTargets = async () => { setEditTargets(false); await save(targets, actions); };

  // ── action (낙관적) ──
  const persistActions = async (next: WeeklyPlanAction[]) => {
    const prev = actions;
    setActions(next);
    try { await save(targets, next); } catch { setActions(prev); }
  };
  const addAction = async () => {
    const text = newAction.trim();
    if (!text) return;
    setNewAction('');
    await persistActions([...actions, { id: crypto.randomUUID(), text, done: false, done_at: null }]);
  };
  const toggleAction = async (id: string) =>
    persistActions(actions.map((a) => (a.id === id ? { ...a, done: !a.done, done_at: !a.done ? new Date().toISOString() : null } : a)));
  const removeAction = async (id: string) => persistActions(actions.filter((a) => a.id !== id));

  const doneCount = actions.filter((a) => a.done).length;

  return (
    <div className="space-y-5">
      {/* 서브뷰 + 주 네비 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {dailyView ? (
          <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
            {([['plan', '주간 계획'], ['today', '오늘 실행']] as const).map(([k, label]) => (
              <button key={k} onClick={() => setSubView(k)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${subView === k ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                {label}
              </button>
            ))}
          </div>
        ) : <div />}

        {subView === 'plan' && (
          <div className="flex items-center gap-2">
            <button onClick={() => week && setWeek(weekByOffset(week.start, -1) ?? week)} className="p-1 rounded text-gray-400 hover:bg-gray-100" aria-label="이전 주"><ChevronLeft size={16} /></button>
            <span className="text-sm font-semibold text-gray-800 min-w-[130px] text-center">{week?.label ?? '-'}</span>
            <button onClick={() => week && setWeek(weekByOffset(week.start, 1) ?? week)} className="p-1 rounded text-gray-400 hover:bg-gray-100" aria-label="다음 주"><ChevronRight size={16} /></button>
            <button onClick={() => setWeek(getWeekDef(today))} className="ml-1 px-2.5 py-1 text-xs rounded-md text-gray-500 hover:bg-gray-100">이번 주</button>
          </div>
        )}
      </div>

      {subView === 'today' && dailyView}

      {subView === 'plan' && (
        loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-gray-400"><Loader2 size={16} className="animate-spin" /> 불러오는 중…</div>
        ) : (
          <>
            {/* 목표 vs 실적 */}
            <div className="border-b border-gray-100 pb-6">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-gray-400">목표 vs 실적</p>
                {editTargets ? (
                  <button onClick={saveTargets} className="text-xs font-semibold text-blue-600 hover:underline">완료</button>
                ) : (
                  <button onClick={() => setEditTargets(true)} className="text-xs text-gray-400 hover:text-gray-600">목표 편집</button>
                )}
              </div>

              {targets.length === 0 && !editTargets && (
                <p className="text-sm text-gray-400 py-6 text-center border border-dashed border-gray-200 rounded-lg">‘목표 편집’으로 이번 주 목표 수치를 설정하세요.</p>
              )}

              <div className="flex flex-wrap gap-x-10 gap-y-5">
                {targets.map((t) => {
                  const actual = actuals[t.key] ?? 0;
                  const pct = t.target_value > 0 ? Math.round((actual / t.target_value) * 100) : 0;
                  return (
                    <div key={t.key} className="min-w-[150px]">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <p className="text-xs text-gray-400">{t.label}</p>
                        {editTargets && <button onClick={() => removeTarget(t.key)} className="text-gray-300 hover:text-red-400"><Trash2 size={11} /></button>}
                      </div>
                      <p className="text-[26px] leading-none font-semibold text-gray-900 tabular-nums">{fmtVal(t.key, actual)}</p>
                      {editTargets ? (
                        <div className="flex items-center gap-1 mt-2">
                          <span className="text-[11px] text-gray-400">목표</span>
                          <input type="number" value={t.target_value || ''} onChange={(e) => setTargetValue(t.key, Number(e.target.value) || 0)}
                            className="w-24 text-xs border border-gray-200 rounded px-1.5 py-0.5" />
                          {isCurrency(t.key) && <span className="text-[11px] text-gray-400">원</span>}
                        </div>
                      ) : (
                        <>
                          <p className="text-[11px] text-gray-400 mt-1.5">목표 {fmtVal(t.key, t.target_value)} · 달성 {pct}%</p>
                          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden mt-1">
                            <div className={`h-full rounded-full ${pct >= 100 ? 'bg-emerald-500' : 'bg-gray-900'}`} style={{ width: `${Math.min(100, pct)}%` }} />
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>

              {editTargets && availableKeys.length > 0 && (
                <div className="mt-4 flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] text-gray-400">지표 추가:</span>
                  {availableKeys.map((k) => (
                    <button key={k} onClick={() => addTarget(k)} className="text-xs px-2 py-0.5 rounded border border-gray-200 text-gray-600 hover:border-blue-400 hover:text-blue-600">+ {WEEKLY_PLAN_METRIC_LABELS[k]}</button>
                  ))}
                </div>
              )}
            </div>

            {/* 액션 체크리스트 */}
            <div>
              <p className="text-xs font-semibold text-gray-400 mb-3">이번 주 할 일 <span className="text-gray-300 font-normal">({doneCount}/{actions.length})</span></p>
              <div className="space-y-1.5">
                {actions.map((a) => (
                  <div key={a.id} className="flex items-center gap-2.5 group">
                    <button onClick={() => toggleAction(a.id)}
                      className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${a.done ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-gray-300 hover:border-gray-400'}`}>
                      {a.done && <Check size={11} strokeWidth={3} />}
                    </button>
                    <span className={`text-sm flex-1 ${a.done ? 'text-gray-400 line-through' : 'text-gray-700'}`}>{a.text}</span>
                    <button onClick={() => removeAction(a.id)} className="text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={13} /></button>
                  </div>
                ))}
                {actions.length === 0 && <p className="text-sm text-gray-400 py-4 text-center">할 일을 추가하세요.</p>}
              </div>
              <div className="flex items-center gap-2 mt-3">
                <input value={newAction} onChange={(e) => setNewAction(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addAction(); }}
                  placeholder="할 일 추가…" className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400" />
                <button onClick={addAction} className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg"><Plus size={13} /> 추가</button>
              </div>
            </div>
          </>
        )
      )}
    </div>
  );
}
