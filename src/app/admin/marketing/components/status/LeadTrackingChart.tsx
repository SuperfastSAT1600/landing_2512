'use client';

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { MARKETING_GROUPS, GROUP_COLORS } from '@/lib/marketing-groups';
import type { MarketingGroup } from '@/lib/marketing-groups';
import type { WeekRow, MonthRow } from './utils/groupByPeriod';

const ALL_CHANNELS = [...MARKETING_GROUPS] as const;

type Row = WeekRow | MonthRow;

interface Props {
  rows: Row[];
  unit: 'week' | 'month';
  selectedChannels: MarketingGroup[];
}

export default function LeadTrackingChart({ rows, unit, selectedChannels }: Props) {
  if (rows.length === 0) {
    return <p className="text-gray-600 text-sm text-center py-8">데이터 없음</p>;
  }

  const visible = ALL_CHANNELS.filter((ch) => selectedChannels.includes(ch));

  const chartData = rows.map((row) => ({
    name: unit === 'week'
      ? (row as WeekRow).label.replace(/\d{4}년 /, '').replace(/\(.+\)/, '').trim()
      : row.label.replace('년 ', '/').replace('월', ''),
    ...Object.fromEntries(ALL_CHANNELS.map((ch) => [ch, row.channels[ch] ?? 0])),
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={chartData} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
        <defs>
          {visible.map((ch) => (
            <linearGradient key={ch} id={`grad-${ch}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={GROUP_COLORS[ch]} stopOpacity={0.25} />
              <stop offset="95%" stopColor={GROUP_COLORS[ch]} stopOpacity={0.03} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
        <XAxis
          dataKey="name"
          tick={{ fill: '#6b7280', fontSize: 10 }}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={{ background: '#1e2023', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
          labelStyle={{ color: '#e0e0e0', fontSize: 12 }}
          itemStyle={{ fontSize: 11 }}
        />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: '#9ca3af' }} />
        {visible.map((ch) => (
          <Area
            key={ch}
            type="monotone"
            dataKey={ch}
            stroke={GROUP_COLORS[ch]}
            strokeWidth={2}
            fill={`url(#grad-${ch})`}
            dot={{ r: 2.5, fill: GROUP_COLORS[ch], strokeWidth: 0 }}
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}
