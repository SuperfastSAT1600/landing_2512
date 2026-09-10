'use client';

import { useState } from 'react';
import { Trash2, Users } from 'lucide-react';
import {
  WEEKLY_TRACK_METRIC_KEYS,
  WEEKLY_TRACK_METRIC_LABELS,
  type RetryStrategy,
  type WeeklyTrack,
  type WeeklyTrackItem,
  type WeeklyTrackMetric,
} from '@/types/crm';
import type { WeeklyTrackProgress } from '@/lib/weekly-track-progress';
import { LeadChips } from './LeadChips';
import { WeeklyTrackItems } from './WeeklyTrackItems';
import { manwon } from './format';

interface Props {
  track: WeeklyTrack;
  progress: WeeklyTrackProgress;
  strategies: RetryStrategy[];
  /** '전체' 보기에서 카드가 어느 세그먼트인지 (단일 세그먼트 보기에선 생략) */
  segmentLabel?: string | null;
  onChange: (track: WeeklyTrack) => void;
  onRemove: () => void;
  onSelectStudent?: (id: string) => void;
  onLogApply?: () => void;
}

const fmt = (metric: WeeklyTrackMetric, n: number) =>
  metric === 'revenue' ? `${manwon(n)}` : n.toLocaleString();

/** 트랙 1개 — 목표 하나 + 실행 항목들 + 연결된 전략의 자동 집계. */
export function WeeklyTrackCard({
  track, progress, strategies, segmentLabel, onChange, onRemove, onSelectStudent, onLogApply,
}: Props) {
  const [showLeads, setShowLeads] = useState(false);

  // 이름·목표는 blur에서만 값이 필요하므로 uncontrolled로 둔다(prop 동기화 effect 불필요).
  const commit = (field: 'name' | 'goal_text') => (e: React.FocusEvent<HTMLInputElement>) => {
    const value = e.target.value.trim();
    if (value !== track[field]) onChange({ ...track, [field]: value });
  };

  const linked = progress.linkedStrategyIds.length > 0;
  const pct = progress.pct;

  return (
    <li className="rounded-xl border border-gray-200 px-3.5 py-3">
      <div className="flex items-center gap-2">
        <input
          key={`name-${track.id}`}
          defaultValue={track.name}
          placeholder="트랙 이름"
          onBlur={commit('name')}
          className="min-w-0 flex-1 text-sm font-semibold text-gray-900 bg-transparent border-0 border-b border-transparent px-0 py-0.5 placeholder:text-gray-300 placeholder:font-normal focus:outline-none focus:border-blue-300"
        />
        {segmentLabel && (
          <span className="shrink-0 text-[10px] font-semibold text-gray-400">{segmentLabel}</span>
        )}
        {track.carried_from_week && (
          <span className="shrink-0 text-[10px] text-blue-500">지난주 회고에서</span>
        )}
        <button onClick={onRemove} aria-label="트랙 삭제" className="shrink-0 text-gray-300 hover:text-red-400">
          <Trash2 size={13} />
        </button>
      </div>

      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1.5">
        <span className="text-[11px] text-gray-400 shrink-0">목표</span>
        <input
          key={`goal-${track.id}`}
          defaultValue={track.goal_text}
          placeholder="예: 인스타리드 2건 결제"
          onBlur={commit('goal_text')}
          className="min-w-[10rem] flex-1 text-[13px] text-gray-700 bg-transparent border-0 border-b border-transparent px-0 py-0.5 placeholder:text-gray-300 focus:outline-none focus:border-blue-300"
        />

        <select
          aria-label="지표"
          value={track.metric ?? ''}
          onChange={(e) =>
            onChange({ ...track, metric: (e.target.value || null) as WeeklyTrackMetric | null })
          }
          className="shrink-0 text-[11px] text-gray-500 border border-gray-200 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-300"
        >
          <option value="">지표 없음</option>
          {WEEKLY_TRACK_METRIC_KEYS.map((k) => (
            <option key={k} value={k}>{WEEKLY_TRACK_METRIC_LABELS[k]}</option>
          ))}
        </select>

        {track.metric ? (
          <input
            type="number"
            aria-label="목표값"
            value={track.target_value || ''}
            onChange={(e) => onChange({ ...track, target_value: Math.max(0, Number(e.target.value) || 0) })}
            className="shrink-0 w-20 text-[11px] border border-gray-200 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-300"
          />
        ) : (
          <label className="shrink-0 flex items-center gap-1 text-[11px] text-gray-500">
            <input
              type="checkbox"
              aria-label="달성"
              checked={track.achieved}
              onChange={(e) => onChange({ ...track, achieved: e.target.checked })}
              className="w-3.5 h-3.5 accent-emerald-500"
            />
            달성
          </label>
        )}
      </div>

      {track.metric && (
        <div className="mt-1.5 flex items-center gap-2">
          <span className="text-[11px] text-gray-500 tabular-nums shrink-0">
            {fmt(track.metric, progress.value)} / {fmt(track.metric, track.target_value)}
          </span>
          {pct !== null && (
            <span className={`text-[11px] font-semibold tabular-nums shrink-0 ${pct >= 100 ? 'text-emerald-600' : 'text-gray-400'}`}>
              {pct}%
            </span>
          )}
          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden min-w-[3rem]">
            <div
              className={`h-full rounded-full ${(pct ?? 0) >= 100 ? 'bg-emerald-500' : 'bg-gray-900'}`}
              style={{ width: `${Math.min(100, pct ?? 0)}%` }}
            />
          </div>
          {!linked && (
            <span className="text-[10px] text-amber-600 shrink-0">전략을 연결하면 자동 집계됩니다</span>
          )}
        </div>
      )}

      <WeeklyTrackItems
        items={track.items}
        strategies={strategies}
        onChange={(items: WeeklyTrackItem[]) => onChange({ ...track, items })}
      />

      {linked && (
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-gray-100 pt-2">
          <button
            onClick={() => setShowLeads((v) => !v)}
            className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-gray-700"
          >
            <Users size={11} /> 적용 리드 {progress.applied}명
          </button>
          <span className="text-[11px] text-gray-400 tabular-nums">
            컨택 {progress.contacted} · 결제 {progress.paid} · 매출 {manwon(progress.revenue)}원
          </span>
          {onLogApply && (
            <button onClick={onLogApply} className="text-[11px] font-semibold text-blue-600 hover:underline ml-auto">
              적용 기록
            </button>
          )}
        </div>
      )}

      {showLeads && progress.leads.length > 0 && (
        <div className="mt-1.5">
          <LeadChips leads={progress.leads} onSelectStudent={onSelectStudent} />
        </div>
      )}
    </li>
  );
}
