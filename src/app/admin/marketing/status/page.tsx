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
import { MARKETING_GROUPS, GROUP_COLORS } from '@/lib/marketing-groups';
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
            value === key ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
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
            ? 'bg-white/10 text-white'
            : 'text-gray-500 hover:text-gray-300 border border-white/10'
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
            style={active ? { backgroundColor: GROUP_COLORS[ch] + '33', color: GROUP_COLORS[ch], border: `1px solid ${GROUP_COLORS[ch]}55` } : { border: '1px solid rgba(255,255,255,0.08)' }}
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

  const {
    recentDaily, recentDailyLoading, adSpendByDate,
    momData, qoqData, yoyMonthData, yoyQuarterData, compareLoading,
    weekly, weeklyLoading,
  } = useMarketingStatus();

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
    <div className="min-h-screen bg-[#151719] text-[#E0E0E0] p-6 space-y-6">
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
        <div className="flex items-start justify-between flex-wrap gap-3">
          <h3 className="text-white font-semibold">채널별 리드 인입</h3>
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
              <div key={i} className="h-8 bg-white/5 rounded" />
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
