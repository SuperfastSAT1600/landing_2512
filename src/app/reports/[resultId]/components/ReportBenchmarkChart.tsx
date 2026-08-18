'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { SectionBenchmarks } from '@/lib/report-benchmarks';

interface Section {
  name: string;
  accuracy: number;
}

interface Props {
  sections: Section[];
  sectionBenchmarks: Record<string, SectionBenchmarks>;
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; fill: string }[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-100 shadow-lg rounded-xl px-4 py-3 text-sm">
      <p className="font-semibold text-slate-700 mb-2">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: p.fill }} />
          <span className="text-slate-500">{p.name}:</span>
          <span className="font-bold text-slate-800">{Math.round(p.value * 100)}%</span>
        </div>
      ))}
    </div>
  );
};

export function ReportBenchmarkChart({ sections, sectionBenchmarks }: Props) {
  const data = sections.map((s) => {
    const b = sectionBenchmarks[s.name];
    return {
      name: s.name === 'Reading and Writing' ? 'R&W' : 'Math',
      You: s.accuracy,
      'Top 10%': b?.top10.accuracy ?? 0,
    };
  });

  return (
    <section>
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="h-[200px] sm:h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} barCategoryGap="35%" barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#64748B', fontSize: 13, fontWeight: 600 }}
              />
              <YAxis
                tickFormatter={(v) => `${Math.round(v * 100)}%`}
                domain={[0, 1]}
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#94A3B8', fontSize: 11 }}
                width={42}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F8FAFC' }} />
              <Legend
                iconType="square"
                iconSize={10}
                wrapperStyle={{ fontSize: 12, color: '#64748B', paddingTop: 12 }}
              />
              <Bar dataKey="You" fill="#071be9" radius={[5, 5, 0, 0]} />
              <Bar dataKey="Top 10%" fill="#6085FF" radius={[5, 5, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}
