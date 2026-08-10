'use client';

import dynamic from 'next/dynamic';
import { GraduationCap } from 'lucide-react';
import { BriefCard } from './BriefCard';
import { BRIEF } from '../fixtures';
import { t } from '../i18n';
import { STAT_TILES, STRENGTH_SKILLS, TREND } from '../fixtures/learning';

// recharts는 무겁고 SSR이 필요 없다 — 실제 CRM과 동일하게 지연 로딩한다.
const AssessmentTrend = dynamic(() => import('./AssessmentTrend').then(m => m.AssessmentTrend), {
  ssr: false,
  loading: () => <div className="h-[150px] animate-pulse rounded-lg bg-gray-50" />,
});

export function LearningPane() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-3.5">
        <GraduationCap size={15} className="text-blue-500" />
        <span className="text-[13px] font-semibold text-gray-700">{t.learningData}</span>
      </div>

      <div className="min-h-0 flex-1 space-y-4 px-4 py-4 lg:overflow-y-auto">
        <BriefCard brief={BRIEF} />

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {STAT_TILES.map(tile => (
            <div key={tile.label} className="rounded-lg border border-gray-100 bg-gray-50/60 px-3 py-2.5">
              <p className="text-[11px] sm:text-[10px] text-gray-400">{tile.label}</p>
              <p className="mt-0.5 text-[15px] font-bold tabular-nums text-gray-900">{tile.value}</p>
              <p className="mt-0.5 text-[11px] sm:text-[10px] text-gray-400">{tile.sub}</p>
            </div>
          ))}
        </div>

        <div>
          <p className="mb-1.5 text-[12px] sm:text-[11px] font-semibold text-gray-500">{t.mathTrend}</p>
          <AssessmentTrend data={TREND} />
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
            {TREND.filter(pt => pt.marker).map(pt => (
              <span key={pt.date} className="text-[11px] sm:text-[10px] text-gray-400">
                {pt.date} · {pt.marker}
              </span>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-[12px] sm:text-[11px] font-semibold text-gray-500">{t.strengthSkills}</p>
          <div className="flex flex-wrap gap-1.5">
            {STRENGTH_SKILLS.map(s => (
              <span
                key={s.name}
                className="rounded-md border border-emerald-100 bg-emerald-50 px-2 py-1 text-[12px] sm:text-[11px] text-emerald-700"
              >
                {s.name} <span className="font-semibold">{s.pct}%</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
