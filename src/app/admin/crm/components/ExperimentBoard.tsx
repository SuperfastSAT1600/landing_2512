'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, Activity, ArrowRight } from 'lucide-react';
import {
  GrowthExperiment,
  ExperimentMetricKey,
  ExperimentVerdict,
  EXPERIMENT_METRIC_LABELS,
  EXPERIMENT_STATUS_LABELS,
  EXPERIMENT_VERDICT_LABELS,
} from '@/types/crm';
import { ExperimentModal } from './ExperimentModal';

interface Props {
  adminKey: string;
}

// metric_key → /api/crm/stats 필드. avg_first_response_seconds는 by_source에만 존재.
const METRIC_FIELD: Record<Exclude<ExperimentMetricKey, 'custom'>, string> = {
  contact_rate: 'contact_rate',
  conversion_rate: 'conversion_rate',
  avg_first_response_seconds: 'avg_first_response_seconds',
};

// 지표가 높을수록 좋은지(상승=개선). 응답시간만 낮을수록 좋음.
function higherIsBetter(metric: ExperimentMetricKey): boolean {
  return metric !== 'avg_first_response_seconds';
}

function formatValue(metric: ExperimentMetricKey, v: number | null): string {
  if (v == null) return '—';
  if (metric === 'avg_first_response_seconds') {
    const s = Math.round(v);
    if (s < 60) return `${s}초`;
    if (s < 3600) return `${Math.round(s / 60)}분`;
    return `${(s / 3600).toFixed(1)}시간`;
  }
  if (metric === 'custom') return String(v);
  return `${v}%`;
}

const STATUS_BADGE: Record<string, string> = {
  planned: 'bg-gray-100 text-gray-600',
  running: 'bg-blue-100 text-blue-700',
  done: 'bg-emerald-100 text-emerald-700',
};
const VERDICT_BADGE: Record<ExperimentVerdict, string> = {
  success: 'bg-emerald-100 text-emerald-700',
  fail: 'bg-red-100 text-red-700',
  inconclusive: 'bg-amber-100 text-amber-700',
};

