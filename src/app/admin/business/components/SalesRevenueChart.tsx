'use client';

import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { StatsMonthly } from '@/lib/crm-stats-service';

// 축 하단에 반올림 여유가 넉넉히 붙는 recharts 기본 domain 대신, 실제 데이터 범위에 소폭
// 패딩만 줘서 월별 등락의 상대적 진폭이 더 크게 보이도록 한다.
const revenueDomain: [(min: number) => number, (max: number) => number] = [
  (min) => Math.floor((min - Math.abs(min) * 0.1) / 1e6) * 1e6,
  (max) => Math.ceil((max + Math.abs(max) * 0.08) / 1e6) * 1e6,
];

// 월별 매출 트렌드 차트 — recharts를 지연 로딩 청크로 분리하기 위한 전용 컴포넌트.
// 데이터 계산은 부모(SalesStats)가 담당하고, 여기서는 렌더링만 한다(JSX·수치 불변).
export default function SalesRevenueChart({
  data,
  formatWon,
}: {
  data: StatsMonthly[];
  formatWon: (n: number) => string;
}) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <ComposedChart data={data} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
        <XAxis dataKey="month" tick={{ fontSize: 11 }} tickFormatter={(m: string) => m.slice(2)} tickLine={false} axisLine={false} />
        <YAxis domain={revenueDomain} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={52}
          tickFormatter={(v: number) => (Math.abs(v) >= 1e8 ? `${(v / 1e8).toFixed(1)}억` : `${Math.round(v / 1e4)}만`)} />
        <Tooltip formatter={(value) => formatWon(Number(value))} contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }} />
        <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
        <Bar dataKey="refund" name="환불" fill="#fca5a5" radius={[3, 3, 0, 0]} maxBarSize={22} />
        <Line type="monotone" dataKey="gross_revenue" name="매출" stroke="#10b981" strokeWidth={2.5} dot={{ r: 2, strokeWidth: 0, fill: '#10b981' }} activeDot={{ r: 4 }} />
        <Line type="monotone" dataKey="revenue" name="순매출" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 2, strokeWidth: 0, fill: '#3b82f6' }} activeDot={{ r: 4 }} />
        <Line type="monotone" dataKey="net_revenue" name="순수익" stroke="#8b5cf6" strokeWidth={2.5} dot={{ r: 2, strokeWidth: 0, fill: '#8b5cf6' }} activeDot={{ r: 4 }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
