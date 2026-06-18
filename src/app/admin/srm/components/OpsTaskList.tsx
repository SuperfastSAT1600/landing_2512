'use client';
import { srmFetch } from '../lib/srm-fetch';

import { useEffect, useState } from 'react';
import { AlertTriangle, Clock } from 'lucide-react';
import type { OpsTask } from '@/app/api/admin/srm/ops-tasks/route';
import type { CopyLogEntry } from '@/app/api/admin/srm/copy-log/route';
import type { CommEntry } from '@/app/api/admin/srm/communications/route';
import { CHANNEL_LABELS, TRIGGER_BADGE_LABELS } from '@/app/admin/srm/comm-constants';

type ActivityItem =
  | { kind: 'copy'; data: CopyLogEntry }
  | { kind: 'comm'; data: CommEntry };

interface Props {
  date: string;
  onStudentClick: (id: string, name: string) => void;
}

export function OpsTaskList({ date, onStudentClick }: Props) {
  const [tasks, setTasks] = useState<OpsTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    srmFetch(`/api/admin/srm/ops-tasks?date=${date}`)
      .then((r) => r.json())
      .then((data) => setTasks(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, [date]);

  useEffect(() => {
    setActivitiesLoading(true);

    Promise.all([
      srmFetch(`/api/admin/srm/copy-log?date=${date}`)
        .then((r) => r.json())
        .then((res) => (Array.isArray(res.data) ? res.data : []) as CopyLogEntry[])
        .catch(() => [] as CopyLogEntry[]),
      srmFetch(`/api/admin/srm/communications?date=${date}`)
        .then((r) => r.json())
        .then((res) => (Array.isArray(res) ? res : []) as CommEntry[])
        .catch(() => [] as CommEntry[]),
    ]).then(([copyLogs, commLogs]) => {
      const items: ActivityItem[] = [
        ...copyLogs.map((data): ActivityItem => ({ kind: 'copy', data })),
        ...commLogs.map((data): ActivityItem => ({ kind: 'comm', data })),
      ];
      // Sort descending by time
      items.sort((a, b) => {
        const aTime = a.kind === 'copy' ? a.data.copied_at : a.data.created_at;
        const bTime = b.kind === 'copy' ? b.data.copied_at : b.data.created_at;
        return new Date(bTime).getTime() - new Date(aTime).getTime();
      });
      setActivities(items);
    }).finally(() => setActivitiesLoading(false));
  }, [date]);

  return (
    <div>
      {/* Ops task list */}
      {loading ? (
        <div className="space-y-2 mt-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <div className="mt-8 text-center text-sm text-gray-400">
          이 날짜에 처리할 작업이 없습니다.
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {tasks.map((task) => {
            const name = task.student_name ?? task.sfv2_profile_id ?? '미연결 학생';
            const clickId = task.sfv2_profile_id ?? task.student_id ?? '';
            return (
              <button
                key={task.id}
                onClick={() => onStudentClick(clickId, name)}
                className="w-full flex items-center gap-4 px-4 py-3 bg-white hover:bg-gray-50 rounded-lg text-left transition-colors border border-gray-200"
              >
                <div className="shrink-0">
                  {task.is_overdue ? (
                    <AlertTriangle size={16} className="text-red-600" />
                  ) : (
                    <Clock size={16} className="text-yellow-600" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium text-gray-900 truncate">{name}</p>
                    {task.hasSummerProgram && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 font-medium shrink-0">특강</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{task.stage_label}</p>
                </div>

                <div className="shrink-0 text-right">
                  {task.is_overdue ? (
                    <span className="text-xs font-medium text-red-600 bg-red-400/10 px-2 py-0.5 rounded-full">
                      D+{Math.ceil((new Date(date).getTime() - new Date(task.due_date).getTime()) / 86400000)}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-500">{task.due_date}</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Activity log section */}
      <div className="mt-8">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">오늘 활동 내역</h3>

        {activitiesLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        ) : activities.length === 0 ? (
          <p className="text-xs text-gray-400 py-2">아직 활동 내역 없음</p>
        ) : (
          <div className="space-y-1.5">
            {activities.map((item) => {
              if (item.kind === 'copy') {
                const log = item.data;
                const copiedTime = new Date(log.copied_at).toLocaleTimeString('ko-KR', {
                  timeZone: 'Asia/Seoul',
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: false,
                });
                const typeLabel = log.event_type === 'coach_room' ? '수업' : '스터디홀';
                return (
                  <div
                    key={`copy-${log.id}`}
                    className="flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-md text-xs border border-gray-100"
                  >
                    <span className="text-gray-500 font-mono shrink-0">{copiedTime}</span>
                    <span className="text-gray-600 shrink-0 text-[10px] px-1.5 py-0.5 bg-gray-100 rounded">복사</span>
                    <span className="text-gray-400 shrink-0">{typeLabel}</span>
                    <span className="text-gray-700 flex-1 truncate">
                      {log.student_names.join(', ')}
                    </span>
                    <span className="text-gray-500 shrink-0">{log.copied_by}</span>
                  </div>
                );
              }

              const comm = item.data;
              const commTime = new Date(comm.created_at).toLocaleTimeString('ko-KR', {
                timeZone: 'Asia/Seoul',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
              });
              return (
                <div
                  key={`comm-${comm.id}`}
                  className="flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-md text-xs border border-gray-100"
                >
                  <span className="text-gray-500 font-mono shrink-0">{commTime}</span>
                  {comm.trigger_type && comm.trigger_type !== 'manual' && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded shrink-0">
                      {TRIGGER_BADGE_LABELS[comm.trigger_type] ?? comm.trigger_type}
                    </span>
                  )}
                  <span className="text-gray-700 shrink-0 font-medium">{comm.student_name ?? '—'}</span>
                  <span className="text-gray-500 shrink-0">{CHANNEL_LABELS[comm.channel] ?? comm.channel}</span>
                  <span className="text-gray-600 flex-1 truncate">{comm.content}</span>
                  <span className="text-gray-500 shrink-0">{comm.author ?? ''}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
