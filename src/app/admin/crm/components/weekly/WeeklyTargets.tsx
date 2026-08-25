'use client';

import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import {
  WEEKLY_PLAN_METRIC_KEYS,
  WEEKLY_PLAN_METRIC_LABELS,
  type WeeklyPlanMetricKey,
  type WeeklyPlanTarget,
} from '@/types/crm';
import { formatMetric, isCurrencyMetric } from './format';

interface Props {
  targets: WeeklyPlanTarget[];
  actuals: Partial<Record<WeeklyPlanMetricKey, number>>;
  onSave: (targets: WeeklyPlanTarget[]) => void;
}

/** 주간 목표 수치 vs 실적 (실적은 stats 집계값). */
export function WeeklyTargets({ targets, actuals, onSave }: Props) {
  const [draft, setDraft] = useState<WeeklyPlanTarget[]>(targets);
  const [editing, setEditing] = useState(false);

  useEffect(() => { if (!editing) setDraft(targets); }, [targets, editing]);

  const usedKeys = new Set(draft.map((t) => t.key));
  const availableKeys = WEEKLY_PLAN_METRIC_KEYS.filter((k) => !usedKeys.has(k));

  const setValue = (key: WeeklyPlanMetricKey, value: number) =>
    setDraft((prev) => prev.map((t) => (t.key === key ? { ...t, target_value: value } : t)));
  const addTarget = (key: WeeklyPlanMetricKey) =>
    setDraft((prev) => [...prev, { key, label: WEEKLY_PLAN_METRIC_LABELS[key], target_value: 0 }]);
  const removeTarget = (key: WeeklyPlanMetricKey) =>
    setDraft((prev) => prev.filter((t) => t.key !== key));

  const finish = () => { setEditing(false); onSave(draft); };

  return (
    <section className="border-b border-gray-100 pb-6">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-gray-400">목표 vs 실적</p>
        {editing ? (
          <button onClick={finish} className="text-xs font-semibold text-blue-600 hover:underline">완료</button>
        ) : (
          <button onClick={() => setEditing(true)} className="text-xs text-gray-400 hover:text-gray-600">목표 편집</button>
        )}
      </div>

      {draft.length === 0 && !editing && (
        <p className="text-sm text-gray-400 py-6 text-center border border-dashed border-gray-200 rounded-lg">
          ‘목표 편집’으로 이번 주 목표 수치를 설정하세요.
        </p>
      )}

      <div className="flex flex-wrap gap-x-10 gap-y-5">
        {draft.map((t) => {
          const actual = actuals[t.key] ?? 0;
          const pct = t.target_value > 0 ? Math.round((actual / t.target_value) * 100) : 0;
          return (
            <div key={t.key} className="min-w-[150px]">
              <div className="flex items-center gap-1.5 mb-1.5">
                <p className="text-xs text-gray-400">{t.label}</p>
                {editing && (
                  <button onClick={() => removeTarget(t.key)} className="text-gray-300 hover:text-red-400">
                    <Trash2 size={11} />
                  </button>
                )}
              </div>
              <p className="text-[26px] leading-none font-semibold text-gray-900 tabular-nums">
                {formatMetric(t.key, actual)}
              </p>
              {editing ? (
                <div className="flex items-center gap-1 mt-2">
                  <span className="text-[11px] text-gray-400">목표</span>
                  <input
                    type="number"
                    value={t.target_value || ''}
                    onChange={(e) => setValue(t.key, Number(e.target.value) || 0)}
                    className="w-24 text-xs border border-gray-200 rounded px-1.5 py-0.5"
                  />
                  {isCurrencyMetric(t.key) && <span className="text-[11px] text-gray-400">원</span>}
                </div>
              ) : (
                <>
                  <p className="text-[11px] text-gray-400 mt-1.5">
                    목표 {formatMetric(t.key, t.target_value)} · 달성 {pct}%
                  </p>
                  <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden mt-1">
                    <div
                      className={`h-full rounded-full ${pct >= 100 ? 'bg-emerald-500' : 'bg-gray-900'}`}
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {editing && availableKeys.length > 0 && (
        <div className="mt-4 flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] text-gray-400">지표 추가:</span>
          {availableKeys.map((k) => (
            <button
              key={k}
              onClick={() => addTarget(k)}
              className="text-xs px-2 py-0.5 rounded border border-gray-200 text-gray-600 hover:border-blue-400 hover:text-blue-600"
            >
              + {WEEKLY_PLAN_METRIC_LABELS[k]}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
