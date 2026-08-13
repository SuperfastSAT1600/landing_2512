'use client';

import { AlertTriangle, Sparkles, Target, TrendingUp } from 'lucide-react';
import type { AdvisorBrief } from '@/lib/newton-advisor';
import { t } from '../i18n';

// 실제 CRM의 'AI 현황 브리핑' 카드와 같은 형태 — 보라 그라데이션 + 강점/취약/리스크/추천.
function BriefList({
  icon,
  label,
  items,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  items: string[];
  color: string;
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <div className="mb-1 flex items-center gap-1">
        {icon}
        <span className={`text-[12px] sm:text-[11px] font-semibold ${color}`}>{label}</span>
      </div>
      <ul className="space-y-0.5 pl-0.5">
        {items.map((t, i) => (
          <li key={i} className="flex gap-1.5 text-xs leading-relaxed text-gray-700">
            <span className="text-gray-300">·</span>
            <span>{t}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function BriefCard({ brief }: { brief: AdvisorBrief }) {
  return (
    <div className="rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50 to-blue-50 p-3.5">
      <div className="mb-2.5 flex items-center gap-1.5">
        <Sparkles size={14} className="text-violet-500" />
        <span className="text-xs font-semibold text-violet-700">{t.aiBriefing}</span>
      </div>

      <div className="space-y-2.5">
        <p className="text-sm font-semibold leading-snug text-gray-900">{brief.headline}</p>

        <BriefList
          icon={<TrendingUp size={12} className="text-emerald-500" />}
          label={t.strengths}
          items={brief.strengths}
          color="text-emerald-700"
        />
        <BriefList
          icon={<Target size={12} className="text-amber-500" />}
          label={t.weakAreas}
          items={brief.weaknesses}
          color="text-amber-700"
        />
        <BriefList
          icon={<AlertTriangle size={12} className="text-red-500" />}
          label={t.risks}
          items={brief.risks}
          color="text-red-600"
        />

        {brief.recommendation && (
          <div className="flex items-start gap-1.5 rounded-lg border border-violet-100 bg-white/70 px-2.5 py-2">
            <Sparkles size={12} className="mt-0.5 shrink-0 text-violet-500" />
            <p className="text-xs leading-relaxed text-gray-700">
              <span className="font-semibold text-violet-700">{t.recommended} </span>
              {brief.recommendation}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
