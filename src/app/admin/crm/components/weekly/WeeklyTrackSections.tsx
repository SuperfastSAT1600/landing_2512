'use client';

import type { WeeklyExecutionRow, WeeklyPlanSegment, WeeklyTrack } from '@/types/crm';
import { WeeklyTracks } from './WeeklyTracks';
import { SEGMENT_LABELS } from './presets';

export type SegmentFilter = 'all' | WeeklyPlanSegment;

interface SegmentData {
  tracks: WeeklyTrack[];
  execution: WeeklyExecutionRow[];
  onChange: (tracks: WeeklyTrack[]) => void;
  onLogged: () => void;
}

interface Props {
  adminKey: string;
  logAt: string;
  filter: SegmentFilter;
  visible: WeeklyPlanSegment[];
  data: Record<WeeklyPlanSegment, SegmentData>;
  onFilter: (f: SegmentFilter) => void;
  onSelectStudent?: (id: string) => void;
  onOpenLibrary?: () => void;
}

/** '이번 주 실행 계획' 섹션 — 세그먼트 필터 + 세그먼트별 트랙 목록. */
export function WeeklyTrackSections({
  adminKey, logAt, filter, visible, data, onFilter, onSelectStudent, onOpenLibrary,
}: Props) {
  return (
    <section className="border-b border-gray-100 pb-6">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <p className="text-xs font-semibold text-gray-400">이번 주 실행 계획</p>
        <div className="flex items-center gap-3">
          {onOpenLibrary && (
            <button onClick={onOpenLibrary} className="text-xs text-gray-400 hover:text-gray-600">
              전략 라이브러리 ↗
            </button>
          )}
          <div className="flex gap-0.5 bg-gray-100 rounded-md p-0.5">
            {([['all', '전체'], ['b2c', SEGMENT_LABELS.b2c], ['b2b', SEGMENT_LABELS.b2b]] as const).map(
              ([k, label]) => (
                <button
                  key={k}
                  onClick={() => onFilter(k)}
                  className={`px-2 py-0.5 text-[11px] font-semibold rounded transition-colors ${
                    filter === k ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {label}
                </button>
              ),
            )}
          </div>
        </div>
      </div>

      <div className="space-y-5">
        {visible.map((s) => (
          <WeeklyTracks
            key={s}
            segment={s}
            adminKey={adminKey}
            tracks={data[s].tracks}
            execution={data[s].execution}
            logAt={logAt}
            showSegmentLabel={filter === 'all'}
            onChange={data[s].onChange}
            onLogged={data[s].onLogged}
            onSelectStudent={onSelectStudent}
          />
        ))}
      </div>
    </section>
  );
}
