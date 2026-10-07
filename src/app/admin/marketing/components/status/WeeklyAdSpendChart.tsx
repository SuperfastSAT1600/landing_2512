'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import type { WeekRow } from './utils/groupByPeriod';

interface TooltipEntry {
  dataKey: string;
  value: number | null;
  payload?: { fullLabel?: string; spend?: number };
}

function fmtWon(amount: number): string {
  if (amount >= 10000) {
    const man = amount / 10000;
    return man % 1 === 0 ? `${man.toLocaleString()}만원` : `${man.toFixed(1)}만원`;
  }
  return `${amount.toLocaleString()}원`;
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: TooltipEntry[]; label?: string }) {
  if (!active || !payload?.length) return null;
  const entry = payload.find((p) => p.dataKey === 'spend');
  const fullLabel = entry?.payload?.fullLabel ?? label;
  const spend = entry?.payload?.spend ?? 0;

  return (
    <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-lg min-w-[160px]">
      <p className="text-gray-500 text-xs mb-2">{fullLabel}</p>
      {spend > 0 ? (
        <p className="text-gray-900 font-bold text-xl leading-none">
          {fmtWon(spend)}
        </p>
      ) : (
        <p className="text-gray-400 text-sm">광고비 없음</p>
      )}
    </div>
  );
}

interface Props {
  rows: WeekRow[];
}

function shortenLabel(label: string): string {
  const match = label.match(/(\d+)월 (\d+)주/);
  if (match) return `${match[1]}/${match[2]}주`;
  return label.replace(/\(.+\)/, '').trim();
}

export default function WeeklyAdSpendChart({ rows }: Props) {
  if (rows.length === 0) {
    return <p className="text-gray-400 text-sm text-center py-8">데이터 없음</p>;
  }

  const hasAnySpend = rows.some((r) => r.spend > 0);
  if (!hasAnySpend) {
    return <p className="text-gray-400 text-sm text-center py-8">광고비 데이터 없음</p>;
  }

  const chartData = rows.map((row) => ({
    name: shortenLabel(row.label),
    spend: row.spend,
    fullLabel: row.label,
  }));

  const maxSpend = Math.max(...rows.map((r) => r.spend));
  const yMax = Math.ceil((maxSpend * 1.15) / 10000) * 10000;

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={chartData} margin={{ top: 8, right: 8, left: 10, bottom: 0 }}>
        <defs>
          <linearGradient id="spendBarGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.85} />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.45} />
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
          tickFormatter={(v) => v >= 10000 ? `${(v / 10000).toFixed(0)}만` : String(v)}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
        <Bar dataKey="spend" radius={[3, 3, 0, 0]} maxBarSize={32}>
          {chartData.map((entry, i) => {
            const isLast = i === chartData.length - 1;
            const isEmpty = entry.spend === 0;
            const color = isEmpty ? '#e5e7eb' : isLast ? '#fbbf24' : 'url(#spendBarGrad)';
            return <Cell key={i} fill={color} />;
          })}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
