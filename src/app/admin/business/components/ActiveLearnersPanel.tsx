'use client';

import { useEffect, useState, useCallback } from 'react';
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import dynamic from 'next/dynamic';
import type { ActiveLearnerRow } from '@/app/api/admin/active-learners/route';

const BarChart = dynamic(() => import('recharts').then((m) => m.BarChart), { ssr: false });
const Bar = dynamic(() => import('recharts').then((m) => m.Bar), { ssr: false });
const XAxis = dynamic(() => import('recharts').then((m) => m.XAxis), { ssr: false });
const YAxis = dynamic(() => import('recharts').then((m) => m.YAxis), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then((m) => m.Tooltip), { ssr: false });
const ResponsiveContainer = dynamic(() => import('recharts').then((m) => m.ResponsiveContainer), { ssr: false });

type SpaceKey = 'study_hall' | 'test_center' | 'vocab';

const SPACE_CONFIG: { key: SpaceKey; label: string; color: string }[] = [
  { key: 'study_hall', label: '스터디홀', color: '#a855f7' },
  { key: 'test_center', label: '테스트센터', color: '#3b82f6' },
  { key: 'vocab', label: '단어', color: '#f59e0b' },
];

function toKstDateString(date: Date): string {
  // KST = UTC+9
  const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

function kstToday(): string {
  return toKstDateString(new Date());
}

function stepDate(dateStr: string, delta: number): string {
  const d = new Date(dateStr + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

function fmtDateLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00Z');
  return d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });
}

interface HourRow {
  hour: number;
  study_hall: number;
  test_center: number;
  vocab: number;
}

interface StudentCount {
  total: number;
  onboarding: number;
  active: number;
  paused: number;
}

interface Props {
  adminKey: string;
}

