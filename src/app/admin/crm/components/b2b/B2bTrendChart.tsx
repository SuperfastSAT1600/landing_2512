'use client';

import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

// 업체별 라인 비교용 색상 팔레트(트렌드 차트 전용).
const COMPANY_COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#8b5cf6', '#ef4444', '#14b8a6', '#ec4899', '#f97316', '#6366f1', '#84cc16', '#0ea5e9', '#eab308'];

type CmpRow = { month: string; [companyId: string]: number | string };
type MonthlyRow = { month: string; revenue: number; leads: number; paid: number };
interface CompanyRef { company_id: string; company_name: string }

interface CompareProps {
  mode: 'compare';
  data: CmpRow[];
  companies: CompanyRef[];
  metricFmt: (v: number) => string;
  metricAxis: (v: number) => string;
}
interface MonthlyProps {
  mode: 'monthly';
  data: MonthlyRow[];
  formatWon: (n: number) => string;
}

// B2B 트렌드 차트(비교/월별) — recharts 지연 로딩 청크 분리용 전용 컴포넌트(렌더링만, 수치 불변).
export default function B2bTrendChart(props: CompareProps | MonthlyProps) {
  if (props.mode === 'compare') {
    const { data, companies, metricFmt, metricAxis } = props;
    return (
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={data} margin={{ top: 8, right: 4, left: -6, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis dataKey="month" tick={{ fontSize: 11 }} tickFormatter={(m: string) => m.slice(2)} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={48} allowDecimals={false} tickFormatter={metricAxis} />
          <Tooltip formatter={(value) => metricFmt(Number(value))} contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }} />
          <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
          {companies.map((c, i) => {
            const color = COMPANY_COLORS[i % COMPANY_COLORS.length];
            return (
              <Line key={c.company_id} type="monotone" dataKey={c.company_id} name={c.company_name} stroke={color} strokeWidth={2.5} dot={{ r: 2, strokeWidth: 0, fill: color }} activeDot={{ r: 4 }} connectNulls />
            );
          })}
        </ComposedChart>
      </ResponsiveContainer>
    );
  }

  const { data, formatWon } = props;
  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={data} margin={{ top: 8, right: 4, left: -6, bottom: 0 }} barCategoryGap="30%">
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
        <XAxis dataKey="month" tick={{ fontSize: 11 }} tickFormatter={(m: string) => m.slice(2)} tickLine={false} axisLine={false} />
        <YAxis yAxisId="left" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={48}
          tickFormatter={(v: number) => (v >= 1e8 ? `${(v / 1e8).toFixed(1)}억` : `${Math.round(v / 1e4)}만`)} />
        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={28} allowDecimals={false} />
        <Tooltip
          formatter={(value, name) => (name === '매출' ? formatWon(Number(value)) : `${value}명`)}
          contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
        <Bar yAxisId="left" dataKey="revenue" name="매출" fill="#a7f3d0" radius={[4, 4, 0, 0]} maxBarSize={26} />
        <Line yAxisId="right" type="monotone" dataKey="leads" name="리드" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 2.5, strokeWidth: 0, fill: '#3b82f6' }} activeDot={{ r: 4 }} />
        <Line yAxisId="right" type="monotone" dataKey="paid" name="결제" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 2.5, strokeWidth: 0, fill: '#f59e0b' }} activeDot={{ r: 4 }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
