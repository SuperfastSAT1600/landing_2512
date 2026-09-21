'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw, BookOpen, FlaskConical, Brain, Monitor, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
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

type SortKey = 'name' | 'coachRoom' | 'studyHall' | 'vocab' | 'testCenter';
type SortDir = 'asc' | 'desc';
type StatusTab = 'active' | 'paused';

function getSortValue(s: ServiceUsageStudent, key: SortKey): number | string {
  switch (key) {
    case 'name': return s.name;
    case 'coachRoom': return s.coachRoom?.sessionCount ?? -1;
    case 'studyHall': return s.studyHall?.totalProblems ?? -1;
    case 'vocab': return s.vocab?.gradedCount ?? -1;
    case 'testCenter': return s.testCenter?.totalProblems ?? -1;
  }
}

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <ChevronsUpDown size={11} className="text-gray-300" />;
  return sortDir === 'asc'
    ? <ChevronUp size={11} className="text-gray-600" />
    : <ChevronDown size={11} className="text-gray-600" />;
}

function cellBg(hasSchedule: boolean, hasActivity: boolean): string {
  if (!hasSchedule) return '';
  return hasActivity
    ? 'bg-emerald-50 rounded'
    : 'bg-red-50 rounded';
}

function ActivityCell({
  value, suffix, hasSchedule,
}: {
  value: number | null;
  suffix: string;
  hasSchedule: boolean;
}) {
  const bg = cellBg(hasSchedule, value !== null && value > 0);
  if (value === null || value === 0) {
    return (
      <span className={`inline-block px-1.5 py-0.5 ${bg}`}>
        <span className={hasSchedule ? 'text-red-400 font-medium' : 'text-gray-300'}>-</span>
      </span>
    );
  }
  return (
    <span className={`inline-block px-1.5 py-0.5 ${bg}`}>
      <span className="font-medium text-gray-800">
        {value}
        <span className="text-gray-400 font-normal text-[11px] ml-0.5">{suffix}</span>
      </span>
    </span>
  );
}

function CoachRoomCell({
  result, hasSchedule,
}: {
  result: ServiceUsageStudent['coachRoom'];
  hasSchedule: boolean;
}) {
  const bg = cellBg(hasSchedule, result !== null);
  if (!result) {
    return (
      <span className={`inline-block px-1.5 py-0.5 ${bg}`}>
        <span className={hasSchedule ? 'text-red-400 font-medium' : 'text-gray-300'}>-</span>
      </span>
    );
  }
  return (
    <span className={`inline-block px-1.5 py-0.5 ${bg} font-medium text-gray-800 tabular-nums`}>
      {result.sessionCount}
      <span className="text-gray-400 font-normal text-[11px] ml-0.5">세션</span>
      {result.durationMinutes > 0 && (
        <span className="text-gray-500 text-[11px] ml-1">({formatDuration(result.durationMinutes)})</span>
      )}
    </span>
  );
}

function SortableHeader({
  col, label, icon, sortKey, sortDir, onSort, align = 'right',
}: {
  col: SortKey;
  label: string;
  icon?: React.ReactNode;
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (col: SortKey) => void;
  align?: 'left' | 'right';
}) {
  return (
    <th
      className={`py-2.5 px-3 text-xs font-semibold text-gray-500 cursor-pointer hover:text-gray-800 select-none ${align === 'right' ? 'text-right' : 'text-left'}`}
      onClick={() => onSort(col)}
    >
      <span className={`inline-flex items-center gap-1 ${align === 'right' ? 'justify-end' : ''}`}>
        {icon}{label}
        <SortIcon col={col} sortKey={sortKey} sortDir={sortDir} />
      </span>
    </th>
  );
}

