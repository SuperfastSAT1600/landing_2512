'use client';

import { useState, useMemo } from 'react';
import MarketingTabs from '../components/MarketingTabs';
import { useMarketingStatus } from '../components/status/useMarketingStatus';
import { WeekLeadTable, MonthLeadTable } from '../components/status/LeadTrackingTable';
import LeadTrackingChart from '../components/status/LeadTrackingChart';
import ComparePanel from '../components/status/ComparePanel';
import ChannelSignalCards from '../components/status/ChannelSignalCards';
import { groupByWeek, groupByMonth } from '../components/status/utils/groupByPeriod';
import { classifyChannelSignals } from '../components/status/utils/signalUtils';
import WeeklyTotalChart from '../components/status/WeeklyTotalChart';
import WeeklyAdSpendChart from '../components/status/WeeklyAdSpendChart';
import { MARKETING_GROUPS, GROUP_COLORS } from '@/lib/marketing-groups';
import type { MarketingGroup } from '@/lib/marketing-groups';

type RangePreset = '4w' | '8w' | '12w' | '24w' | 'custom';

const PRESETS: { key: RangePreset; label: string; weeks?: number }[] = [
  { key: '4w', label: '4주', weeks: 4 },
  { key: '8w', label: '8주', weeks: 8 },
  { key: '12w', label: '12주', weeks: 12 },
  { key: '24w', label: '24주', weeks: 24 },
  { key: 'custom', label: '직접 선택' },
];

function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function weeksAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n * 7);
  return fmtDate(d);
}

function today(): string {
  return fmtDate(new Date());
}

type PeriodUnit = 'week' | 'month';
type ViewMode = 'table' | 'chart';

function SectionLabel({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</span>
      <div className="flex-1 h-px bg-gray-200" />
    </div>
  );
}

