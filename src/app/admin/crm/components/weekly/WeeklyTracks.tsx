'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import type { WeeklyExecutionRow, WeeklyPlanSegment, WeeklyTrack } from '@/types/crm';
import { computeTrackProgress, unplannedRows } from '@/lib/weekly-track-progress';
import { WeeklyQuickLog } from './WeeklyQuickLog';
import { WeeklyTrackCard } from './WeeklyTrackCard';
import { WeeklyUnplanned } from './WeeklyUnplanned';
import { SEGMENT_LABELS, WEEKLY_TRACK_PRESETS } from './presets';
import { useStrategyLibrary } from './useStrategyLibrary';

interface Props {
  segment: WeeklyPlanSegment;
  adminKey: string;
  tracks: WeeklyTrack[];
  execution: WeeklyExecutionRow[];
  /** 적용 기록 시각 — 보고 있는 주차 안의 시각. */
  logAt: string;
  showSegmentLabel?: boolean;
  onChange: (tracks: WeeklyTrack[]) => void;
  onLogged: () => void;
  onSelectStudent?: (id: string) => void;
}

const emptyTrack = (name: string): WeeklyTrack => ({
  id: crypto.randomUUID(),
  name,
  goal_text: '',
  metric: null,
  target_value: 0,
  achieved: false,
  items: [],
  carried_from_week: null,
});

/** 한 세그먼트의 이번 주 트랙 목록 + 계획 외 실행. */
export function WeeklyTracks({
  segment, adminKey, tracks, execution, logAt, showSegmentLabel, onChange, onLogged, onSelectStudent,
}: Props) {
  const [picking, setPicking] = useState(false);
  const [loggingTrackId, setLoggingTrackId] = useState<string | null>(null);
  const strategies = useStrategyLibrary(segment, adminKey);

  const add = (name: string) => {
    setPicking(false);
    onChange([...tracks, emptyTrack(name)]);
  };
  const patch = (id: string, next: WeeklyTrack) =>
    onChange(tracks.map((t) => (t.id === id ? next : t)));

  const loggingTrack = tracks.find((t) => t.id === loggingTrackId) ?? null;
  const loggingIds = loggingTrack
    ? computeTrackProgress(loggingTrack, execution).linkedStrategyIds
    : undefined;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        {showSegmentLabel ? (
          <p className="text-[11px] font-semibold text-gray-400">{SEGMENT_LABELS[segment]}</p>
        ) : <div />}
        <button
          onClick={() => setPicking((v) => !v)}
          className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
        >
          <Plus size={13} /> 트랙 추가
        </button>
      </div>

      {picking && (
        <div className="mb-2 flex flex-wrap gap-1.5 rounded-lg border border-blue-200 bg-blue-50/50 p-2.5">
          {WEEKLY_TRACK_PRESETS[segment].map((name) => (
            <button
              key={name}
              onClick={() => add(name)}
              className="text-xs px-2.5 py-1 rounded-md bg-white border border-gray-200 text-gray-700 hover:border-blue-400 hover:text-blue-600"
            >
              {name}
            </button>
          ))}
          <button
            onClick={() => add('')}
            className="text-xs px-2.5 py-1 rounded-md text-gray-400 hover:text-gray-600"
          >
            이름 없이 추가
          </button>
        </div>
      )}

      {tracks.length === 0 ? (
        <p className="text-sm text-gray-400 py-6 text-center border border-dashed border-gray-200 rounded-lg">
          이번 주에 밀어볼 트랙을 만드세요.
        </p>
      ) : (
        <ul className="space-y-2">
          {tracks.map((track) => (
            <WeeklyTrackCard
              key={track.id}
              track={track}
              progress={computeTrackProgress(track, execution)}
              strategies={strategies}
              segmentLabel={showSegmentLabel ? SEGMENT_LABELS[segment] : null}
              onChange={(next) => patch(track.id, next)}
              onRemove={() => onChange(tracks.filter((t) => t.id !== track.id))}
              onSelectStudent={onSelectStudent}
              onLogApply={() => setLoggingTrackId(track.id)}
            />
          ))}
        </ul>
      )}

      {loggingTrack && (
        <div className="mt-2">
          <WeeklyQuickLog
            segment={segment}
            adminKey={adminKey}
            appliedAt={logAt}
            strategyIds={loggingIds}
            onLogged={onLogged}
            onClose={() => setLoggingTrackId(null)}
          />
        </div>
      )}

      <WeeklyUnplanned rows={unplannedRows(tracks, execution)} onSelectStudent={onSelectStudent} />
    </div>
  );
}
