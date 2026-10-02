'use client';

import { UserPlus } from 'lucide-react';
import { getWeekLabel } from '@/lib/week-definitions';
import type { RenewalScope } from '../use-renewal-board';

interface RenewalToolbarProps {
  scope: RenewalScope;
  weekOptions: string[];
  candidatesOpen: boolean;
  candidatesLoading: boolean;
  candidateCount: number;
  onScopeChange: (scope: RenewalScope) => void;
  onOpenCandidates: () => void;
}

/** 스코프 셀렉터 + 대상 추가 */
export function RenewalToolbar({
  scope,
  weekOptions,
  candidatesOpen,
  candidatesLoading,
  candidateCount,
  onScopeChange,
  onOpenCandidates,
}: RenewalToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={scope.kind === 'open' ? 'open' : scope.weekStart}
        onChange={(e) =>
          onScopeChange(e.target.value === 'open' ? { kind: 'open' } : { kind: 'week', weekStart: e.target.value })
        }
        className="px-2.5 py-1.5 text-xs font-semibold border border-gray-200 rounded-lg bg-white text-gray-800 outline-none focus:border-gray-400"
      >
        <option value="open">진행 중 전체</option>
        {weekOptions.map((start) => (
          <option key={start} value={start}>
            {getWeekLabel(start) ?? start}
          </option>
        ))}
      </select>
      {!candidatesOpen && (
        <button
          type="button"
          onClick={onOpenCandidates}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
        >
          <UserPlus size={13} />
          재결제 대상 추가
          {!candidatesLoading && (
            <span className="text-blue-400 font-medium">{candidateCount}명</span>
          )}
        </button>
      )}
    </div>
  );
}
