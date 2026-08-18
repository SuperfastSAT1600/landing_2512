'use client';

import { Target, Plus } from 'lucide-react';
import type { WinbackPlayListItem } from './hooks/useWinbackPlays';

/**
 * 이탈 리드풀 상단의 캠페인 컨텍스트 바 — (구 AI 검색 자리)
 * 캠페인을 하나 고르면 리드 목록에 타겟 배지가 붙고, 선택한 리드를 그 캠페인에 담을 수 있다.
 */
export function WinbackPlayBar({
  plays,
  selectedPlayId,
  onSelect,
  onNew,
  onOpenPlays,
}: {
  plays: WinbackPlayListItem[];
  selectedPlayId: string | null;
  onSelect: (playId: string | null) => void;
  onNew: () => void;
  onOpenPlays: () => void;
}) {
  const active = plays.filter((p) => p.status === 'running' || p.status === 'draft');
  const selected = plays.find((p) => p.id === selectedPlayId) ?? null;

  return (
    <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3 space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-blue-700">
          <Target size={12} /> 윈백 캠페인
        </span>

        {active.length > 0 ? (
          <select
            value={selectedPlayId ?? ''}
            onChange={(e) => onSelect(e.target.value || null)}
            className="text-xs border border-blue-200 bg-white rounded-lg px-2 py-1 focus:outline-none focus:border-blue-400"
          >
            <option value="">캠페인 선택 안 함</option>
            {active.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        ) : (
          <span className="text-[11px] text-gray-500">진행 중인 캠페인이 없습니다.</span>
        )}

        <button
          type="button"
          onClick={onNew}
          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white border border-blue-200 text-[11px] font-medium text-blue-600 hover:bg-blue-100"
        >
          <Plus size={11} /> 새 캠페인
        </button>

        <button
          type="button"
          onClick={onOpenPlays}
          className="ml-auto text-[11px] text-blue-600 hover:text-blue-800"
        >
          캠페인 관리 →
        </button>
      </div>

      {selected && (
        <p className="text-[11px] text-gray-600">
          <b className="text-gray-800">{selected.title}</b> — 타겟 {selected.rollup.targeted} · 발송{' '}
          {selected.rollup.sent} · 반응 {selected.rollup.responded} · 전환 {selected.rollup.converted}
          <span className="ml-2 text-gray-400">
            아래에서 리드를 선택해 이 캠페인에 추가할 수 있습니다.
          </span>
        </p>
      )}
    </div>
  );
}
