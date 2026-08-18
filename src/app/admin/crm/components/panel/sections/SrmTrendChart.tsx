'use client';

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts';

export interface TrendPoint {
  date: string;   // "MM.DD" 라벨
  연습?: number | null; // 스터디홀 정답률 %
  실전?: number | null; // 테스트센터 정답률 %
}

// 연습(스터디홀) vs 실전(테스트센터) 정답률 추이 — recharts 지연 로딩 청크.
export default function SrmTrendChart({ data }: { data: TrendPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={160}>
      <LineChart data={data} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
        <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
        <YAxis domain={[0, 100]} ticks={[0, 50, 100]} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={28} tickFormatter={(v: number) => `${v}%`} />
        <Tooltip formatter={(value) => `${value}%`} contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e5e7eb', padding: '4px 8px' }} />
        <Legend wrapperStyle={{ fontSize: 11 }} iconType="plainline" />
        <Line type="monotone" dataKey="연습" stroke="#93c5fd" strokeWidth={2} dot={{ r: 2, strokeWidth: 0, fill: '#93c5fd' }} connectNulls />
        <Line type="monotone" dataKey="실전" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 3, strokeWidth: 0, fill: '#f59e0b' }} activeDot={{ r: 4 }} connectNulls />
      </LineChart>
    </ResponsiveContainer>
  );
}
