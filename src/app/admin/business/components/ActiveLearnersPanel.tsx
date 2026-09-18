'use client';

import { useEffect, useState, useCallback } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import type { ActiveLearnerRow } from '@/app/api/admin/active-learners/route';

type SpaceKey = 'study_hall' | 'test_center' | 'vocab';
type Preset = '7d' | '14d' | '30d' | 'custom';

const PRESETS: { key: Preset; label: string; days?: number }[] = [
  { key: '7d', label: '7일', days: 7 },
  { key: '14d', label: '14일', days: 14 },
  { key: '30d', label: '30일', days: 30 },
  { key: 'custom', label: '직접입력' },
];

const SPACE_TABS: { key: SpaceKey; label: string; color: string }[] = [
  { key: 'study_hall', label: '스터디홀', color: 'bg-purple-500' },
  { key: 'test_center', label: '테스트센터', color: 'bg-blue-500' },
  { key: 'vocab', label: '단어', color: 'bg-amber-500' },
];

const HEATMAP_COLORS: Record<SpaceKey, (n: number) => string> = {
  study_hall: (n) =>
    n === 0 ? 'bg-gray-50' :
    n <= 2  ? 'bg-purple-100' :
    n <= 5  ? 'bg-purple-300' :
    n <= 9  ? 'bg-purple-500' :
              'bg-purple-700',
  test_center: (n) =>
    n === 0 ? 'bg-gray-50' :
    n <= 2  ? 'bg-blue-100' :
    n <= 5  ? 'bg-blue-300' :
    n <= 9  ? 'bg-blue-500' :
              'bg-blue-700',
  vocab: (n) =>
    n === 0 ? 'bg-gray-50' :
    n <= 2  ? 'bg-amber-100' :
    n <= 5  ? 'bg-amber-300' :
    n <= 9  ? 'bg-amber-500' :
              'bg-amber-700',
};

function getPresetRange(preset: Preset, days?: number): { from: string; to: string } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const toDate = new Date(today);
  toDate.setDate(toDate.getDate() - 1); // yesterday
  const fromDate = new Date(toDate);
  fromDate.setDate(fromDate.getDate() - ((days ?? 14) - 1));
  return {
    from: fromDate.toISOString().slice(0, 10),
    to: toDate.toISOString().slice(0, 10),
  };
}

// date → MM/DD
function fmtDate(d: string): string {
  return d.slice(5).replace('-', '/');
}

interface Props {
  adminKey: string;
}