export default function ServicePage() {
  const [date, setDate] = useState(toKstDateString(new Date()));
  const [data, setData] = useState<ServiceUsageResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<StatusTab>('active');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [fromCache, setFromCache] = useState<boolean | null>(null);

  const fetchData = useCallback(async (targetDate: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await srmFetch(`/api/admin/srm/service-usage?date=${targetDate}`);
      if (!res.ok) throw new Error(`${res.status}`);
      const json: ServiceUsageResponse = await res.json();
      setData(json);
      setFromCache(json.fromCache ?? false);
    } catch (e) {
      setError(e instanceof Error ? e.message : '불러오기 실패');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(date); }, [fetchData, date]);

  const handleSort = (col: SortKey) => {
    if (col === sortKey) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(col);
      setSortDir('desc'); // Start desc for numeric columns, asc for name
      if (col === 'name') setSortDir('asc');
    }
  };

  const sortedStudents = useMemo(() => {
    const filtered = (data?.students ?? []).filter(s => s.tutoringStatus === tab);
    return [...filtered].sort((a, b) => {
      const av = getSortValue(a, sortKey);
      const bv = getSortValue(b, sortKey);
      let cmp = 0;
      if (typeof av === 'string' && typeof bv === 'string') {
        cmp = av.localeCompare(bv, 'ko');
      } else {
        cmp = (av as number) - (bv as number);
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [data, tab, sortKey, sortDir]);

  const activeCount = data?.students.filter(s => s.tutoringStatus === 'active').length ?? 0;
  const pausedCount = data?.students.filter(s => s.tutoringStatus === 'paused').length ?? 0;

  return (
    <div className="min-h-screen bg-white text-gray-900 p-8 max-w-7xl">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-lg font-bold text-gray-900 tracking-tight">서비스 이용 현황</h1>
        <div className="flex items-center gap-2">
          {fromCache === true && !loading && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-500 border border-blue-100 font-medium">
              캐시됨
            </span>
          )}
          <input
            type="date"
            value={date}
            onChange={e => { setFromCache(null); setDate(e.target.value); }}
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

      {/* Legend */}
      <div className="flex items-center gap-4 mb-4 text-[11px] text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-emerald-100 border border-emerald-300 inline-block" />
          스케줄 있음 + 접속
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-red-100 border border-red-300 inline-block" />
          스케줄 있음 + 미접속
        </span>
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
        sortedStudents.length === 0 ? (
          <p className="text-xs text-gray-400 py-8 text-center">해당 학생 없음</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 w-8">#</th>
                  <SortableHeader col="name" label="이름" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} align="left" />
                  <SortableHeader
                    col="coachRoom"
                    label="코치룸"
                    icon={<BookOpen size={11} />}
                    sortKey={sortKey} sortDir={sortDir} onSort={handleSort}
                  />
                  <SortableHeader
                    col="studyHall"
                    label="스터디홀"
                    icon={<FlaskConical size={11} />}
                    sortKey={sortKey} sortDir={sortDir} onSort={handleSort}
                  />
                  <SortableHeader
                    col="vocab"
                    label="보캡"
                    icon={<Brain size={11} />}
                    sortKey={sortKey} sortDir={sortDir} onSort={handleSort}
                  />
                  <SortableHeader
                    col="testCenter"
                    label="테스트센터"
                    icon={<Monitor size={11} />}
                    sortKey={sortKey} sortDir={sortDir} onSort={handleSort}
                  />
                </tr>
              </thead>
              <tbody>
                {sortedStudents.map((s, i) => (
                  <tr
                    key={s.sfv2ProfileId ?? s.name}
                    className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                  >
                    <td className="py-2.5 px-3 text-xs text-gray-400">{i + 1}</td>
                    <td className="py-2.5 px-3">
                      <span className="font-medium text-gray-800">{s.name}</span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <CoachRoomCell result={s.coachRoom} hasSchedule={s.schedule.coachRoom} />
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <ActivityCell
                        value={s.studyHall?.totalProblems ?? null}
                        suffix="문제"
                        hasSchedule={s.schedule.studyHall}
                      />
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <ActivityCell
                        value={s.vocab?.gradedCount ?? null}
                        suffix="단어"
                        hasSchedule={s.schedule.vocab}
                      />
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <ActivityCell
                        value={s.testCenter?.totalProblems ?? null}
                        suffix="문제"
                        hasSchedule={false}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-200 bg-gray-50">
                  <td className="py-2 px-3" />
                  <td className="py-2 px-3 text-xs font-semibold text-gray-500">합계</td>
                  <td className="py-2 px-3 text-right text-xs font-semibold text-gray-700">
                    {sortedStudents.reduce((sum, s) => sum + (s.coachRoom?.sessionCount ?? 0), 0)}세션
                  </td>
                  <td className="py-2 px-3 text-right text-xs font-semibold text-gray-700">
                    {sortedStudents.reduce((sum, s) => sum + (s.studyHall?.totalProblems ?? 0), 0)}문제
                  </td>
                  <td className="py-2 px-3 text-right text-xs font-semibold text-gray-700">
                    {sortedStudents.reduce((sum, s) => sum + (s.vocab?.gradedCount ?? 0), 0)}단어
                  </td>
                  <td className="py-2 px-3 text-right text-xs font-semibold text-gray-700">
                    {sortedStudents.reduce((sum, s) => sum + (s.testCenter?.totalProblems ?? 0), 0)}문제
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
