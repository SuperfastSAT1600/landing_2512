'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { MARKETING_GROUPS, GROUP_COLORS } from '@/lib/marketing-groups';
import type { WeekRow, MonthRow } from './utils/groupByPeriod';

const CHANNELS = [...MARKETING_GROUPS] as const;

type Row = WeekRow | MonthRow;

interface Props {
  rows: Row[];
  unit: 'week' | 'month';
}

export default function LeadTrackingChart({ rows, unit }: Props) {
  if (rows.length === 0) {
    return <p className="text-gray-600 text-sm text-center py-8">데이터 없음</p>;
  }

  const chartData = rows.map((row) => ({
    name: unit === 'week'
      ? (row as WeekRow).label.replace(/\(.+\)/, '').trim()
      : row.label.replace('년 ', '/').replace('월', ''),
    ...Object.fromEntries(CHANNELS.map((ch) => [ch, row.channels[ch] ?? 0])),
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
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
        {CHANNELS.map((ch) => (
          <Bar key={ch} dataKey={ch} stackId="a" fill={GROUP_COLORS[ch]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
