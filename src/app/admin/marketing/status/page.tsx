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
import { MARKETING_GROUPS } from '@/lib/marketing-groups';
import type { MarketingGroup } from '@/lib/marketing-groups';

type PeriodUnit = 'week' | 'month';
type ViewMode = 'table' | 'chart';

function SectionLabel({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</span>
      <div className="flex-1 h-px bg-white/5" />
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
    <div className="flex items-center gap-1 bg-[#151719] rounded-lg p-1">
      {options.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${
            value === key
              ? 'bg-blue-600 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export default function MarketingStatusPage() {
  const [unit, setUnit] = useState<PeriodUnit>('week');
  const [view, setView] = useState<ViewMode>('table');

  const {
    recentDaily, recentDailyLoading,
    momData, qoqData, yoyMonthData, yoyQuarterData, compareLoading,
    weekly, weeklyLoading,
  } = useMarketingStatus();

  const weekRows = useMemo(() => groupByWeek(recentDaily), [recentDaily]);
  const monthRows = useMemo(() => groupByMonth(recentDaily), [recentDaily]);

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
    <div className="min-h-screen bg-[#151719] text-[#E0E0E0] p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">마케팅 현황</h1>
          <p className="text-sm text-gray-500 mt-0.5">채널별 리드 인입 추이 · 기간 비교 · 시그널 감지</p>
        </div>
        <MarketingTabs active="/admin/marketing/status" />
      </div>

      {/* ── Part C: 채널 시그널 ── */}
      <SectionLabel label="채널 시그널" />
      <ChannelSignalCards signals={signals} loading={weeklyLoading} />

      {/* ── Part A: 인입 트래킹 ── */}
      <SectionLabel label="인입 현황" />
      <div className="bg-[#1e2023] border border-white/5 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h3 className="text-white font-semibold">채널별 리드 인입</h3>
          <div className="flex items-center gap-2 flex-wrap">
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
        </div>

        {recentDailyLoading ? (
          <div className="space-y-2 animate-pulse">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-8 bg-white/5 rounded" />
            ))}
          </div>
        ) : view === 'table' ? (
          unit === 'week'
            ? <WeekLeadTable rows={weekRows} />
            : <MonthLeadTable rows={monthRows} />
        ) : (
          <LeadTrackingChart rows={displayedRows} unit={unit} />
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
