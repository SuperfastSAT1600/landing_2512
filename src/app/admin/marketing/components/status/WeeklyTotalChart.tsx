'use client';

import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer, Cell,
} from 'recharts';
import type { WeekRow } from './utils/groupByPeriod';

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

// 8주 단순이동평균
function movingAvg(data: number[], window = 8): (number | null)[] {
  return data.map((_, i) => {
    if (i < window - 1) return null;
    const slice = data.slice(i - window + 1, i + 1);
    return Math.round(slice.reduce((s, v) => s + v, 0) / window);
  });
}

export default function WeeklyTotalChart({ rows, weeklyTarget }: Props) {
  if (rows.length === 0) {
    return <p className="text-gray-600 text-sm text-center py-8">데이터 없음</p>;
  }

  const totals = rows.map((r) => r.total);
  const avg8 = movingAvg(totals, Math.min(8, rows.length));
  const overallAvg = Math.round(totals.reduce((s, v) => s + v, 0) / totals.length);

  const chartData = rows.map((row, i) => ({
    name: shortenLabel(row.label),
    total: row.total,
    ma8: avg8[i],
    fullLabel: row.label,
  }));

  const maxVal = Math.max(...totals, weeklyTarget ?? 0);
  const yMax = Math.ceil((maxVal * 1.15) / 5) * 5;

  return (
    <ResponsiveContainer width="100%" height={240}>
      <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity={0.85} />
            <stop offset="100%" stopColor="#6366f1" stopOpacity={0.45} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
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
        <Tooltip
          contentStyle={{
            background: '#1e2023',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8,
            fontSize: 12,
          }}
          labelStyle={{ color: '#e0e0e0', fontSize: 12, marginBottom: 4 }}
          formatter={(value: unknown, name: unknown) => {
            const v = value as number;
            const n = name as string;
            if (n === 'total') return [`${v}명`, '전체 리드'];
            if (n === 'ma8') return v != null ? [`${v}명`, '8주 이동평균'] : [``, ''];
            return [`${v}`, `${n}`];
          }}
          labelFormatter={(_label, payload) => payload?.[0]?.payload?.fullLabel ?? _label}
        />

        {/* 전체 평균 기준선 */}
        <ReferenceLine
          y={overallAvg}
          stroke="#ffffff22"
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

        <Line
          type="monotone"
          dataKey="ma8"
          stroke="#34d399"
          strokeWidth={1.5}
          dot={false}
          activeDot={{ r: 3, strokeWidth: 0 }}
          connectNulls={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