function ExperimentCard({
  exp, adminKey, onChange, onDelete, onEdit,
}: {
  exp: GrowthExperiment;
  adminKey: string;
  onChange: (e: GrowthExperiment) => void;
  onDelete: (id: string) => void;
  onEdit: (e: GrowthExperiment) => void;
}) {
  const [measuring, setMeasuring] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [baseVal, setBaseVal] = useState(exp.baseline_value != null ? String(exp.baseline_value) : '');
  const [resVal, setResVal] = useState(exp.result_value != null ? String(exp.result_value) : '');
  const [verdict, setVerdict] = useState<ExperimentVerdict | ''>(exp.verdict ?? '');
  const [retro, setRetro] = useState(exp.retrospective ?? '');
  const [saving, setSaving] = useState(false);

  const metricLabel = exp.metric_key === 'custom'
    ? (exp.custom_metric_label || '커스텀 지표')
    : EXPERIMENT_METRIC_LABELS[exp.metric_key];

  async function patch(updates: Partial<GrowthExperiment>) {
    const res = await fetch(`/api/crm/experiments/${exp.id}`, {
      method: 'PATCH',
      headers: { 'x-admin-key': adminKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (res.ok) {
      const json = await res.json();
      onChange(json.data);
      return json.data as GrowthExperiment;
    }
    alert('저장에 실패했습니다.');
    return null;
  }

  // 기존 통계 API에서 지표 자동 측정
  async function fetchMetric(from: string, to: string): Promise<number | null> {
    if (exp.metric_key === 'custom') return null;
    const res = await fetch(`/api/crm/stats?from=${from}&to=${to}`, { headers: { 'x-admin-key': adminKey } });
    if (!res.ok) return null;
    const { data } = await res.json();
    const field = METRIC_FIELD[exp.metric_key];
    if (exp.segment_source) {
      const row = (data.by_source ?? []).find((s: { source: string }) => s.source === exp.segment_source);
      return row ? (row[field] ?? null) : null;
    }
    // 전체: overview에는 contact_rate/conversion_rate만 존재
    return data.overview?.[field] ?? null;
  }

  async function handleMeasure() {
    setMeasuring(true);
    const updates: Partial<GrowthExperiment> = {};
    if (exp.baseline_from && exp.baseline_to) {
      updates.baseline_value = await fetchMetric(exp.baseline_from, exp.baseline_to);
    }
    if (exp.test_from && exp.test_to) {
      updates.result_value = await fetchMetric(exp.test_from, exp.test_to);
    }
    const saved = await patch(updates);
    if (saved) {
      setBaseVal(saved.baseline_value != null ? String(saved.baseline_value) : '');
      setResVal(saved.result_value != null ? String(saved.result_value) : '');
      setPanelOpen(true);
    }
    setMeasuring(false);
  }

  async function handleComplete() {
    setSaving(true);
    await patch({
      status: 'done',
      verdict: verdict || null,
      retrospective: retro.trim() || null,
      baseline_value: baseVal.trim() === '' ? null : Number(baseVal),
      result_value: resVal.trim() === '' ? null : Number(resVal),
    });
    setSaving(false);
    setPanelOpen(false);
  }

  const delta =
    exp.baseline_value != null && exp.result_value != null
      ? exp.result_value - exp.baseline_value
      : null;
  const improved = delta != null ? (higherIsBetter(exp.metric_key) ? delta > 0 : delta < 0) : null;

  return (
    <div className="border border-gray-200 rounded-xl p-4 bg-white">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${STATUS_BADGE[exp.status]}`}>
              {EXPERIMENT_STATUS_LABELS[exp.status]}
            </span>
            <span className="text-sm font-bold text-gray-900">{exp.title}</span>
            {exp.verdict && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${VERDICT_BADGE[exp.verdict]}`}>
                {EXPERIMENT_VERDICT_LABELS[exp.verdict]}
              </span>
            )}
          </div>
          <p className="text-[11px] text-gray-400 mt-1">
            {exp.segment_source || '전체'} · {metricLabel}
            {exp.test_from && ` · 실험 ${exp.test_from}~${exp.test_to ?? ''}`}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => onEdit(exp)} className="text-gray-300 hover:text-gray-600 p-1"><Pencil size={13} /></button>
          <button
            onClick={() => { if (confirm(`"${exp.title}" 실험을 삭제할까요?`)) onDelete(exp.id); }}
            className="text-gray-300 hover:text-red-500 p-1"><Trash2 size={13} /></button>
        </div>
      </div>

      {exp.hypothesis && <p className="text-xs text-gray-600 mt-2 whitespace-pre-wrap">{exp.hypothesis}</p>}

      {/* 측정 결과 */}
      <div className="flex items-center gap-3 mt-3 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-gray-400 text-xs">기준선</span>
          <span className="font-semibold text-gray-700">{formatValue(exp.metric_key, exp.baseline_value)}</span>
          <ArrowRight size={13} className="text-gray-300" />
          <span className="text-gray-400 text-xs">결과</span>
          <span className="font-semibold text-gray-900">{formatValue(exp.metric_key, exp.result_value)}</span>
        </div>
        {delta != null && (
          <span className={`text-xs font-bold ${improved ? 'text-emerald-600' : 'text-red-500'}`}>
            {delta > 0 ? '▲' : delta < 0 ? '▼' : ''} {formatValue(exp.metric_key, Math.abs(delta))}
          </span>
        )}
        {exp.target_value != null && (
          <span className="text-[11px] text-gray-400">목표 {formatValue(exp.metric_key, exp.target_value)}</span>
        )}
      </div>

      {exp.retrospective && (
        <div className="mt-2 rounded-lg bg-gray-50 border border-gray-100 px-3 py-2">
          <p className="text-[10px] font-medium text-gray-400 mb-0.5">회고</p>
          <p className="text-xs text-gray-600 whitespace-pre-wrap">{exp.retrospective}</p>
        </div>
      )}

      {/* 라이프사이클 액션 */}
      <div className="flex items-center gap-2 mt-3">
        {exp.status === 'planned' && (
          <button onClick={() => patch({ status: 'running' })}
            className="text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg">실험 시작</button>
        )}
        {exp.status !== 'planned' && exp.metric_key !== 'custom' && (
          <button onClick={handleMeasure} disabled={measuring}
            className="flex items-center gap-1 text-xs font-semibold border border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-600 px-3 py-1.5 rounded-lg disabled:opacity-50">
            <Activity size={12} />{measuring ? '측정 중...' : '측정'}
          </button>
        )}
        {exp.status !== 'planned' && (
          <button onClick={() => setPanelOpen((v) => !v)}
            className="text-xs font-semibold border border-gray-200 text-gray-600 hover:border-gray-400 px-3 py-1.5 rounded-lg">
            {exp.status === 'done' ? '결과 수정' : '결과/회고 입력'}
          </button>
        )}
      </div>

      {/* 결과·회고 입력 패널 (자동 측정값 수동 보정 포함) */}
      {panelOpen && (
        <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[11px] text-gray-400">기준선 값</label>
              <input type="number" value={baseVal} onChange={(e) => setBaseVal(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] text-gray-400">결과 값</label>
              <input type="number" value={resVal} onChange={(e) => setResVal(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[11px] text-gray-400">판정</label>
            <div className="flex gap-1.5">
              {(['success', 'fail', 'inconclusive'] as ExperimentVerdict[]).map((v) => (
                <button key={v} onClick={() => setVerdict(verdict === v ? '' : v)}
                  className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                    verdict === v ? `${VERDICT_BADGE[v]} border-transparent font-bold` : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}>
                  {EXPERIMENT_VERDICT_LABELS[v]}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[11px] text-gray-400">회고</label>
            <textarea value={retro} onChange={(e) => setRetro(e.target.value)} rows={2}
              className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              placeholder="무엇을 배웠는가 / 다음 액션" />
          </div>
          <button onClick={handleComplete} disabled={saving}
            className="text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg disabled:opacity-50">
            {saving ? '저장 중...' : '완료 저장'}
          </button>
        </div>
      )}
    </div>
  );
}

export function ExperimentBoard({ adminKey }: Props) {
  const [experiments, setExperiments] = useState<GrowthExperiment[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<GrowthExperiment | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      const res = await fetch('/api/crm/experiments', { headers: { 'x-admin-key': adminKey } });
      const json = await res.json();
      setExperiments(json.data ?? []);
    } finally {
      setLoading(false);
    }
  }, [adminKey]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  function handleChange(updated: GrowthExperiment) {
    setExperiments((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
  }
  function handleDelete(id: string) {
    fetch(`/api/crm/experiments/${id}`, { method: 'DELETE', headers: { 'x-admin-key': adminKey } })
      .then((res) => { if (res.ok) setExperiments((prev) => prev.filter((e) => e.id !== id)); });
  }
  function handleSaved(saved: GrowthExperiment) {
    setExperiments((prev) => {
      const exists = prev.some((e) => e.id === saved.id);
      return exists ? prev.map((e) => (e.id === saved.id ? saved : e)) : [saved, ...prev];
    });
    setModalOpen(false);
    setEditing(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400">
          가설 → 실행 → 측정 → 결과 → 회고. 지표는 유입경로·기간 기준으로 통계에서 자동 측정됩니다.
        </p>
        <button onClick={() => { setEditing(null); setModalOpen(true); }}
          className="flex items-center gap-1 text-xs font-semibold bg-gray-900 text-white px-3 py-1.5 rounded-lg hover:bg-gray-700">
          <Plus size={13} />새 실험
        </button>
      </div>

      {loading ? (
        <div className="text-sm text-gray-400 py-8 text-center">불러오는 중...</div>
      ) : experiments.length === 0 ? (
        <div className="text-sm text-gray-400 py-12 text-center border border-dashed border-gray-200 rounded-xl">
          아직 실험이 없습니다. 첫 실험을 만들어 지표를 끌어올려 보세요.
        </div>
      ) : (
        <div className="space-y-3">
          {experiments.map((exp) => (
            <ExperimentCard key={exp.id} exp={exp} adminKey={adminKey}
              onChange={handleChange} onDelete={handleDelete}
              onEdit={(e) => { setEditing(e); setModalOpen(true); }} />
          ))}
        </div>
      )}

      {modalOpen && (
        <ExperimentModal adminKey={adminKey} experiment={editing}
          onClose={() => { setModalOpen(false); setEditing(null); }} onSaved={handleSaved} />
      )}
    </div>
  );
}
