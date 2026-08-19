'use client';

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { TargetVsActualRow } from '@/lib/business-targets';

// 월별 목표 vs 실적 막대그래프 — recharts를 지연 로딩 청크로 분리하기 위한 전용 컴포넌트.
// 데이터 계산은 부모가 담당하고, 여기서는 렌더링만 한다.
export default function TargetVsActualChart({
  data,
  formatValue,
  formatTooltip,
}: {
  data: TargetVsActualRow[];
  formatValue: (n: number) => string;
  /** 축 눈금은 formatValue(단위 반올림)로 두고, 툴팁만 이걸로 정확한 금액을 보여준다. 미지정 시 formatValue 사용. */
  formatTooltip?: (n: number) => string;
}) {
  const tooltipFormat = formatTooltip ?? formatValue;
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} barCategoryGap="35%" barGap={4} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
        <XAxis dataKey="month" tick={{ fontSize: 11 }} tickFormatter={(m: string) => m.slice(2)} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={52} tickFormatter={formatValue} />
        <Tooltip formatter={(value) => tooltipFormat(Number(value))} contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }} />
        <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
        <Bar dataKey="target" name="목표" fill="#e5e7eb" radius={[3, 3, 0, 0]} maxBarSize={32} />
        <Bar dataKey="actual" name="실적" fill="#3b82f6" radius={[3, 3, 0, 0]} maxBarSize={32} />
      </BarChart>
    </ResponsiveContainer>
  );
}
