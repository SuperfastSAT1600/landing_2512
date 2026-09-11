'use client';

import type { ChannelSignal } from './utils/signalUtils';
import { GROUP_COLORS } from '@/lib/marketing-groups';

const LEVEL_CONFIG = {
  good: { label: '정상', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400', dot: 'bg-emerald-400' },
  warning: { label: '주의', bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400', dot: 'bg-amber-400' },
  danger: { label: '위험', bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'text-red-400', dot: 'bg-red-400' },
};

interface Props {
  signals: ChannelSignal[];
  loading: boolean;
}

export default function ChannelSignalCards({ signals, loading }: Props) {
  if (loading) {
    return (
      <div className="flex gap-2 flex-wrap">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-[#1e2023] border border-white/5 rounded-lg px-3 py-2 animate-pulse flex gap-2 items-center">
            <div className="h-3 w-14 bg-white/5 rounded" />
            <div className="h-3 w-10 bg-white/5 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (signals.length === 0) {
    return <p className="text-gray-600 text-sm text-center py-6">채널 데이터 없음</p>;
  }

  return (
    <div className="flex gap-2 flex-wrap">
      {signals.map((sig) => {
        const cfg = LEVEL_CONFIG[sig.level];
        const reasonText = sig.reasons.length > 0 ? sig.reasons.join(' · ') : '이상 없음';
        return (
          <div
            key={sig.channel}
            title={reasonText}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 border ${cfg.bg} ${cfg.border} cursor-default`}
          >
            <span className="text-xs font-semibold whitespace-nowrap"
              style={{ color: GROUP_COLORS[sig.channel] }}>
              {sig.channel}
            </span>
            <span className={`flex items-center gap-1 text-xs font-medium whitespace-nowrap ${cfg.text}`}>
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
              {cfg.label}
            </span>
            {sig.reasons.length > 0 && (
              <span className="text-xs text-gray-500 whitespace-nowrap hidden sm:inline">
                {sig.reasons[0]}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
