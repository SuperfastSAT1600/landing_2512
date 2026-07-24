'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import {
  GrowthExperiment,
  ExperimentMetricKey,
  EXPERIMENT_METRIC_LABELS,
  TRAFFIC_SOURCE_OPTIONS,
} from '@/types/crm';

interface Props {
  adminKey: string;
  segment?: 'b2c' | 'b2b'; // 생성 시 귀속 세그먼트(097). 기본 b2c
  experiment?: GrowthExperiment | null; // 있으면 수정, 없으면 생성
  onClose: () => void;
  onSaved: (exp: GrowthExperiment) => void;
}

const METRIC_KEYS: ExperimentMetricKey[] = [
  'contact_rate',
  'conversion_rate',
  'avg_first_response_seconds',
  'custom',
];

const inputCls =
  'w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20';

export function ExperimentModal({ adminKey, segment = 'b2c', experiment, onClose, onSaved }: Props) {
  const e = experiment;
  const [title, setTitle] = useState(e?.title ?? '');
  const [hypothesis, setHypothesis] = useState(e?.hypothesis ?? '');
  const [executionPlan, setExecutionPlan] = useState(e?.execution_plan ?? '');
  const [segmentSource, setSegmentSource] = useState(e?.segment_source ?? '');
  const [metricKey, setMetricKey] = useState<ExperimentMetricKey>(e?.metric_key ?? 'contact_rate');
  const [customMetricLabel, setCustomMetricLabel] = useState(e?.custom_metric_label ?? '');
  const [baselineFrom, setBaselineFrom] = useState(e?.baseline_from ?? '');
  const [baselineTo, setBaselineTo] = useState(e?.baseline_to ?? '');
  const [testFrom, setTestFrom] = useState(e?.test_from ?? '');
  const [testTo, setTestTo] = useState(e?.test_to ?? '');
  const [targetValue, setTargetValue] = useState(e?.target_value != null ? String(e.target_value) : '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!title.trim()) {
      setError('실험 제목을 입력해주세요.');
      return;
    }
    if (metricKey === 'custom' && !customMetricLabel.trim()) {
      setError('커스텀 지표명을 입력해주세요.');
      return;
    }
    setSaving(true);
    setError(null);

    const payload = {
      title: title.trim(),
      hypothesis: hypothesis.trim() || null,
      execution_plan: executionPlan.trim() || null,
      segment_source: segmentSource || null,
      metric_key: metricKey,
      custom_metric_label: metricKey === 'custom' ? customMetricLabel.trim() : null,
      baseline_from: baselineFrom || null,
      baseline_to: baselineTo || null,
      test_from: testFrom || null,
      test_to: testTo || null,
      target_value: targetValue.trim() === '' ? null : Number(targetValue),
      ...(e ? {} : { segment }), // 생성 시에만 세그먼트 귀속
    };

    const url = e ? `/api/crm/experiments/${e.id}` : '/api/crm/experiments';
    const method = e ? 'PATCH' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { 'x-admin-key': adminKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (res.ok) {
      const json = await res.json();
      onSaved(json.data);
    } else {
      setError('저장에 실패했습니다.');
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-gray-50 rounded-xl border border-gray-200 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 sticky top-0 bg-gray-50">
          <h2 className="text-sm font-semibold text-gray-900">{e ? '실험 수정' : '새 실험'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-400">실험 제목 *</label>
            <input value={title} onChange={(ev) => setTitle(ev.target.value)} className={inputCls}
              placeholder="예: 인스타 광고 리드 즉시 첫 메시지 발송" autoFocus />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-400">가설</label>
            <textarea value={hypothesis} onChange={(ev) => setHypothesis(ev.target.value)} rows={2}
              className={`${inputCls} resize-none`} placeholder="무엇이 왜 개선될 것이라 보는가" />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-400">실행 내용</label>
            <textarea value={executionPlan} onChange={(ev) => setExecutionPlan(ev.target.value)} rows={2}
              className={`${inputCls} resize-none`} placeholder="구체적으로 무엇을 바꾸는가" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-400">대상 유입경로</label>
              <select value={segmentSource} onChange={(ev) => setSegmentSource(ev.target.value)} className={inputCls}>
                <option value="">전체</option>
                {TRAFFIC_SOURCE_OPTIONS.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-400">측정 지표</label>
              <select value={metricKey} onChange={(ev) => setMetricKey(ev.target.value as ExperimentMetricKey)} className={inputCls}>
                {METRIC_KEYS.map((k) => <option key={k} value={k}>{EXPERIMENT_METRIC_LABELS[k]}</option>)}
              </select>
            </div>
          </div>

          {metricKey === 'custom' && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-400">커스텀 지표명 *</label>
              <input value={customMetricLabel} onChange={(ev) => setCustomMetricLabel(ev.target.value)} className={inputCls}
                placeholder="예: 진단테스트 제출률 (수동 입력)" />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-400">기준선 기간 (시작)</label>
              <input type="date" value={baselineFrom} onChange={(ev) => setBaselineFrom(ev.target.value)} className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-400">기준선 기간 (종료)</label>
              <input type="date" value={baselineTo} onChange={(ev) => setBaselineTo(ev.target.value)} className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-400">실험 기간 (시작)</label>
              <input type="date" value={testFrom} onChange={(ev) => setTestFrom(ev.target.value)} className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-400">실험 기간 (종료)</label>
              <input type="date" value={testTo} onChange={(ev) => setTestTo(ev.target.value)} className={inputCls} />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-400">목표값 (선택)</label>
            <input type="number" value={targetValue} onChange={(ev) => setTargetValue(ev.target.value)} className={inputCls}
              placeholder="예: 60 (컨택 성공률 60% 목표)" />
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-5 py-4 border-t border-gray-100 sticky bottom-0 bg-gray-50">
          <button onClick={handleSave} disabled={saving || !title.trim()}
            className="text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-4 py-2 rounded-lg transition-colors">
            {saving ? '저장 중...' : '저장'}
          </button>
          <button onClick={onClose} className="text-sm text-gray-400 hover:text-gray-600 px-2">취소</button>
        </div>
      </div>
    </div>
  );
}
