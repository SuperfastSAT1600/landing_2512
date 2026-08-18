'use client';

import { SectionBenchmarks } from '@/lib/report-benchmarks';

interface Section {
  name: string;
  accuracy: number;
  correctCount: number;
  totalQuestions: number;
}

interface Props {
  studentName: string;
  submittedAt: string;
  totalTimeSeconds: number;
  sections: Section[];
  sectionBenchmarks: Record<string, SectionBenchmarks>;
}

function DeltaBadge({ value, label }: { value: number; label: string }) {
  const positive = value >= 0;
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
        positive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
      }`}
    >
      {positive ? '▲' : '▼'} {Math.abs(Math.round(value * 100))}% vs {label}
    </span>
  );
}

function ScoreCard({
  label,
  accuracy,
  correctCount,
  totalQuestions,
  benchmark,
}: {
  label: string;
  accuracy: number;
  correctCount: number;
  totalQuestions: number;
  benchmark?: SectionBenchmarks;
}) {
  const pct = Math.round(accuracy * 100);
  const vsTop = benchmark ? accuracy - benchmark.top10.accuracy : null;

  // Progress arc radius
  const r = 52;
  const circ = 2 * Math.PI * r;
  const dash = circ * accuracy;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm flex flex-col gap-4">
      <div className="text-xs font-bold uppercase tracking-widest text-slate-400">{label}</div>

      <div className="flex items-center gap-6">
        {/* Donut */}
        <div className="relative flex-shrink-0 w-24 h-24 sm:w-[120px] sm:h-[120px]">
          <svg width="100%" height="100%" viewBox="0 0 120 120">
            <circle cx={60} cy={60} r={r} fill="none" stroke="#F1F5F9" strokeWidth={12} />
            <circle
              cx={60} cy={60} r={r}
              fill="none"
              stroke="#071be9"
              strokeWidth={12}
              strokeDasharray={`${dash} ${circ - dash}`}
              strokeDashoffset={circ / 4}
              strokeLinecap="round"
              style={{ transition: 'stroke-dasharray 0.8s ease' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-slate-900">{pct}%</span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-slate-600 text-sm">
            <span className="text-slate-900 font-semibold text-lg">{correctCount}</span>
            <span className="text-slate-400"> / {totalQuestions}</span>
            <span className="text-slate-500 ml-1 text-xs">correct</span>
          </p>
          {vsTop !== null && <DeltaBadge value={vsTop} label="Top 10%" />}
        </div>
      </div>

      {benchmark && (
        <div className="pt-2 border-t border-slate-50">
          <BenchmarkRow label="Top 10%" value={benchmark.top10.accuracy} yours={accuracy} />
        </div>
      )}
    </div>
  );
}

function BenchmarkRow({ label, value, yours }: { label: string; value: number; yours: number }) {
  const pct = Math.round(value * 100);
  const isAhead = yours >= value;
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-slate-400">{label}</span>
      <div className="flex items-center gap-2">
        <div className="w-24 bg-slate-100 rounded-full h-1.5">
          <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, background: '#6085FF' }} />
        </div>
        <span className={`font-semibold w-8 text-right ${isAhead ? 'text-emerald-600' : 'text-red-500'}`}>
          {pct}%
        </span>
      </div>
    </div>
  );
}

export function ReportExecutiveSummary({ sections, sectionBenchmarks }: Props) {
  return (
    <section>
      {/* Score cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {sections.map((section) => (
          <ScoreCard
            key={section.name}
            label={section.name === 'Reading and Writing' ? 'Reading & Writing' : section.name}
            accuracy={section.accuracy}
            correctCount={section.correctCount}
            totalQuestions={section.totalQuestions}
            benchmark={sectionBenchmarks[section.name]}
          />
        ))}
      </div>
    </section>
  );
}
