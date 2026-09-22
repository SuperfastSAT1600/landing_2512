'use client';

import { useEffect, useState } from 'react';
import { X, BookOpen, FlaskConical, Brain, Monitor } from 'lucide-react';
import { srmFetch } from '../lib/srm-fetch';
import type { StudentDailyHistoryResponse, StudentDayRecord } from '@/app/api/admin/srm/student-daily-history/route';

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}분`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}분`;
}

function cellBg(hasSchedule: boolean, hasActivity: boolean) {
  if (!hasSchedule) return '';
  return hasActivity ? 'bg-emerald-50' : 'bg-red-50';
}

function DayRow({ day }: { day: StudentDayRecord }) {
  const hasAnyActivity =
    (day.coachRoom?.sessionCount ?? 0) > 0 ||
    (day.studyHall?.totalProblems ?? 0) > 0 ||
    (day.vocab?.gradedCount ?? 0) > 0 ||
    (day.testCenter?.totalProblems ?? 0) > 0;

  return (
    <tr className={`border-b border-gray-50 ${hasAnyActivity ? '' : 'opacity-50'}`}>
      <td className="py-2 px-3 text-xs text-gray-500 whitespace-nowrap">{day.date}</td>

      {/* 코치룸 */}
      <td className="py-2 px-3 text-right">
        <span className={`inline-block px-1.5 py-0.5 rounded text-xs ${cellBg(day.schedule.coachRoom, (day.coachRoom?.sessionCount ?? 0) > 0)}`}>
          {day.coachRoom ? (
            <span className="font-medium text-gray-800">
              {day.coachRoom.sessionCount}세션
              {day.coachRoom.durationMinutes > 0 && (
                <span className="text-gray-400 font-normal ml-1">({formatDuration(day.coachRoom.durationMinutes)})</span>
              )}
            </span>
          ) : (
            <span className={day.schedule.coachRoom ? 'text-red-400' : 'text-gray-300'}>-</span>
          )}
        </span>
      </td>

      {/* 스터디홀 */}
      <td className="py-2 px-3 text-right">
        <span className={`inline-block px-1.5 py-0.5 rounded text-xs ${cellBg(day.schedule.studyHall, (day.studyHall?.totalProblems ?? 0) > 0)}`}>
          {(day.studyHall?.totalProblems ?? 0) > 0 ? (
            <span className="font-medium text-gray-800">{day.studyHall!.totalProblems}<span className="text-gray-400 font-normal ml-0.5">문제</span></span>
          ) : (
            <span className={day.schedule.studyHall ? 'text-red-400' : 'text-gray-300'}>-</span>
          )}
        </span>
      </td>

      {/* 보캡 */}
      <td className="py-2 px-3 text-right">
        <span className={`inline-block px-1.5 py-0.5 rounded text-xs ${cellBg(day.schedule.vocab, (day.vocab?.gradedCount ?? 0) > 0)}`}>
          {(day.vocab?.gradedCount ?? 0) > 0 ? (
            <span className="font-medium text-gray-800">{day.vocab!.gradedCount}<span className="text-gray-400 font-normal ml-0.5">단어</span></span>
          ) : (
            <span className={day.schedule.vocab ? 'text-red-400' : 'text-gray-300'}>-</span>
          )}
        </span>
      </td>

      {/* 테스트센터 */}
      <td className="py-2 px-3 text-right">
        <span className="inline-block px-1.5 py-0.5 rounded text-xs">
          {(day.testCenter?.totalProblems ?? 0) > 0 ? (
            <span className="font-medium text-gray-800">{day.testCenter!.totalProblems}<span className="text-gray-400 font-normal ml-0.5">문제</span></span>
          ) : (
            <span className="text-gray-300">-</span>
          )}
        </span>
      </td>
    </tr>
  );
}

interface Props {
  profileId: string;
  name: string;
  onClose: () => void;
}

export default function StudentHistoryModal({ profileId, name, onClose }: Props) {
  const [data, setData] = useState<StudentDailyHistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await srmFetch(
          `/api/admin/srm/student-daily-history?profileId=${profileId}&name=${encodeURIComponent(name)}`
        );
        if (!res.ok) throw new Error(`${res.status}`);
        setData(await res.json());
      } catch (e) {
        setError(e instanceof Error ? e.message : '불러오기 실패');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [profileId, name]);

  // 활동 있는 날 요약
  const activeDays = data?.days.filter(d =>
    (d.coachRoom?.sessionCount ?? 0) > 0 ||
    (d.studyHall?.totalProblems ?? 0) > 0 ||
    (d.vocab?.gradedCount ?? 0) > 0 ||
    (d.testCenter?.totalProblems ?? 0) > 0
  ).length ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-bold text-gray-900">{name}</h2>
            {data && !loading && (
              <p className="text-xs text-gray-400 mt-0.5">최근 30일 · 활동일 {activeDays}일</p>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-2 py-2">
          {loading && (
            <div className="space-y-1 p-3">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />
              ))}
            </div>
          )}
          {error && <p className="text-sm text-red-500 p-4">{error}</p>}
          {data && !loading && (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="py-2 px-3 text-xs font-semibold text-gray-500 text-left">날짜</th>
                  <th className="py-2 px-3 text-xs font-semibold text-gray-500 text-right">
                    <span className="inline-flex items-center gap-1"><BookOpen size={10} />코치룸</span>
                  </th>
                  <th className="py-2 px-3 text-xs font-semibold text-gray-500 text-right">
                    <span className="inline-flex items-center gap-1"><FlaskConical size={10} />스터디홀</span>
                  </th>
                  <th className="py-2 px-3 text-xs font-semibold text-gray-500 text-right">
                    <span className="inline-flex items-center gap-1"><Brain size={10} />보캡</span>
                  </th>
                  <th className="py-2 px-3 text-xs font-semibold text-gray-500 text-right">
                    <span className="inline-flex items-center gap-1"><Monitor size={10} />테스트센터</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {[...data.days].reverse().map(day => (
                  <DayRow key={day.date} day={day} />
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
