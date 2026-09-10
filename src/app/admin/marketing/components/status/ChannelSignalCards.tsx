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
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-[#1e2023] border border-white/5 rounded-xl p-4 animate-pulse">
            <div className="h-4 w-16 bg-white/5 rounded mb-2" />
            <div className="h-3 w-full bg-white/5 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (signals.length === 0) {
    return <p className="text-gray-600 text-sm text-center py-6">채널 데이터 없음</p>;
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
      {signals.map((sig) => {
        const cfg = LEVEL_CONFIG[sig.level];
        return (
          <div
            key={sig.channel}
            className={`rounded-xl p-4 border ${cfg.bg} ${cfg.border} space-y-2`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-white"
                style={{ color: GROUP_COLORS[sig.channel] }}>
                {sig.channel}
              </span>
              <span className={`flex items-center gap-1 text-xs font-medium ${cfg.text}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                {cfg.label}
              </span>
            </div>
            {sig.reasons.length > 0 ? (
              <ul className="space-y-0.5">
                {sig.reasons.map((r, i) => (
                  <li key={i} className="text-xs text-gray-500 leading-tight">{r}</li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-gray-600">이상 없음</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