export function ActiveLearnersPanel({ adminKey }: Props) {
  const [date, setDate] = useState<string>(kstToday);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<ActiveLearnerRow[]>([]);
  const [error, setError] = useState('');
  const [studentCount, setStudentCount] = useState<StudentCount | null>(null);

  const fetchData = useCallback(async (targetDate: string) => {
    setLoading(true);
    setError('');
    try {
      const qs = new URLSearchParams({ from: targetDate, to: targetDate });
      const res = await fetch(`/api/admin/active-learners?${qs}`, {
        headers: { 'x-admin-key': adminKey },
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error?.message ?? '조회 실패');
        return;
      }
      setRows(json.data as ActiveLearnerRow[]);
    } catch {
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [adminKey]);

  useEffect(() => { fetchData(date); }, [date, fetchData]);

  useEffect(() => {
    fetch('/api/admin/srm/active-student-count', {
      headers: { 'x-admin-key': adminKey },
    })
      .then((r) => r.json())
      .then((json) => { if (json.data) setStudentCount(json.data); })
      .catch(() => {});
  }, [adminKey]);

  const goDay = (delta: number) => setDate((d) => stepDate(d, delta));
  const isToday = date === kstToday();

  // 시간대별 데이터 변환 (0-23시, 데이터 없는 시간은 0)
  const hourMap: Record<number, HourRow> = {};
  for (const r of rows) {
    if (!hourMap[r.hour]) hourMap[r.hour] = { hour: r.hour, study_hall: 0, test_center: 0, vocab: 0 };
    hourMap[r.hour][r.space as SpaceKey] = r.users;
  }

  // 데이터 있는 시간대만 표시 (없으면 전체 0으로)
  const chartData: HourRow[] = Array.from({ length: 24 }, (_, h) =>
    hourMap[h] ?? { hour: h, study_hall: 0, test_center: 0, vocab: 0 }
  );

  // 데이터 있는 시간 범위만 표시 (앞뒤 빈 시간 잘라내기)
  let startH = 0, endH = 23;
  for (let h = 0; h < 24; h++) {
    if (chartData[h].study_hall + chartData[h].test_center + chartData[h].vocab > 0) {
      startH = Math.max(0, h - 1);
      break;
    }
  }
  for (let h = 23; h >= 0; h--) {
    if (chartData[h].study_hall + chartData[h].test_center + chartData[h].vocab > 0) {
      endH = Math.min(23, h + 1);
      break;
    }
  }
  const visibleData = chartData.slice(startH, endH + 1);

  // 일별 합산 (space별)
  const totals = rows.reduce(
    (acc, r) => { acc[r.space as SpaceKey] = (acc[r.space as SpaceKey] ?? 0) + r.users; return acc; },
    {} as Record<SpaceKey, number>
  );

  // peak hour
  const peak = chartData.reduce((best, row) => {
    const sum = row.study_hall + row.test_center + row.vocab;
    return sum > best.sum ? { hour: row.hour, sum } : best;
  }, { hour: -1, sum: 0 });

  const hasData = rows.length > 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        {/* 날짜 네비게이션 */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => goDay(-1)}
            className="p-1 rounded-lg border border-gray-200 text-gray-500 hover:border-gray-400 transition-colors"
          >
            <ChevronLeft size={14} />
          </button>
          <span className="text-xs font-medium text-gray-700 min-w-[120px] text-center">
            {fmtDateLabel(date)}
            {isToday && <span className="ml-1 text-[10px] text-blue-500">오늘</span>}
          </span>
          <button
            onClick={() => goDay(1)}
            disabled={isToday}
            className="p-1 rounded-lg border border-gray-200 text-gray-500 hover:border-gray-400 disabled:opacity-30 transition-colors"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* 에러 */}
      {error && (
        <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600 mb-3">
          {error}
        </div>
      )}

      {/* 총 학생 수 + 공간별 요약 카드 (항상 표시) */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <div className="flex-1 min-w-[80px] px-3 py-2 rounded-xl bg-indigo-50 border border-indigo-100">
          <p className="text-[10px] text-indigo-400 mb-0.5">총 학생 수</p>
          <p className="text-xl font-bold text-indigo-700 tabular-nums">
            {studentCount ? studentCount.total : '—'}
          </p>
          {studentCount && (
            <p className="text-[10px] text-indigo-400">
              온{studentCount.onboarding} 재{studentCount.active} 휴{studentCount.paused}
            </p>
          )}
        </div>
        {SPACE_CONFIG.map(({ key, label, color }) => (
          <div key={key} className="flex-1 min-w-[80px] px-3 py-2 rounded-xl bg-gray-50 border border-gray-100">
            <p className="text-[10px] text-gray-400 mb-0.5 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full inline-block" style={{ background: color }} />
              {label}
            </p>
            <p className="text-xl font-bold tabular-nums" style={{ color }}>
              {totals[key] ?? 0}
            </p>
            <p className="text-[10px] text-gray-400">명 접속</p>
          </div>
        ))}
        {peak.sum > 0 && (
          <div className="flex-1 min-w-[80px] px-3 py-2 rounded-xl bg-gray-50 border border-gray-100">
            <p className="text-[10px] text-gray-400 mb-0.5">피크 시간</p>
            <p className="text-xl font-bold text-gray-800 tabular-nums">{peak.hour}시</p>
            <p className="text-[10px] text-gray-400">{peak.sum}명 동시</p>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-8 text-sm text-gray-400">
          <Loader2 size={16} className="animate-spin" /> 불러오는 중…
        </div>
      ) : hasData ? (
        <>
          {/* 시간대별 막대 그래프 */}
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={visibleData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barCategoryGap="20%">
                <XAxis
                  dataKey="hour"
                  tickFormatter={(h: number) => `${h}시`}
                  tick={{ fontSize: 10, fill: '#9ca3af' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 10, fill: '#9ca3af' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(value, name) => {
                    const cfg = SPACE_CONFIG.find((s) => s.key === name);
                    return [`${value}명`, cfg?.label ?? String(name)];
                  }}
                  labelFormatter={(h) => `${h}시`}
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
                />
                {SPACE_CONFIG.map(({ key, color }) => (
                  <Bar key={key} dataKey={key} fill={color} radius={[3, 3, 0, 0]} maxBarSize={18} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* 시간대별 숫자 테이블 (접속자 있는 시간만) */}
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-1.5 pr-3 text-[10px] font-medium text-gray-400">시간</th>
                  {SPACE_CONFIG.map(({ key, label, color }) => (
                    <th key={key} className="text-right py-1.5 px-2 text-[10px] font-medium" style={{ color }}>
                      {label}
                    </th>
                  ))}
                  <th className="text-right py-1.5 pl-2 text-[10px] font-medium text-gray-400">합계</th>
                </tr>
              </thead>
              <tbody>
                {chartData
                  .filter((r) => r.study_hall + r.test_center + r.vocab > 0)
                  .map((r) => {
                    const total = r.study_hall + r.test_center + r.vocab;
                    return (
                      <tr key={r.hour} className="border-b border-gray-50 hover:bg-gray-50/50">
                        <td className="py-1.5 pr-3 text-gray-600 font-medium tabular-nums">{r.hour}시</td>
                        <td className="text-right py-1.5 px-2 tabular-nums font-semibold" style={{ color: '#a855f7' }}>
                          {r.study_hall || '·'}
                        </td>
                        <td className="text-right py-1.5 px-2 tabular-nums font-semibold" style={{ color: '#3b82f6' }}>
                          {r.test_center || '·'}
                        </td>
                        <td className="text-right py-1.5 px-2 tabular-nums font-semibold" style={{ color: '#f59e0b' }}>
                          {r.vocab || '·'}
                        </td>
                        <td className="text-right py-1.5 pl-2 tabular-nums text-gray-700 font-bold">{total}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <p className="text-sm text-gray-400 text-center py-6">이 날 접속한 튜터링 유저가 없습니다.</p>
      )}
    </div>
  );
}
