'use client';

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { TrendPoint } from '../fixtures/learning';

// 실제 CRM의 SrmTrendChart와 같은 시각 규격. 시리즈 라벨만 영문이라 별도 컴포넌트로 둔다.
export function AssessmentTrend({ data }: { data: TrendPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={150}>
      <LineChart data={data} margin={{ top: 8, right: 10, left: -18, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
        <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
        <YAxis
          domain={[70, 95]}
          ticks={[70, 80, 90]}
          tick={{ fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          width={28}
          tickFormatter={(v: number) => `${v}`}
        />
        <Tooltip
          formatter={(value) => [`${value}%`, 'Score']}
          contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e5e7eb', padding: '4px 8px' }}
        />
        <Line
          type="monotone"
          dataKey="score"
          stroke="#f59e0b"
          strokeWidth={2.5}
          dot={{ r: 3, strokeWidth: 0, fill: '#f59e0b' }}
          activeDot={{ r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
