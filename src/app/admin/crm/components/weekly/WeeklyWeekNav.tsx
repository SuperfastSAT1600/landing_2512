'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { WeekDef } from '@/lib/week-definitions';

interface Props {
  week: WeekDef | null;
  /** 있으면 주간 계획/오늘 실행 토글을 노출한다. */
  subView?: 'plan' | 'today';
  onSubView?: (v: 'plan' | 'today') => void;
  onShift: (offset: number) => void;
  onThisWeek: () => void;
}

/** 서브뷰 토글 + 주 이동. 주 네비는 '주간 계획'에서만 의미가 있다. */
export function WeeklyWeekNav({ week, subView, onSubView, onShift, onThisWeek }: Props) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      {subView && onSubView ? (
        <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
          {([['plan', '주간 계획'], ['today', '오늘 실행']] as const).map(([k, label]) => (
            <button
              key={k}
              onClick={() => onSubView(k)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                subView === k ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      ) : <div />}

      {(!subView || subView === 'plan') && (
        <div className="flex items-center gap-2">
          <button onClick={() => onShift(-1)} aria-label="이전 주" className="p-1 rounded text-gray-400 hover:bg-gray-100">
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-semibold text-gray-800 min-w-[130px] text-center">{week?.label ?? '-'}</span>
          <button onClick={() => onShift(1)} aria-label="다음 주" className="p-1 rounded text-gray-400 hover:bg-gray-100">
            <ChevronRight size={16} />
          </button>
          <button onClick={onThisWeek} className="ml-1 px-2.5 py-1 text-xs rounded-md text-gray-500 hover:bg-gray-100">
            이번 주
          </button>
        </div>
      )}
    </div>
  );
}
