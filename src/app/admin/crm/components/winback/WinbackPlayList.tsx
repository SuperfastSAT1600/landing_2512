'use client';

import { useState } from 'react';
import { Loader2, Plus, Target, Trash2 } from 'lucide-react';
import type { WinbackPlayListItem } from './hooks/useWinbackPlays';

const STATUS_LABELS: Record<string, string> = {
  draft: '초안',
  running: '진행 중',
  done: '종료',
  archived: '보관',
};

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  running: 'bg-blue-100 text-blue-700',
  done: 'bg-emerald-100 text-emerald-700',
  archived: 'bg-gray-100 text-gray-400',
};

export function WinbackPlayList({
  plays,
  loading,
  error,
  onOpen,
  onNew,
  onDelete,
}: {
  plays: WinbackPlayListItem[];
  loading: boolean;
  error: string | null;
  onOpen: (playId: string) => void;
  onNew: () => void;
  onDelete: (playId: string) => Promise<void>;
}) {
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">
          이탈 리드에게 특정 상품을 파는 캠페인입니다. 추천 → 발송 기록 → 반응·전환을 한 곳에서 봅니다.
        </p>
        <button
          onClick={onNew}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-900 text-white text-xs font-semibold hover:bg-gray-700"
        >
          <Plus size={13} /> 새 플레이
        </button>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      {loading && plays.length === 0 ? (
        <div className="flex items-center justify-center gap-2 py-12 text-gray-400 text-sm">
          <Loader2 size={16} className="animate-spin" /> 불러오는 중…
        </div>
      ) : plays.length === 0 ? (
        <div className="py-12 text-center space-y-2">
          <Target size={22} className="mx-auto text-gray-300" />
          <p className="text-sm text-gray-400">아직 플레이가 없습니다.</p>
          <button onClick={onNew} className="text-xs font-medium text-blue-600 hover:text-blue-700">
            첫 플레이 만들기
          </button>
        </div>
      ) : (
        <ul className="grid gap-2">
          {plays.map((p) => (
            <li key={p.id} className="relative">
              <button
                onClick={() => onOpen(p.id)}
                className="w-full text-left rounded-xl border border-gray-100 bg-white p-3 pr-9 hover:border-gray-300 transition-colors"
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-gray-900">{p.title}</span>
                  <span
                    className={`px-1.5 py-0.5 text-[10px] rounded ${STATUS_STYLES[p.status] ?? ''}`}
                  >
                    {STATUS_LABELS[p.status] ?? p.status}
                  </span>
                  {p.product_category && (
                    <span className="text-[11px] text-gray-400">{p.product_category}</span>
                  )}
                  <span className="ml-auto text-[11px] text-gray-400">
                    {p.created_at.slice(0, 10)}
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] text-gray-500 line-clamp-2">{p.product_brief}</p>
                <div className="mt-1.5 flex items-center gap-3 text-[11px] text-gray-500">
                  <span>타겟 {p.rollup.targeted}</span>
                  <span>발송 {p.rollup.sent}</span>
                  <span>반응 {p.rollup.responded}</span>
                  <span className="font-medium text-emerald-600">전환 {p.rollup.converted}</span>
                </div>
              </button>
              <button
                type="button"
                aria-label="플레이 삭제"
                disabled={deletingIds.has(p.id)}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!confirm(`"${p.title}" 플레이를 삭제할까요? 타겟·변형 기록도 함께 삭제됩니다.`)) {
                    return;
                  }
                  setDeletingIds((prev) => new Set(prev).add(p.id));
                  Promise.resolve(onDelete(p.id))
                    .catch((err) => alert((err as Error).message))
                    .finally(() =>
                      setDeletingIds((prev) => {
                        const next = new Set(prev);
                        next.delete(p.id);
                        return next;
                      })
                    );
                }}
                className="absolute top-3 right-3 text-gray-300 hover:text-red-500 p-1 disabled:opacity-50"
              >
                <Trash2 size={13} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