function ToggleGroup<T extends string>({
  options, value, onChange,
}: {
  options: { key: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
      {options.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${
            value === key ? 'bg-blue-600 text-white' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function ChannelFilter({
  selected,
  onChange,
}: {
  selected: MarketingGroup[];
  onChange: (channels: MarketingGroup[]) => void;
}) {
  const allSelected = selected.length === MARKETING_GROUPS.length;

  function toggle(ch: MarketingGroup) {
    if (selected.includes(ch)) {
      // 마지막 하나는 해제 불가
      if (selected.length === 1) return;
      onChange(selected.filter((c) => c !== ch));
    } else {
      onChange([...selected, ch]);
    }
  }

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <button
        onClick={() => onChange([...MARKETING_GROUPS])}
        className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors ${
          allSelected
            ? 'bg-gray-200 text-gray-900'
            : 'text-gray-500 hover:text-gray-700 border border-gray-200'
        }`}
      >
        전체
      </button>
      {MARKETING_GROUPS.map((ch) => {
        const active = selected.includes(ch);
        return (
          <button
            key={ch}
            onClick={() => toggle(ch)}
            className={`text-xs px-2.5 py-1 rounded-md font-medium transition-all ${
              active ? 'text-white' : 'text-gray-600 hover:text-gray-400'
            }`}
            style={active ? { backgroundColor: GROUP_COLORS[ch] + '33', color: GROUP_COLORS[ch], border: `1px solid ${GROUP_COLORS[ch]}55` } : { border: '1px solid #e5e7eb' }}
          >
            {ch}
          </button>
        );
      })}
    </div>
  );
}

export default function MarketingStatusPage() {
  const [unit, setUnit] = useState<PeriodUnit>('week');
  const [view, setView] = useState<ViewMode>('table');
  const [selectedChannels, setSelectedChannels] = useState<MarketingGroup[]>([...MARKETING_GROUPS]);

  const [rangePreset, setRangePreset] = useState<RangePreset>('12w');
  const [customFrom, setCustomFrom] = useState(() => weeksAgo(12));
  const [customTo, setCustomTo] = useState(() => today());

  const trackingRange = useMemo(() => {
    if (rangePreset === 'custom') return { from: customFrom, to: customTo };
    const preset = PRESETS.find((p) => p.key === rangePreset);
    return preset?.weeks ? { from: weeksAgo(preset.weeks), to: today() } : undefined;
  }, [rangePreset, customFrom, customTo]);

  const {
    recentDaily, recentDailyLoading, adSpendByDate,
    momData, qoqData, yoyMonthData, yoyQuarterData, compareLoading,
    weekly, weeklyLoading,
  } = useMarketingStatus(trackingRange);

  const weekRows = useMemo(() => groupByWeek(recentDaily, adSpendByDate), [recentDaily, adSpendByDate]);
  const monthRows = useMemo(() => groupByMonth(recentDaily, adSpendByDate), [recentDaily, adSpendByDate]);

  const signals = useMemo(() => {
    if (!weekly) return [];
    const recentWeeks = weekRows.slice(-3);
    const weeklyActual = weekly.this_week as Record<string, number>;
    const actual = Object.fromEntries(
      [...MARKETING_GROUPS, '미분류' as const].map((ch) => [ch, weeklyActual[ch] ?? 0])
    ) as Record<MarketingGroup, number>;
    return classifyChannelSignals(recentWeeks, weekly.weekly_target, actual);
  }, [weekRows, weekly]);

  const displayedRows = unit === 'week' ? weekRows : monthRows;

  return (
    <div className="min-h-screen bg-white text-gray-800 p-6 space-y-6">
      <div className="flex flex-col gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">마케팅 현황</h1>
          <p className="text-sm text-gray-500 mt-0.5">채널별 리드 인입 추이 · 기간 비교 · 시그널 감지</p>
        </div>
        <MarketingTabs active="/admin/marketing/status" />
        {/* 전역 기간 선택 */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-500 mr-1">조회 기간</span>
          {PRESETS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setRangePreset(key)}
              className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors border ${
                rangePreset === key
                  ? 'bg-blue-600 border-blue-500 text-white'
                  : 'border-gray-200 text-gray-500 hover:text-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
          {rangePreset === 'custom' && (
            <>
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="text-xs bg-white border border-gray-200 rounded-md px-2 py-1 text-gray-700"
              />
              <span className="text-gray-400 text-xs">~</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="text-xs bg-white border border-gray-200 rounded-md px-2 py-1 text-gray-700"
              />
            </>
          )}
        </div>
      </div>

      {/* ── Part C: 채널 시그널 ── */}
      <SectionLabel label="채널 시그널" />
      <ChannelSignalCards signals={signals} loading={weeklyLoading} />

      {/* ── Part D: 주별 전체 리드 그래프 ── */}
      <SectionLabel label="주별 전체 리드" />
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="text-gray-900 font-semibold">주별 전체 리드 추이</h3>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded-sm bg-indigo-500/70" />전체 리드
            </span>
            {weekly?.weekly_target && (
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-5 h-0.5 bg-amber-400/70 border-dashed border-t border-amber-400" />목표
              </span>
            )}
          </div>
        </div>
        {recentDailyLoading ? (
          <div className="h-[240px] bg-gray-100 rounded animate-pulse" />
        ) : (
          <WeeklyTotalChart rows={weekRows} weeklyTarget={weekly?.weekly_target ?? null} />
        )}
      </div>

      {/* ── Part E: 주별 광고비 그래프 ── */}
      <SectionLabel label="주별 광고비" />
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="text-gray-900 font-semibold">주별 광고비 추이</h3>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded-sm bg-amber-400/70" />광고비
            </span>
          </div>
        </div>
        {recentDailyLoading ? (
          <div className="h-[240px] bg-gray-100 rounded animate-pulse" />
        ) : (
          <WeeklyAdSpendChart rows={weekRows} />
        )}
      </div>

      {/* ── Part A: 인입 트래킹 ── */}
      <SectionLabel label="인입 현황" />
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <h3 className="text-gray-900 font-semibold">채널별 리드 인입</h3>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2 flex-wrap justify-end">
              <ToggleGroup
                options={[{ key: 'week' as const, label: '주 단위' }, { key: 'month' as const, label: '월 단위' }]}
                value={unit}
                onChange={setUnit}
              />
              <ToggleGroup
                options={[{ key: 'table' as const, label: '표로 보기' }, { key: 'chart' as const, label: '그래프로 보기' }]}
                value={view}
                onChange={setView}
              />
            </div>
            <ChannelFilter selected={selectedChannels} onChange={setSelectedChannels} />
          </div>
        </div>

        {recentDailyLoading ? (
          <div className="space-y-2 animate-pulse">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-8 bg-gray-100 rounded" />
            ))}
          </div>
        ) : view === 'table' ? (
          unit === 'week'
            ? <WeekLeadTable rows={weekRows} selectedChannels={selectedChannels} />
            : <MonthLeadTable rows={monthRows} selectedChannels={selectedChannels} />
        ) : (
          <LeadTrackingChart rows={displayedRows} unit={unit} selectedChannels={selectedChannels} />
        )}
      </div>

      {/* ── Part B: 비교 분석 ── */}
      <SectionLabel label="비교 분석" />
      <ComparePanel
        momData={momData}
        qoqData={qoqData}
        yoyMonthData={yoyMonthData}
        yoyQuarterData={yoyQuarterData}
        loading={compareLoading}
      />
    </div>
  );
}