export function ActiveLearnersPanel({ adminKey }: Props) {
  const [preset, setPreset] = useState<Preset>('14d');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [space, setSpace] = useState<SpaceKey>('study_hall');
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<ActiveLearnerRow[]>([]);
  const [error, setError] = useState('');

  const { from, to } =
    preset === 'custom'
      ? { from: customFrom, to: customTo }
      : getPresetRange(preset, PRESETS.find((p) => p.key === preset)?.days);

  const fetchData = useCallback(async () => {
    if (!from || !to || from > to) return;
    setLoading(true);
    setError('');
    try {
      const qs = new URLSearchParams({ from, to });
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
  }, [from, to, adminKey]);

  useEffect(() => {
    if (preset !== 'custom') fetchData();
  }, [preset, fetchData]);

  // ── 데이터 변환 ───────────────────────────────────────────────

  // 날짜 목록 (오름차순)
  const dates = Array.from(
    new Set(rows.filter((r) => r.space === space).map((r) => r.date))
  ).sort();

  // date+hour → users 맵
  const cell: Map<string, number> = new Map();
  for (const r of rows) {
    if (r.space !== space) continue;
    cell.set(`${r.date}|${r.hour}`, r.users);
  }

  // 오늘 대비 요약 (선택 스페이스 기준)
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayTotal = rows.filter((r) => r.space === space && r.date === todayStr)
    .reduce((s, r) => s + r.users, 0);

  // 7일 평균 일 합산
  const byDate: Record<string, number> = {};
  for (const r of rows) {
    if (r.space !== space) continue;
    byDate[r.date] = (byDate[r.date] ?? 0) + r.users;
  }
  const dailyTotals = Object.values(byDate);
  const avg7 = dailyTotals.length > 0
    ? Math.round(dailyTotals.reduce((s, n) => s + n, 0) / dailyTotals.length)
    : 0;

  const HOURS = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div>
      {/* 헤더 + 기간 선택 */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <h3 className="text-sm font-semibold text-gray-500 mr-2">튜터링 활성 학습자</h3>
        {PRESETS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setPreset(key)}
            className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors ${
              preset === key
                ? 'bg-gray-900 text-white border-gray-900'
                : 'border-gray-200 text-gray-600 hover:border-gray-400'
            }`}
          >
            {label}
          </button>
        ))}
        {preset === 'custom' && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none"
            />
            <span className="text-xs text-gray-400">~</span>
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none"
            />
            <button
              onClick={fetchData}
              disabled={!customFrom || !customTo}
              className="px-3 py-1 bg-gray-900 text-white text-xs font-medium rounded-lg disabled:opacity-40"
            >
              조회
            </button>
          </div>
        )}
        {loading && <RefreshCw size={13} className="animate-spin text-gray-400" />}
        {from && to && !loading && (
          <span className="text-xs text-gray-400">{from} ~ {to}</span>
        )}
      </div>

      {error && (
        <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600 mb-3">
          {error}
        </div>
      )}

      {/* Space 탭 */}
      <div className="flex items-center gap-1 mb-4 bg-gray-100 rounded-lg p-0.5 self-start w-fit">
        {SPACE_TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setSpace(key)}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              space === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 요약 카드 */}
      {!loading && rows.length > 0 && (
        <div className="flex gap-6 mb-4">
          <div>
            <p className="text-[10px] text-gray-400">오늘 접속 유저</p>
            <p className="text-xl font-bold text-gray-900 tabular-nums">{todayTotal}</p>
            <p className="text-[10px] text-gray-400">명</p>
          </div>
          <div>
            <p className="text-[10px] text-gray-400">일 평균 접속</p>
            <p className="text-xl font-bold text-gray-700 tabular-nums">{avg7}</p>
            <p className="text-[10px] text-gray-400">명 / 일</p>
          </div>
        </div>
      )}

      {/* 히트맵 */}
      {loading && !rows.length ? (
        <div className="flex items-center justify-center gap-2 py-8 text-sm text-gray-400">
          <Loader2 size={16} className="animate-spin" /> 불러오는 중…
        </div>
      ) : dates.length > 0 ? (
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full">
            {/* 시간 레이블 (상단) */}
            <div className="flex items-center mb-1">
              <div className="w-12 shrink-0" />
              {HOURS.map((h) => (
                <div
                  key={h}
                  className="w-6 text-center text-[9px] text-gray-400 shrink-0"
                >
                  {h % 4 === 0 ? h : ''}
                </div>
              ))}
            </div>

            {/* 날짜별 행 */}
            {dates.map((date) => {
              const rowTotal = HOURS.reduce((s, h) => s + (cell.get(`${date}|${h}`) ?? 0), 0);
              const isToday = date === todayStr;
              return (
                <div key={date} className="flex items-center gap-0 mb-0.5">
                  <div className={`w-12 shrink-0 text-[10px] tabular-nums ${isToday ? 'font-bold text-gray-800' : 'text-gray-400'}`}>
                    {fmtDate(date)}
                  </div>
                  {HOURS.map((h) => {
                    const count = cell.get(`${date}|${h}`) ?? 0;
                    const colorFn = HEATMAP_COLORS[space];
                    return (
                      <div
                        key={h}
                        className={`w-6 h-5 shrink-0 rounded-sm ${colorFn(count)} group relative cursor-default`}
                        title={`${date} ${h}시 · ${count}명`}
                      />
                    );
                  })}
                  <div className="ml-2 text-[10px] text-gray-400 tabular-nums shrink-0">
                    {rowTotal > 0 ? rowTotal : ''}
                  </div>
                </div>
              );
            })}

            {/* 범례 */}
            <div className="flex items-center gap-3 mt-3">
              <span className="text-[10px] text-gray-400">적음</span>
              {[0, 1, 3, 6, 10].map((n) => (
                <div
                  key={n}
                  className={`w-5 h-4 rounded-sm ${HEATMAP_COLORS[space](n)}`}
                  title={n === 0 ? '0명' : n === 10 ? '10명+' : `${n}명`}
                />
              ))}
              <span className="text-[10px] text-gray-400">많음</span>
            </div>
          </div>
        </div>
      ) : !loading ? (
        <p className="text-sm text-gray-400 text-center py-6">데이터가 없습니다.</p>
      ) : null}
    </div>
  );
}
