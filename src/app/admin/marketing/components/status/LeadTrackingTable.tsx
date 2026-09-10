'use client';

import type { WeekRow, MonthRow } from './utils/groupByPeriod';
import { MARKETING_GROUPS, GROUP_COLORS } from '@/lib/marketing-groups';
import type { MarketingGroup } from '@/lib/marketing-groups';

const CHANNELS: MarketingGroup[] = [...MARKETING_GROUPS];

function DeltaBadge({ rate }: { rate: number | null }) {
  if (rate === null) return <span className="text-gray-600 text-xs">—</span>;
  const isUp = rate > 0;
  const color = isUp ? 'text-emerald-400' : rate < 0 ? 'text-red-400' : 'text-gray-500';
  return (
    <span className={`text-xs font-medium ${color}`}>
      {isUp ? '▲' : rate < 0 ? '▼' : ''}
      {Math.abs(rate).toFixed(1)}%
    </span>
  );
}

interface WeekTableProps {
  rows: WeekRow[];
}

export function WeekLeadTable({ rows }: WeekTableProps) {
  if (rows.length === 0) {
    return <p className="text-gray-600 text-sm text-center py-8">데이터 없음</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/5">
            <th className="text-left py-2.5 pr-4 text-xs text-gray-500 font-medium whitespace-nowrap">주차</th>
            {CHANNELS.map((ch) => (
              <th key={ch} className="text-right py-2.5 px-3 text-xs font-medium whitespace-nowrap"
                style={{ color: GROUP_COLORS[ch] }}>{ch}</th>
            ))}
            <th className="text-right py-2.5 pl-3 text-xs text-gray-400 font-medium">합계</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <>
              <tr key={`${row.key}-count`} className="border-b border-white/5">
                <td className="py-2 pr-4 text-gray-300 text-xs whitespace-nowrap">{row.label}</td>
                {CHANNELS.map((ch) => (
                  <td key={ch} className="text-right py-2 px-3 text-white font-medium">
                    {row.channels[ch] ?? 0}
                  </td>
                ))}
                <td className="text-right py-2 pl-3 text-gray-300 font-semibold">{row.total}</td>
              </tr>
              <tr key={`${row.key}-mix`} className="border-b border-white/10">
                <td className="pb-2 pr-4 text-gray-600 text-xs">비중</td>
                {CHANNELS.map((ch) => (
                  <td key={ch} className="text-right pb-2 px-3 text-gray-500 text-xs">
                    {(row.mix[ch] ?? 0)}%
                  </td>
                ))}
                <td className="text-right pb-2 pl-3 text-gray-500 text-xs">100%</td>
              </tr>
            </>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface MonthTableProps {
  rows: MonthRow[];
}

export function MonthLeadTable({ rows }: MonthTableProps) {
  if (rows.length === 0) {
    return <p className="text-gray-600 text-sm text-center py-8">데이터 없음</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/5">
            <th className="text-left py-2.5 pr-4 text-xs text-gray-500 font-medium">월</th>
            {CHANNELS.map((ch) => (
              <th key={ch} className="text-right py-2.5 px-3 text-xs font-medium whitespace-nowrap"
                style={{ color: GROUP_COLORS[ch] }}>{ch}</th>
            ))}
            <th className="text-right py-2.5 pl-3 text-xs text-gray-400 font-medium">합계</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <>
              <tr key={`${row.key}-count`} className="border-b border-white/5">
                <td className="py-2 pr-4 text-gray-300 text-xs whitespace-nowrap">{row.label}</td>
                {CHANNELS.map((ch) => (
                  <td key={ch} className="text-right py-2 px-3 text-white font-medium">
                    {row.channels[ch] ?? 0}
                  </td>
                ))}
                <td className="text-right py-2 pl-3 text-gray-300 font-semibold">{row.total}</td>
              </tr>
              <tr key={`${row.key}-mix`} className="border-b border-white/10">
                <td className="pb-2 pr-4 text-gray-600 text-xs">비중</td>
                {CHANNELS.map((ch) => (
                  <td key={ch} className="text-right pb-2 px-3 text-gray-500 text-xs">
                    {(row.mix[ch] ?? 0)}%
                  </td>
                ))}
                <td className="text-right pb-2 pl-3 text-gray-500 text-xs">100%</td>
              </tr>
            </>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export { DeltaBadge };
