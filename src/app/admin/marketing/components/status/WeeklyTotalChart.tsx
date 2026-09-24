'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer, Cell,
} from 'recharts';
import type { WeekRow } from './utils/groupByPeriod';

interface TooltipEntry {
  dataKey: string;
  value: number | null;
  payload?: { fullLabel?: string };
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: TooltipEntry[]; label?: string }) {
  if (!active || !payload?.length) return null;
  const totalEntry = payload.find((p) => p.dataKey === 'total');
  const fullLabel = totalEntry?.payload?.fullLabel ?? label;

  return (
    <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-lg min-w-[140px]">
      <p className="text-gray-500 text-xs mb-2">{fullLabel}</p>
      {totalEntry != null && (
        <p className="text-gray-900 font-bold text-xl leading-none">
          {totalEntry.value}<span className="text-sm font-normal text-gray-500 ml-1">명</span>
        </p>
      )}
    </div>
  );
}

interface Props {
  rows: WeekRow[];
  weeklyTarget?: number | null;
}

function shortenLabel(label: string): string {
  // "8월 2주 (7/28~8/3)" → "8/2주"
  const match = label.match(/(\d+)월 (\d+)주/);
  if (match) return `${match[1]}/${match[2]}주`;
  return label.replace(/\(.+\)/, '').trim();
}


export default function WeeklyTotalChart({ rows, weeklyTarget }: Props) {
  if (rows.length === 0) {
    return <p className="text-gray-400 text-sm text-center py-8">데이터 없음</p>;
  }

  const totals = rows.map((r) => r.total);
  const overallAvg = Math.round(totals.reduce((s, v) => s + v, 0) / totals.length);

  const chartData = rows.map((row) => ({
    name: shortenLabel(row.label),
    total: row.total,
    fullLabel: row.label,
  }));

  const maxVal = Math.max(...totals, weeklyTarget ?? 0);
  const yMax = Math.ceil((maxVal * 1.15) / 5) * 5;

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity={0.85} />
            <stop offset="100%" stopColor="#6366f1" stopOpacity={0.45} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis
          dataKey="name"
          tick={{ fill: '#6b7280', fontSize: 10 }}
          tickLine={false}
          interval={Math.max(0, Math.floor(rows.length / 12) - 1)}
        />
        <YAxis
          tick={{ fill: '#6b7280', fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          domain={[0, yMax]}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />

        {/* 전체 평균 기준선 */}
        <ReferenceLine
          y={overallAvg}
          stroke="#d1d5db"
          strokeDasharray="4 4"
          label={{ value: `평균 ${overallAvg}`, position: 'insideTopRight', fill: '#6b7280', fontSize: 10 }}
        />

        {/* 주간 목표 기준선 */}
        {weeklyTarget && weeklyTarget > 0 && (
          <ReferenceLine
            y={weeklyTarget}
            stroke="#f59e0b88"
            strokeDasharray="4 4"
            label={{ value: `목표 ${weeklyTarget}`, position: 'insideTopRight', fill: '#f59e0b', fontSize: 10 }}
          />
        )}

        <Bar dataKey="total" radius={[3, 3, 0, 0]} maxBarSize={32}>
          {chartData.map((entry, i) => {
            const isLast = i === chartData.length - 1;
            const color = isLast ? '#818cf8' : 'url(#barGrad)';
            return <Cell key={i} fill={color} />;
          })}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
