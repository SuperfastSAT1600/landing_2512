'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { WeeklyExecutionRow } from '@/types/crm';
import { WeeklyExecutionCard } from './WeeklyExecutionCard';

interface Props {
  rows: WeeklyExecutionRow[];
  onSelectStudent?: (id: string) => void;
}

/** 어느 트랙에도 연결되지 않은 전략 실행 — 계획 밖에서 벌어진 일. 기본 접힘. */
export function WeeklyUnplanned({ rows, onSelectStudent }: Props) {
  const [open, setOpen] = useState(false);
  if (rows.length === 0) return null;

  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-600"
      >
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        계획 외 실행 {rows.length}건
      </button>
      {open && (
        <ul className="mt-1.5 space-y-1.5">
          {rows.map((row) => (
            <WeeklyExecutionCard key={row.strategy_id} row={row} onSelectStudent={onSelectStudent} />
          ))}
        </ul>
      )}
    </div>
  );
}
