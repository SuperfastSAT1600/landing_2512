'use client';

import { useCallback, useEffect, useState } from 'react';
import { RefreshCw, BookOpen, FlaskConical, Brain, Monitor } from 'lucide-react';
import { srmFetch } from '../lib/srm-fetch';
import type { ServiceUsageResponse, ServiceUsageStudent } from '@/app/api/admin/srm/service-usage/route';

function toKstDateString(date: Date): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul' }).format(date);
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}분`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}분`;
}

type StatusTab = 'active' | 'paused';

function ActivityCell({ value, suffix }: { value: number | null; suffix: string }) {
  if (value === null || value === 0) {
    return <span className="text-gray-300">-</span>;
  }
  return (
    <span className="font-medium text-gray-800">
      {value}<span className="text-gray-400 font-normal text-[11px] ml-0.5">{suffix}</span>
    </span>
  );
}

function CoachRoomCell({ result }: { result: ServiceUsageStudent['coachRoom'] }) {
  if (!result) return <span className="text-gray-300">-</span>;
  return (
    <span className="font-medium text-gray-800 tabular-nums">
      {result.sessionCount}
      <span className="text-gray-400 font-normal text-[11px] ml-0.5">세션</span>
      {result.durationMinutes > 0 && (
        <span className="text-gray-500 text-[11px] ml-1">({formatDuration(result.durationMinutes)})</span>
      )}
    </span>
  );
}

function StatusBadge({ status }: { status: 'active' | 'paused' }) {
  if (status === 'active') {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700">
        재원
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700">
      휴원
    </span>
  );
}

export default function ServicePage() {
  const [date, setDate] = useState(toKstDateString(new Date()));
  const [data, setData] = useState<ServiceUsageResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<StatusTab>('active');

  const fetchData = useCallback(async (targetDate: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await srmFetch(`/api/admin/srm/service-usage?date=${targetDate}`);
      if (!res.ok) throw new Error(`${res.status}`);
      const json: ServiceUsageResponse = await res.json();
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : '불러오기 실패');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(date); }, [fetchData, date]);

  const students = data?.students.filter(s => s.tutoringStatus === tab) ?? [];
  const activeCount = data?.students.filter(s => s.tutoringStatus === 'active').length ?? 0;
  const pausedCount = data?.students.filter(s => s.tutoringStatus === 'paused').length ?? 0;

  return (
    <div className="min-h-screen bg-white text-gray-900 p-8 max-w-7xl">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-lg font-bold text-gray-900 tracking-tight">서비스 이용 현황</h1>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 focus:outline-none focus:border-blue-400"
          />
          <button
            onClick={() => fetchData(date)}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 border border-gray-200 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-40"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            새로고침
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 mb-4">
        <button
          onClick={() => setTab('active')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors ${
            tab === 'active'
              ? 'bg-emerald-600 text-white'
              : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
          }`}
        >
          재원
          <span className={`text-[10px] px-1.5 rounded-full ${tab === 'active' ? 'bg-white/25' : 'bg-emerald-200 text-emerald-700'}`}>
            {activeCount}
          </span>
        </button>
        <button
          onClick={() => setTab('paused')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors ${
            tab === 'paused'
              ? 'bg-amber-500 text-white'
              : 'text-amber-700 bg-amber-50 hover:bg-amber-100'
          }`}
        >
          휴원
          <span className={`text-[10px] px-1.5 rounded-full ${tab === 'paused' ? 'bg-white/25' : 'bg-amber-200 text-amber-700'}`}>
            {pausedCount}
          </span>
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="text-sm text-red-600 py-4">
          오류: {error}
          <button onClick={() => fetchData(date)} className="ml-2 underline text-blue-600">재시도</button>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-1">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />
          ))}
          <p className="text-xs text-gray-400 text-center pt-2">데이터 집계 중...</p>
        </div>
      )}

      {/* Table */}
      {!loading && !error && data && (
        students.length === 0 ? (
          <p className="text-xs text-gray-400 py-8 text-center">해당 학생 없음</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 w-8">#</th>
                  <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500">이름</th>
                  <th className="text-right py-2.5 px-3 text-xs font-semibold text-gray-500">
                    <span className="flex items-center justify-end gap-1">
                      <BookOpen size={11} />코치룸
                    </span>
                  </th>
                  <th className="text-right py-2.5 px-3 text-xs font-semibold text-gray-500">
                    <span className="flex items-center justify-end gap-1">
                      <FlaskConical size={11} />스터디홀
                    </span>
                  </th>
                  <th className="text-right py-2.5 px-3 text-xs font-semibold text-gray-500">
                    <span className="flex items-center justify-end gap-1">
                      <Brain size={11} />보캡
                    </span>
                  </th>
                  <th className="text-right py-2.5 px-3 text-xs font-semibold text-gray-500">
                    <span className="flex items-center justify-end gap-1">
                      <Monitor size={11} />테스트센터
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {students.map((s, i) => {
                  const hasAnyActivity = s.coachRoom || s.studyHall || s.vocab || s.testCenter;
                  return (
                    <tr
                      key={s.sfv2ProfileId ?? s.name}
                      className={`border-b border-gray-50 transition-colors ${
                        hasAnyActivity ? 'hover:bg-gray-50' : 'opacity-50 hover:opacity-70'
                      }`}
                    >
                      <td className="py-2.5 px-3 text-xs text-gray-400">{i + 1}</td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-800">{s.name}</span>
                          {tab === 'active' ? null : <StatusBadge status={s.tutoringStatus} />}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <CoachRoomCell result={s.coachRoom} />
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <ActivityCell value={s.studyHall?.totalProblems ?? null} suffix="문제" />
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <ActivityCell value={s.vocab?.gradedCount ?? null} suffix="단어" />
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <ActivityCell value={s.testCenter?.totalProblems ?? null} suffix="문제" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {/* Footer: totals */}
              <tfoot>
                <tr className="border-t border-gray-200 bg-gray-50">
                  <td className="py-2 px-3" />
                  <td className="py-2 px-3 text-xs font-semibold text-gray-500">합계</td>
                  <td className="py-2 px-3 text-right text-xs font-semibold text-gray-700">
                    {students.reduce((sum, s) => sum + (s.coachRoom?.sessionCount ?? 0), 0)}세션
                  </td>
                  <td className="py-2 px-3 text-right text-xs font-semibold text-gray-700">
                    {students.reduce((sum, s) => sum + (s.studyHall?.totalProblems ?? 0), 0)}문제
                  </td>
                  <td className="py-2 px-3 text-right text-xs font-semibold text-gray-700">
                    {students.reduce((sum, s) => sum + (s.vocab?.gradedCount ?? 0), 0)}단어
                  </td>
                  <td className="py-2 px-3 text-right text-xs font-semibold text-gray-700">
                    {students.reduce((sum, s) => sum + (s.testCenter?.totalProblems ?? 0), 0)}문제
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )
      )}
    </div>
  );
}
