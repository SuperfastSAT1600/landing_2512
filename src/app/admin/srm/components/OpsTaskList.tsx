'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, Clock } from 'lucide-react';
import type { OpsTask } from '@/app/api/admin/srm/ops-tasks/route';
import type { CopyLogEntry } from '@/app/api/admin/srm/copy-log/route';

interface Props {
  date: string;
  onStudentClick: (id: string, name: string) => void;
}

export function OpsTaskList({ date, onStudentClick }: Props) {
  const [tasks, setTasks] = useState<OpsTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [copyLogs, setCopyLogs] = useState<CopyLogEntry[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/srm/ops-tasks?date=${date}`)
      .then((r) => r.json())
      .then((data) => setTasks(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, [date]);

  useEffect(() => {
    setLogsLoading(true);
    fetch(`/api/admin/srm/copy-log?date=${date}`)
      .then((r) => r.json())
      .then((res) => setCopyLogs(Array.isArray(res.data) ? res.data : []))
      .catch(() => setCopyLogs([]))
      .finally(() => setLogsLoading(false));
  }, [date]);

  return (
    <div>
      {/* Ops task list */}
      {loading ? (
        <div className="space-y-2 mt-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 bg-white/5 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <div className="mt-8 text-center text-sm text-gray-600">
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
                className="w-full flex items-center gap-4 px-4 py-3 bg-white/5 hover:bg-white/10 rounded-lg text-left transition-colors"
              >
                <div className="shrink-0">
                  {task.is_overdue ? (
                    <AlertTriangle size={16} className="text-red-400" />
                  ) : (
                    <Clock size={16} className="text-yellow-400" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{task.stage_label}</p>
                </div>

                <div className="shrink-0 text-right">
                  {task.is_overdue ? (
                    <span className="text-xs font-medium text-red-400 bg-red-400/10 px-2 py-0.5 rounded-full">
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

      {/* Copy log section */}
      <div className="mt-8">
        <h3 className="text-sm font-semibold text-white mb-3">오늘 발송 내역</h3>

        {logsLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 bg-white/5 rounded animate-pulse" />
            ))}
          </div>
        ) : copyLogs.length === 0 ? (
          <p className="text-xs text-gray-600 py-2">아직 발송 내역 없음</p>
        ) : (
          <div className="space-y-1.5">
            {copyLogs.map((log) => {
              const copiedTime = new Date(log.copied_at).toLocaleTimeString('ko-KR', {
                timeZone: 'Asia/Seoul',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
              });
              const typeLabel = log.event_type === 'coach_room' ? '수업' : '스터디홀';

              return (
                <div
                  key={log.id}
                  className="flex items-center gap-3 px-3 py-2 bg-white/5 rounded-md text-xs"
                >
                  <span className="text-gray-500 font-mono shrink-0">{copiedTime}</span>
                  <span className="text-gray-400 shrink-0">{typeLabel}</span>
                  <span className="text-gray-300 flex-1 truncate">
                    {log.student_names.join(', ')}
                  </span>
                  <span className="text-gray-500 shrink-0">{log.copied_by}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
