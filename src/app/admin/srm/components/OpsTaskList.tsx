'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, Clock } from 'lucide-react';
import type { OpsTask } from '@/app/api/admin/srm/ops-tasks/route';

interface Props {
  date: string;
  onStudentClick: (id: string, name: string) => void;
}

export function OpsTaskList({ date, onStudentClick }: Props) {
  const [tasks, setTasks] = useState<OpsTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/srm/ops-tasks?date=${date}`)
      .then((r) => r.json())
      .then((data) => setTasks(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, [date]);

  if (loading) {
    return (
      <div className="space-y-2 mt-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-14 bg-white/5 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="mt-8 text-center text-sm text-gray-600">
        이 날짜에 처리할 작업이 없습니다.
      </div>
    );
  }

  return (
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
  );
}
