'use client';

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts';

export interface ScorePoint {
  date: string; // "MM.DD" 라벨
  Total: number | null;
  RW: number | null;
  Math: number | null;
}

// 회차별 예상 점수 추이(Total은 RW·Math 모두 응시한 회차만). RW/Math는 왼쪽(200~800), Total은 오른쪽(400~1600) 축 — recharts 지연 로딩 청크.
export default function TestCenterScoreChart({ data }: { data: ScorePoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 6, right: 4, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
        <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
        <YAxis yAxisId="section" domain={[200, 800]} ticks={[200, 400, 600, 800]} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={34} />
        <YAxis yAxisId="total" orientation="right" domain={[400, 1600]} ticks={[400, 800, 1200, 1600]} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={38} />
        <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e5e7eb', padding: '4px 8px' }} />
        <Legend wrapperStyle={{ fontSize: 11 }} iconType="plainline" />
        <Line yAxisId="section" type="monotone" dataKey="RW" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3, strokeWidth: 0, fill: '#3b82f6' }} connectNulls />
        <Line yAxisId="section" type="monotone" dataKey="Math" stroke="#10b981" strokeWidth={2} dot={{ r: 3, strokeWidth: 0, fill: '#10b981' }} connectNulls />
        <Line yAxisId="total" type="monotone" dataKey="Total" stroke="#7c3aed" strokeWidth={2.5} dot={{ r: 3.5, strokeWidth: 0, fill: '#7c3aed' }} activeDot={{ r: 5 }} connectNulls />
      </LineChart>
    </ResponsiveContainer>
  );
}
