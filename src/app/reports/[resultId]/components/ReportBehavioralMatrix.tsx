'use client';

import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine,
} from 'recharts';

interface QuestionDetail {
  id: string;
  number: number;
  section: string;
  domain: string;
  difficulty: string;
  isCorrect: boolean;
  answered: boolean;
  timeSeconds: number;
  confidence: number;
  flagged: boolean;
}

interface Props {
  questionDetails: QuestionDetail[];
}

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: { payload: QuestionDetail }[] }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white border border-slate-100 shadow-lg rounded-xl px-4 py-3 text-sm min-w-[180px]">
      <p className="font-bold text-slate-800 mb-1">Q{d.number}</p>
      <p className="text-slate-500 text-xs mb-2">{d.domain}</p>
      <div className="space-y-1">
        <div className="flex justify-between gap-4">
          <span className="text-slate-400">Time</span>
          <span className="font-semibold">{d.timeSeconds}s</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-slate-400">Confidence</span>
          <span className="font-semibold">{d.confidence > 0 ? `${d.confidence}/5` : '—'}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-slate-400">Result</span>
          <span className={`font-semibold ${d.isCorrect ? 'text-emerald-600' : 'text-red-500'}`}>
            {d.isCorrect ? '✓ Correct' : '✗ Wrong'}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-slate-400">Difficulty</span>
          <span className="font-semibold">{d.difficulty}</span>
        </div>
      </div>
    </div>
  );
};

export function ReportBehavioralMatrix({ questionDetails }: Props) {
  const plotData = questionDetails.filter((q) => q.answered && q.timeSeconds > 0);

  const avgTime = plotData.length > 0
    ? plotData.reduce((a, q) => a + q.timeSeconds, 0) / plotData.length
    : 0;
  const avgConf = plotData.filter((q) => q.confidence > 0).length > 0
    ? plotData.filter((q) => q.confidence > 0).reduce((a, q) => a + q.confidence, 0)
      / plotData.filter((q) => q.confidence > 0).length
    : 0;

  const quadrants = [
    { label: 'Quick & Confident', desc: 'Strong command', x: 'high', y: 'high' },
    { label: 'Slow & Confident', desc: 'Careful but sure', x: 'low', y: 'high' },
    { label: 'Quick & Uncertain', desc: 'Guessing?', x: 'high', y: 'low' },
    { label: 'Slow & Uncertain', desc: 'Needs practice', x: 'low', y: 'low' },
  ];

  return (
    <section>
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        {plotData.length === 0 ? (
          <p className="text-slate-400 text-center py-12">No behavioral data available.</p>
        ) : (
          <>
            <div className="h-[260px] sm:h-[340px]">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 16, right: 24, bottom: 16, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis
                    dataKey="timeSeconds"
                    type="number"
                    name="Time"
                    unit="s"
                    domain={['auto', 'auto']}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94A3B8', fontSize: 11 }}
                    label={{ value: 'Time (s)', position: 'insideBottom', offset: -8, fill: '#94A3B8', fontSize: 11 }}
                  />
                  <YAxis
                    dataKey="confidence"
                    type="number"
                    name="Confidence"
                    domain={[-12.5, 112.5]}
                    ticks={[0, 25, 50, 75, 100]}
                    tickFormatter={(v: number) => {
                      const map: Record<number, string> = { 0: 'None', 25: '25%', 50: '50%', 75: '75%', 100: '100%' };
                      return map[v] ?? `${v}%`;
                    }}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94A3B8', fontSize: 10 }}
                    label={{ value: 'Confidence', angle: -90, position: 'insideLeft', offset: 12, fill: '#94A3B8', fontSize: 11 }}
                    width={52}
                  />
                  {avgTime > 0 && (
                    <ReferenceLine x={avgTime} stroke="#CBD5E1" strokeDasharray="4 2" label={{ value: 'Avg time', fill: '#94A3B8', fontSize: 10 }} />
                  )}
                  {avgConf > 0 && (
                    <ReferenceLine y={avgConf} stroke="#CBD5E1" strokeDasharray="4 2" label={{ value: 'Avg conf.', fill: '#94A3B8', fontSize: 10, position: 'right' }} />
                  )}
                  <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
                  <Scatter data={plotData} shape="circle">
                    {plotData.map((q) => (
                      <Cell
                        key={q.id}
                        fill={q.isCorrect ? '#059669' : '#DC2626'}
                        fillOpacity={0.75}
                        stroke={q.flagged ? '#F59E0B' : 'transparent'}
                        strokeWidth={q.flagged ? 2 : 0}
                      />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-6 mt-4 text-xs text-slate-500">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-emerald-600 opacity-75" />
                Correct
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-red-600 opacity-75" />
                Incorrect
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full border-2 border-amber-400 bg-transparent" />
                Flagged
              </div>
            </div>

            {/* Quadrant summary */}
            {avgTime > 0 && avgConf > 0 && (
              <div className="grid grid-cols-2 gap-3 mt-6 pt-4 border-t border-slate-50">
                {quadrants.map((q) => {
                  const count = plotData.filter((d) =>
                    q.x === 'high' ? d.timeSeconds <= avgTime : d.timeSeconds > avgTime
                  ).filter((d) =>
                    q.y === 'high' ? d.confidence >= avgConf : d.confidence < avgConf
                  ).length;
                  return (
                    <div key={q.label} className="flex items-start gap-2 p-3 rounded-xl bg-slate-50">
                      <div className="flex-1">
                        <p className="text-xs font-bold text-slate-700">{q.label}</p>
                        <p className="text-xs text-slate-400">{q.desc}</p>
                      </div>
                      <span className="text-lg font-bold text-slate-800">{count}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
