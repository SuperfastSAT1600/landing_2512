'use client';
import { srmFetch } from '../lib/srm-fetch';

import { useEffect, useState } from 'react';
import type { ScheduleResponse, ScheduleEvent } from '@/app/api/admin/srm/schedule/route';
import type { CopyLogEntry } from '@/app/api/admin/srm/copy-log/route';

function toTimeStr(iso: string): string {
  return new Date(iso).toLocaleTimeString('ko-KR', {
    timeZone: 'Asia/Seoul',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

interface UncaredEvent {
  id: string;
  time: string;
  students: string[];
  coaches: string[];
  type: 'coachRoom' | 'studyHall';
  day: 'today' | 'tomorrow';
}

interface Props {
  date: string;
}

export function DailyStatsPanel({ date }: Props) {
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [caredCount, setCaredCount] = useState(0);
  const [uncaredEvents, setUncaredEvents] = useState<UncaredEvent[]>([]);

  useEffect(() => {
    setLoading(true);

    Promise.all([
      srmFetch(`/api/admin/srm/schedule?date=${date}`)
        .then((r) => r.json())
        .catch((): ScheduleResponse => ({ today: { coachRoom: [], studyHall: [], vocab: [] }, tomorrow: { coachRoom: [], studyHall: [], vocab: [] } })),
      srmFetch(`/api/admin/srm/copy-log?date=${date}`)
        .then((r) => r.json())
        .then((res) => (Array.isArray(res.data) ? res.data : []) as CopyLogEntry[])
        .catch((): CopyLogEntry[] => []),
    ]).then(([scheduleData, copyLogs]: [ScheduleResponse, CopyLogEntry[]]) => {
      const caredIds = new Set(copyLogs.map((l) => l.event_id));

      const allEvents: (UncaredEvent & { id: string })[] = [
        ...(scheduleData.today?.coachRoom ?? []).map((ev: ScheduleEvent) => ({
          id: ev.id,
          time: toTimeStr(ev.startsAt),
          students: ev.students,
          coaches: ev.coaches,
          type: 'coachRoom' as const,
          day: 'today' as const,
        })),
        ...(scheduleData.today?.studyHall ?? []).map((ev: ScheduleEvent) => ({
          id: ev.id,
          time: toTimeStr(ev.startsAt),
          students: ev.students,
          coaches: ev.coaches,
          type: 'studyHall' as const,
          day: 'today' as const,
        })),
        ...(scheduleData.tomorrow?.coachRoom ?? []).map((ev: ScheduleEvent) => ({
          id: ev.id,
          time: toTimeStr(ev.startsAt),
          students: ev.students,
          coaches: ev.coaches,
          type: 'coachRoom' as const,
          day: 'tomorrow' as const,
        })),
        ...(scheduleData.tomorrow?.studyHall ?? []).map((ev: ScheduleEvent) => ({
          id: ev.id,
          time: toTimeStr(ev.startsAt),
          students: ev.students,
          coaches: ev.coaches,
          type: 'studyHall' as const,
          day: 'tomorrow' as const,
        })),
      ];

      const total = allEvents.length;
      const cared = allEvents.filter((ev) => caredIds.has(ev.id)).length;
      const uncared = allEvents.filter((ev) => !caredIds.has(ev.id));

      setTotalCount(total);
      setCaredCount(cared);
      setUncaredEvents(uncared);
    }).finally(() => setLoading(false));
  }, [date]);

  const pct = totalCount > 0 ? Math.round((caredCount / totalCount) * 100) : 0;

  const typeLabel = (type: 'coachRoom' | 'studyHall') =>
    type === 'coachRoom' ? '수업' : '스터디홀';

  return (
    <div className="space-y-6">
      {/* 달성률 카드 */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">업무 달성률</h3>

        {loading ? (
          <div className="space-y-3">
            <div className="h-6 bg-gray-100 rounded animate-pulse" />
            <div className="h-3 bg-gray-100 rounded animate-pulse w-2/3" />
          </div>
        ) : totalCount === 0 ? (
          <p className="text-sm text-gray-400">이 날짜에 스케줄이 없습니다.</p>
        ) : (
          <>
            <div className="flex items-end gap-3 mb-3">
              <span className="text-3xl font-bold text-gray-900">{pct}%</span>
              <span className="text-sm text-gray-500 pb-1">
                전체 {totalCount}건 중 {caredCount}건 처리
              </span>
            </div>

            {/* 게이지 바 */}
            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-yellow-400' : 'bg-red-400'
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>

            <div className="flex justify-between text-[10px] text-gray-400 mt-1.5">
              <span>0%</span>
              <span className="text-emerald-600 font-medium">목표: 100%</span>
              <span>100%</span>
            </div>
          </>
        )}
      </div>

      {/* 미케어 수업 목록 */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-sm font-semibold text-gray-700">케어 안 된 수업</h3>
          {!loading && (
            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
              {uncaredEvents.length}
            </span>
          )}
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : uncaredEvents.length === 0 ? (
          <div className="py-6 text-center">
            <p className="text-sm text-emerald-600 font-medium">모든 수업이 처리되었습니다 ✓</p>
          </div>
        ) : (
          <div className="space-y-2">
            {uncaredEvents.map((ev) => (
              <div
                key={ev.id}
                className="flex items-center gap-3 px-3 py-2.5 bg-gray-50 rounded-lg border border-gray-100 text-sm"
              >
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-gray-200 text-gray-600 shrink-0">
                  {ev.day === 'today' ? '오늘' : '내일'}
                </span>
                <span
                  className={`text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0 ${
                    ev.type === 'coachRoom'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-purple-100 text-purple-700'
                  }`}
                >
                  {typeLabel(ev.type)}
                </span>
                <span className="font-mono text-xs text-gray-500 shrink-0">{ev.time}</span>
                <span className="text-gray-800 flex-1 truncate">
                  {ev.students.join(', ')}
                </span>
                {ev.coaches.length > 0 && (
                  <span className="text-gray-400 text-xs shrink-0">
                    ↔ {ev.coaches.join(', ')}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
