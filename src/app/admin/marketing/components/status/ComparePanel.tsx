'use client';

import { useState } from 'react';
import { MARKETING_GROUPS, GROUP_COLORS } from '@/lib/marketing-groups';
import type { MarketingGroup } from '@/lib/marketing-groups';
import type { MarketingGroupStats } from '@/types/marketing';
import type { CompareData } from './useMarketingStatus';
import { calcDeltaRate } from './utils/compareUtils';

const CHANNELS: MarketingGroup[] = [...MARKETING_GROUPS];

type CompareMode = 'mom' | 'qoq' | 'yoy_month' | 'yoy_quarter';

const MODES: { key: CompareMode; label: string }[] = [
  { key: 'mom', label: '월별 비교' },
  { key: 'qoq', label: '분기 비교' },
  { key: 'yoy_month', label: '전년 동월' },
  { key: 'yoy_quarter', label: '전년 동분기' },
];

function getLeads(groups: MarketingGroupStats[], channel: MarketingGroup): number {
  return groups.find((g) => g.group === channel)?.leads ?? 0;
}

function DeltaCell({ current, previous }: { current: number; previous: number }) {
  const rate = calcDeltaRate(current, previous);
  const delta = current - previous;
  if (rate === null) return <td className="text-right py-2.5 px-3 text-gray-600 text-xs">—</td>;
  const color = delta > 0 ? 'text-emerald-400' : delta < 0 ? 'text-red-400' : 'text-gray-500';
  return (
    <td className={`text-right py-2.5 px-3 text-xs font-medium ${color}`}>
      {delta > 0 ? '▲' : delta < 0 ? '▼' : ''}{Math.abs(rate).toFixed(1)}%
    </td>
  );
}

interface TableProps {
  data: CompareData;
}

function CompareTable({ data }: TableProps) {
  const totalCurrent = data.currentGroups.reduce((s, g) => s + g.leads, 0);
  const totalPrevious = data.previousGroups.reduce((s, g) => s + g.leads, 0);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/5">
            <th className="text-left py-2.5 pr-4 text-xs text-gray-500 font-medium">채널</th>
            <th className="text-right py-2.5 px-3 text-xs text-gray-400 font-medium">{data.previousLabel}</th>
            <th className="text-right py-2.5 px-3 text-xs text-gray-400 font-medium">{data.currentLabel}</th>
            <th className="text-right py-2.5 pl-3 text-xs text-gray-500 font-medium">증감</th>
          </tr>
        </thead>
        <tbody>
          {CHANNELS.map((ch) => {
            const cur = getLeads(data.currentGroups, ch);
            const prev = getLeads(data.previousGroups, ch);
            return (
              <tr key={ch} className="border-b border-white/5 last:border-0">
                <td className="py-2.5 pr-4">
                  <span className="text-xs font-medium" style={{ color: GROUP_COLORS[ch] }}>{ch}</span>
                </td>
                <td className="text-right py-2.5 px-3 text-gray-400">{prev}</td>
                <td className="text-right py-2.5 px-3 text-white font-semibold">{cur}</td>
                <DeltaCell current={cur} previous={prev} />
              </tr>
            );
          })}
          <tr className="border-t border-white/10">
            <td className="py-2.5 pr-4 text-gray-400 text-xs font-semibold">합계</td>
            <td className="text-right py-2.5 px-3 text-gray-300 font-semibold">{totalPrevious}</td>
            <td className="text-right py-2.5 px-3 text-white font-bold">{totalCurrent}</td>
            <DeltaCell current={totalCurrent} previous={totalPrevious} />
          </tr>
        </tbody>
      </table>
    </div>
  );
}

interface Props {
  momData: CompareData | null;
  qoqData: CompareData | null;
  yoyMonthData: CompareData | null;
  yoyQuarterData: CompareData | null;
  loading: boolean;
}

export default function ComparePanel({ momData, qoqData, yoyMonthData, yoyQuarterData, loading }: Props) {
  const [mode, setMode] = useState<CompareMode>('mom');

  const dataMap: Record<CompareMode, CompareData | null> = {
    mom: momData,
    qoq: qoqData,
    yoy_month: yoyMonthData,
    yoy_quarter: yoyQuarterData,
  };

  const current = dataMap[mode];

  return (
    <div className="bg-[#1e2023] border border-white/5 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-white font-semibold">비교 분석</h3>
        <div className="flex gap-1.5 flex-wrap">
          {MODES.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setMode(key)}
              className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${
                mode === key
                  ? 'bg-blue-600 text-white'
                  : 'bg-[#151719] text-gray-400 hover:text-white hover:bg-white/10'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-2 animate-pulse">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-8 bg-white/5 rounded" />
          ))}
        </div>
      ) : current ? (
        <CompareTable data={current} />
      ) : (
        <p className="text-gray-600 text-sm text-center py-6">데이터 없음</p>
      )}
    </div>
  );
}
