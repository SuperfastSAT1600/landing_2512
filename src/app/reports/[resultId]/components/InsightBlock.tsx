'use client';

import type { SectionInsight } from '@/lib/report-insights';

const TONE_STYLES = {
  strength: {
    border: '#16A34A',
    bg: '#F0FDF4',
    iconBg: '#DCFCE7',
    icon: '↑',
    iconColor: '#16A34A',
    labelColor: '#15803D',
    label: 'Strength',
  },
  opportunity: {
    border: '#D97706',
    bg: '#FFFBEB',
    iconBg: '#FEF3C7',
    icon: '◈',
    iconColor: '#B45309',
    labelColor: '#92400E',
    label: 'Opportunity',
  },
  critical: {
    border: '#DC2626',
    bg: '#FFF5F5',
    iconBg: '#FEE2E2',
    icon: '!',
    iconColor: '#DC2626',
    labelColor: '#B91C1C',
    label: 'Priority Focus',
  },
};

interface Props {
  insight: SectionInsight;
}

export function InsightBlock({ insight }: Props) {
  const style = TONE_STYLES[insight.tone];

  return (
    <div
      className="rounded-xl p-5 flex gap-4 print:border print:border-slate-200"
      style={{ background: style.bg, borderLeft: `3px solid ${style.border}` }}
    >
      <div
        className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
        style={{ background: style.iconBg, color: style.iconColor }}
      >
        {style.icon}
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span
            className="text-xs font-bold uppercase tracking-widest"
            style={{ color: style.labelColor }}
          >
            {style.label}
          </span>
        </div>
        <p className="font-semibold text-slate-800 mb-1 leading-snug" style={{ fontSize: 13 }}>{insight.headline}</p>
        <p className="text-slate-600 leading-relaxed" style={{ fontSize: 13 }}>{insight.body}</p>
      </div>
    </div>
  );
}

interface GenericInsightProps {
  headline: string;
  body: string;
  icon?: string;
  tutor?: boolean;
}

export function GenericInsightBlock({ headline, body, icon = '→', tutor = false }: GenericInsightProps) {
  return (
    <div
      className="rounded-xl p-5 flex gap-4"
      style={{ background: '#F8F7F4', borderLeft: '3px solid #09090b' }}
    >
      <div
        className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
        style={{ background: '#09090b' }}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className="font-semibold text-slate-800 leading-snug" style={{ fontSize: 13 }}>{headline}</p>
          {tutor && (
            <span
              className="flex-shrink-0 rounded-full px-2 py-0.5 font-medium"
              style={{ fontSize: 10, background: '#DCFCE7', color: '#15803D' }}
            >
              ✓ 튜터 검수 완료
            </span>
          )}
        </div>
        <p className="text-slate-600 leading-relaxed" style={{ fontSize: 13 }}>{body}</p>
      </div>
    </div>
  );
}
