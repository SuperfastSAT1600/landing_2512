'use client';

import { ArrowRight } from 'lucide-react';

interface Props {
  weekLabel: string;
  onGoToWeek: () => void;
}

/** 지난주 회고가 비어 있을 때만 노출되는 배너 — 주간 루프의 시작점. */
export function WeeklyRetroBanner({ weekLabel, onGoToWeek }: Props) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5">
      <p className="text-sm text-amber-800">
        지난주(<span className="font-semibold">{weekLabel}</span>) 회고가 비어 있습니다.
      </p>
      <button
        onClick={onGoToWeek}
        className="flex items-center gap-1 text-xs font-semibold text-amber-700 hover:text-amber-900"
      >
        지난주 회고 쓰기 <ArrowRight size={12} />
      </button>
    </div>
  );
}
