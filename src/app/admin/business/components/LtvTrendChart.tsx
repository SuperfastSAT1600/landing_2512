'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import type { MonthlyLtvPoint } from '@/app/api/business/ltv-trend/route';

interface Props {
  data: MonthlyLtvPoint[];
  currency: 'KRW' | 'USD';
}

function fmtTick(value: number, currency: 'KRW' | 'USD') {
  if (currency === 'USD') return `$${Math.round(value).toLocaleString('en-US')}`;
  if (value >= 1_0000_0000) return `${(value / 1_0000_0000).toFixed(1)}억`;
  return `${Math.round(value / 10000)}만`;
}

function fmtTooltip(value: number, currency: 'KRW' | 'USD') {
  if (currency === 'USD') return `$${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  return `${value.toLocaleString()}원`;
}

// 꺾임이 생기는 달(신규 고객 대거 유입으로 LTV 일시 하락)을 표시하기 위한 최소 표시 간격
const LABEL_INTERVAL = 3;

export default function LtvTrendChart({ data, currency }: Props) {
  if (data.length === 0) {
    return (
      <div className="h-[240px] flex items-center justify-center text-sm text-gray-300">
        데이터 없음
      </div>
    );
  }

  const ltvValues = data.map((d) => d.ltv);
  const minLtv = Math.min(...ltvValues);
  const maxLtv = Math.max(...ltvValues);
  const pad = (maxLtv - minLtv) * 0.15;
  const domainMin = Math.max(0, Math.floor((minLtv - pad) / 10000) * 10000);
  const domainMax = Math.ceil((maxLtv + pad) / 10000) * 10000;

  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 11 }}
          tickFormatter={(m: string) => m.slice(2)} // YY-MM
          tickLine={false}
          axisLine={false}
          interval={LABEL_INTERVAL - 1}
        />
        <YAxis
          domain={[domainMin, domainMax]}
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={56}
          tickFormatter={(v: number) => fmtTick(v, currency)}
        />
        <Tooltip
          formatter={(value) => [fmtTooltip(Number(value ?? 0), currency), '평균 LTV']}
          labelFormatter={(label) => `${String(label)} 기준`}
          contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
        />
        {/* 신규 고객이 유입되는 달에는 LTV가 일시 하락할 수 있다 — 전반적 우상향이 핵심 */}
        <ReferenceLine y={data[0]?.ltv ?? 0} stroke="#e5e7eb" strokeDasharray="4 4" />
        <Line
          type="monotone"
          dataKey="ltv"
          stroke="#3b82f6"
          strokeWidth={2.5}
          dot={{ r: 2.5, strokeWidth: 0, fill: '#3b82f6' }}
          activeDot={{ r: 5, strokeWidth: 0, fill: '#1d4ed8' }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
