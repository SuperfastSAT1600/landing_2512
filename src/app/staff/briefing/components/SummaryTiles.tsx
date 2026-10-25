'use client';

import type { BriefingPayload } from '../types';
import { SECTION_IDS } from './BriefingSections';

const TILES = [
  { key: 'endingSoon', label: '종료 임박', color: 'text-amber-600', id: SECTION_IDS.endingSoon },
  { key: 'noSchedule', label: '지금 없음', color: 'text-red-600', id: SECTION_IDS.noSchedule },
  { key: 'neverScheduled', label: '한 번도 없음', color: 'text-slate-600', id: SECTION_IDS.neverScheduled },
  { key: 'coaches', label: '코치', color: 'text-indigo-600', id: SECTION_IDS.coach },
] as const;

/** 한눈에 보는 개수 — 누르면 해당 목록으로 이동 */
export function SummaryTiles({ payload }: { payload: BriefingPayload }) {
  return (
    <nav aria-label="목록 바로가기" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {TILES.map(t => (
        <button key={t.key} type="button" onClick={() => document.getElementById(t.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-left shadow-sm hover:bg-gray-50">
          <span className="block text-xs text-gray-500">{t.label}</span>
          <span className={`text-2xl font-bold tabular-nums ${t.color}`}>{payload[t.key].length}</span>
        </button>
      ))}
    </nav>
  );
}
