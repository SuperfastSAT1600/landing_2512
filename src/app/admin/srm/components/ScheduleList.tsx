'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { ScheduleEvent } from '@/app/api/admin/srm/schedule/route';

function toTimeStr(iso: string, tz: string): string {
  return new Date(iso).toLocaleTimeString('ko-KR', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function buildCopyMessage(ev: ScheduleEvent): string {
  const kstTime = toTimeStr(ev.startsAt, 'Asia/Seoul');

  const localParts = ev.students.map((name, i) => {
    const tz = ev.studentTimezones?.[i];
    if (!tz || tz === 'Asia/Seoul') return null;
    try {
      const localTime = toTimeStr(ev.startsAt, tz);
      if (localTime === kstTime) return null;
      return `${name} ${localTime}(현지 시간)`;
    } catch {
      return null;
    }
  }).filter(Boolean);

  let msg = `<알림> 오늘 수업 ${kstTime}(한국 시간 기준)에 있습니다!`;
  if (localParts.length > 0) msg += ` (${localParts.join(', ')})`;
  msg += ' 출석 잘해서 공부해보자구요!';
  return msg;
}

interface StudentChip { id: string; name: string; }

interface Props {
  title: string;
  events: ScheduleEvent[];
  type: 'coachRoom' | 'studyHall';
  loading?: boolean;
  onStudentClick: (student: StudentChip) => void;
}

export function ScheduleList({ title, events, type, loading, onStudentClick }: Props) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const icon = type === 'coachRoom' ? '●' : '○';
  const completedIcon = '✓';

  const handleCopy = async (ev: ScheduleEvent) => {
    const msg = buildCopyMessage(ev);
    await navigator.clipboard.writeText(msg);
    setCopiedId(ev.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        <span className="text-xs bg-white/10 text-gray-400 px-2 py-0.5 rounded-full">
          {loading ? '…' : events.length}
        </span>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 bg-white/5 rounded animate-pulse" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <p className="text-xs text-gray-600 py-4">스케줄 없음</p>
      ) : (
        <div className="space-y-1.5">
          {events.map((ev) => {
            const isDone = ev.status === 'completed';
            const timeStr = `${toTimeStr(ev.startsAt, 'Asia/Seoul')}~${toTimeStr(ev.endsAt, 'Asia/Seoul')}`;

            return (
              <div
                key={ev.id}
                className={`flex items-start gap-2.5 px-3 py-2 rounded-md text-sm group ${
                  isDone ? 'bg-white/3 opacity-60' : 'bg-white/5'
                }`}
              >
                <span className={`mt-0.5 text-xs shrink-0 ${isDone ? 'text-emerald-400' : 'text-gray-500'}`}>
                  {isDone ? completedIcon : icon}
                </span>
                <span className="text-gray-400 font-mono text-xs shrink-0 mt-0.5">{timeStr}</span>
                <span className="leading-tight flex flex-wrap gap-x-1 gap-y-0.5 flex-1">
                  {ev.students.map((name, i) => (
                    <button
                      key={`${ev.id}-s-${i}`}
                      onClick={() => onStudentClick({ id: ev.studentIds?.[i] ?? name, name })}
                      className={`hover:text-blue-400 hover:underline transition-colors ${
                        isDone ? 'text-gray-500' : 'text-gray-200'
                      }`}
                    >
                      {name}
                    </button>
                  ))}
                  {type === 'coachRoom' && ev.coaches.length > 0 && (
                    <span className="text-gray-500">↔ {ev.coaches.join(', ')}</span>
                  )}
                </span>

                {type === 'coachRoom' && (
                  <button
                    onClick={() => handleCopy(ev)}
                    title="수업 알림 메시지 복사"
                    className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 text-gray-500 hover:text-blue-400"
                  >
                    {copiedId === ev.id
                      ? <Check size={13} className="text-green-400" />
                      : <Copy size={13} />
                    }
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
