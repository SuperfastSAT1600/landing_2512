'use client';

import type { WeeklyExecutionLead } from '@/types/crm';
import { shortDay } from './format';

interface Props {
  leads: WeeklyExecutionLead[];
  onSelectStudent?: (id: string) => void;
}

/** 전략을 적용받은 리드 칩 목록. 결제한 리드는 emerald. */
export function LeadChips({ leads, onSelectStudent }: Props) {
  return (
    <div className="flex flex-wrap gap-1">
      {leads.map((l) => (
        <button
          key={`${l.student_id}-${l.applied_at}`}
          onClick={() => onSelectStudent?.(l.student_id)}
          title={l.memo || undefined}
          className={`text-[11px] px-1.5 py-0.5 rounded border transition-colors ${
            l.paid
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-400'
              : 'border-gray-200 text-gray-600 hover:border-gray-400'
          }`}
        >
          {l.name}
          <span className="ml-1 text-[10px] text-gray-400">{shortDay(l.applied_at)}</span>
        </button>
      ))}
    </div>
  );
}
