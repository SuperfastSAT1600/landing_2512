'use client';

import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip, Legend,
} from 'recharts';
import { DomainBenchmark } from '@/lib/report-benchmarks';

interface DomainBreakdown {
  domain: string;
  accuracy: number;
  total: number;
}

interface Section {
  name: string;
  domainBreakdown: DomainBreakdown[];
}

interface Props {
  sections: Section[];
  domainBenchmarks: Record<string, DomainBenchmark>;
}

const DOMAIN_SHORT: Record<string, string> = {
  'Craft and Structure': 'Craft & Struct.',
  'Information and Ideas': 'Info & Ideas',
  'Standard English Conventions': 'StdEng Conv.',
  'Expression of Ideas': 'Expression',
  'Algebra': 'Algebra',
  'Advanced Math': 'Adv. Math',
  'Problem-Solving and Data Analysis': 'Data Analysis',
  'Geometry and Trigonometry': 'Geometry',
};

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: { name: string; value: number; fill: string; stroke: string }[] }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-100 shadow-lg rounded-xl px-4 py-3 text-sm">
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ background: p.stroke }} />
          <span className="text-slate-500">{p.name}:</span>
          <span className="font-bold">{Math.round(p.value * 100)}%</span>
        </div>
      ))}
    </div>
  );
};

export function ReportRadarChart({ sections, domainBenchmarks }: Props) {
  const allDomains = sections.flatMap((s) => s.domainBreakdown);

  const data = allDomains.map((d) => ({
    domain: DOMAIN_SHORT[d.domain] ?? d.domain,
    fullDomain: d.domain,
    You: d.accuracy,
    'Global Avg': domainBenchmarks[d.domain]?.globalAverage ?? 0,
    'Top 10%': domainBenchmarks[d.domain]?.top10 ?? 0,
  }));

  if (data.length === 0) {
    return null;
  }

  return (
    <section>
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <ResponsiveContainer width="100%" height={360}>
          <RadarChart data={data} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
            <PolarGrid stroke="#E2E8F0" />
            <PolarAngleAxis
              dataKey="domain"
              tick={{ fill: '#64748B', fontSize: 11, fontWeight: 500 }}
            />
            <Radar
              name="You"
              dataKey="You"
              stroke="#1B2A4A"
              fill="#1B2A4A"
              fillOpacity={0.15}
              strokeWidth={2}
            />
            <Radar
              name="Global Avg"
              dataKey="Global Avg"
              stroke="#93C5FD"
              fill="#93C5FD"
              fillOpacity={0.1}
              strokeWidth={1.5}
              strokeDasharray="4 2"
            />
            <Radar
              name="Top 10%"
              dataKey="Top 10%"
              stroke="#BFDBFE"
              fill="none"
              strokeWidth={1}
              strokeDasharray="2 3"
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 12, color: '#64748B', paddingTop: 12 }}
            />
          </RadarChart>
        </ResponsiveContainer>

        {/* Domain table */}
        <div className="mt-4 divide-y divide-slate-50">
          {allDomains.map((d) => {
            const b = domainBenchmarks[d.domain];
            const pct = Math.round(d.accuracy * 100);
            const vsAvg = b ? d.accuracy - b.globalAverage : 0;
            return (
              <div key={d.domain} className="flex items-center justify-between py-2.5">
                <div>
                  <span className="text-sm font-medium text-slate-700">{d.domain}</span>
                  <span className="ml-2 text-xs text-slate-400">({d.total} questions)</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-28 bg-slate-100 rounded-full h-1.5">
                    <div
                      className="h-1.5 rounded-full"
                      style={{ width: `${pct}%`, background: '#1B2A4A' }}
                    />
                  </div>
                  <span className="text-sm font-bold text-slate-800 w-10 text-right">{pct}%</span>
                  {b && (
                    <span className={`text-xs font-semibold w-14 text-right ${vsAvg >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                      {vsAvg >= 0 ? '+' : ''}{Math.round(vsAvg * 100)}%
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
