'use client';

import { useEffect, useState, useCallback } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import {
  type Preset,
  getPresetRange,
  PRESETS,
} from '../../crm/components/stats-primitives';
import type { OutcomeSummary } from '@/app/api/crm/renewal-targets/outcomes/route';

interface Props {
  adminKey: string;
}

function pct(num: number, denom: number): string {
  if (denom === 0) return '-';
  return `${Math.round((num / denom) * 100)}%`;
}

interface StatRow {
  label: string;
  total: number;
  good: number;
  bad: number;
  unclassified: number;
  goodColor: string;
  badColor: string;
}

function OutcomeRow({ label, total, good, bad, unclassified, goodColor, badColor }: StatRow) {
  const classified = good + bad;
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-semibold text-gray-900 tabular-nums">{total}</span>
        <span className="text-xs text-gray-400">명</span>
      </div>
      <div className="flex items-center gap-3 text-xs">
        <span className={`font-medium ${goodColor}`}>
          좋음 {good}명 <span className="font-normal text-gray-400">({pct(good, classified)})</span>
        </span>
        <span className="text-gray-200">|</span>
        <span className={`font-medium ${badColor}`}>
          나쁨 {bad}명 <span className="font-normal text-gray-400">({pct(bad, classified)})</span>
        </span>
        {unclassified > 0 && (
          <>
            <span className="text-gray-200">|</span>
            <span className="text-gray-400">미분류 {unclassified}명</span>
          </>
        )}
      </div>
      {classified > 0 && (
        <div className="flex h-1.5 rounded-full overflow-hidden bg-gray-100 w-full max-w-[240px]">
          <div
            className="bg-emerald-400 transition-all"
            style={{ width: `${Math.round((good / classified) * 100)}%` }}
          />
          <div
            className="bg-red-300 transition-all"
            style={{ width: `${Math.round((bad / classified) * 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}

export function OutcomeQualityPanel({ adminKey }: Props) {
  const [preset, setPreset] = useState<Preset>('last_6m');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<OutcomeSummary | null>(null);
  const [error, setError] = useState('');

  const { from, to } =
    preset === 'custom' ? { from: customFrom, to: customTo } : getPresetRange(preset);

  const fetchOutcomes = useCallback(async () => {
    if (!from || !to || from > to) return;
    setLoading(true);
    setError('');
    try {
      const qs = new URLSearchParams({ from, to });
      const res = await fetch(`/api/crm/renewal-targets/outcomes?${qs}`, {
        headers: { 'x-admin-key': adminKey },
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error?.message ?? '조회 실패');
        return;
      }
      setData(json.data as OutcomeSummary);
    } catch {
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [from, to, adminKey]);

  useEffect(() => {
    if (preset !== 'custom') fetchOutcomes();
  }, [preset, fetchOutcomes]);

  const totalGood = (data?.good_completed ?? 0) + (data?.good_dropped ?? 0);
  const totalBad = (data?.bad_completed ?? 0) + (data?.bad_dropped ?? 0);
  const totalClassified = totalGood + totalBad;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <h3 className="text-sm font-semibold text-gray-500 mr-2">고객 성과 현황</h3>
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
              onClick={fetchOutcomes}
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

      {loading && !data ? (
        <div className="flex items-center justify-center gap-2 py-8 text-sm text-gray-400">
          <Loader2 size={16} className="animate-spin" /> 불러오는 중…
        </div>
      ) : data ? (
        <div className="space-y-5">
          {/* 전체 좋은 결말 요약 */}
          <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl">
            <div>
              <p className="text-xs text-gray-400 mb-0.5">전체 좋은 결말</p>
              <p className="text-2xl font-bold text-emerald-600 tabular-nums">
                {pct(totalGood, totalClassified)}
              </p>
              <p className="text-[11px] text-gray-400 mt-0.5">
                {totalGood}명 / 분류 완료 {totalClassified}명
              </p>
            </div>
            {totalClassified > 0 && (
              <div className="flex-1 max-w-[200px]">
                <div className="flex h-2 rounded-full overflow-hidden bg-gray-200">
                  <div
                    className="bg-emerald-400 transition-all"
                    style={{ width: `${Math.round((totalGood / totalClassified) * 100)}%` }}
                  />
                  <div
                    className="bg-red-300 transition-all"
                    style={{ width: `${Math.round((totalBad / totalClassified) * 100)}%` }}
                  />
                </div>
                <p className="text-[10px] text-gray-400 mt-1">
                  좋음 {totalGood} · 나쁨 {totalBad}
                </p>
              </div>
            )}
          </div>

          {/* 결제 완료 / 미전환 나란히 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <OutcomeRow
              label="결제 완료"
              total={(data.good_completed) + (data.bad_completed) + (data.unclassified_completed)}
              good={data.good_completed}
              bad={data.bad_completed}
              unclassified={data.unclassified_completed}
              goodColor="text-emerald-600"
              badColor="text-orange-500"
            />
            <OutcomeRow
              label="미전환 (이탈)"
              total={(data.good_dropped) + (data.bad_dropped) + (data.unclassified_dropped)}
              good={data.good_dropped}
              bad={data.bad_dropped}
              unclassified={data.unclassified_dropped}
              goodColor="text-blue-600"
              badColor="text-red-500"
            />
          </div>

          <p className="text-[11px] text-gray-400">
            결제완료 좋음 = 성적 향상·수업 만족·먼저 연장 등 · 미전환 좋음 = 목표 점수 달성·계획된 종료 등
          </p>
        </div>
      ) : (
        <p className="text-sm text-gray-400 text-center py-6">데이터가 없습니다.</p>
      )}
    </div>
  );
}
