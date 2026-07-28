'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export interface StrategyChartRow {
  name: string;
  전환율: number;
  배정: number;
}

// 전략별 비교 막대 차트 — recharts 지연 로딩 청크 분리용 전용 컴포넌트(렌더링만, 수치 불변).
export default function StrategyCompareChart({ data }: { data: StrategyChartRow[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
        <YAxis yAxisId="l" tick={{ fontSize: 11 }} />
        <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 11 }} />
        <Tooltip />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar yAxisId="r" dataKey="배정" fill="#d1d5db" radius={[3, 3, 0, 0]} />
        <Bar yAxisId="l" dataKey="전환율" fill="#2563eb" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
