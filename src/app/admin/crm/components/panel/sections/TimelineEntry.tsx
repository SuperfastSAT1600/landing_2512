'use client';

import { useState } from 'react';
import { Sparkles, Check, ChevronUp, Pencil, Trash2, X } from 'lucide-react';
import type { ConsultationEntry } from '@/types/crm';

interface PendingEdit { purified: string; coachHistory: string; deletedItems: string[] }

interface Props {
  entry: ConsultationEntry;
  aiLoading: boolean;
  pendingEdit: PendingEdit | null;
  publishing: boolean;
  memoSaving: boolean;
  onAiCare: () => void;
  onPublish: () => void;
  onChangePurified: (v: string) => void;
  onStartEdit: () => void;
  onDeleteAi: () => void;
  onEditMemo: (newMemo: string) => Promise<boolean>;
}

export function TimelineEntry({ entry, aiLoading, pendingEdit, publishing, memoSaving, onAiCare, onPublish, onChangePurified, onStartEdit, onDeleteAi, onEditMemo }: Props) {
  const [aiExpanded, setAiExpanded] = useState(false);
  const [publishedExpanded, setPublishedExpanded] = useState(false);
  const [editingMemo, setEditingMemo] = useState(false);
  const [memoValue, setMemoValue] = useState(entry.raw_memo);
  const date = new Date(entry.created_at).toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  const hasAi = !!entry.ai_purified;
  const showAiSection =
    (entry.published && (publishedExpanded || !!pendingEdit || aiLoading)) ||
    (!entry.published && (!!pendingEdit || aiLoading || (hasAi && aiExpanded)));

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-4 pt-3 pb-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] text-gray-400">{date}</span>
          <div className="flex items-center gap-2">
            {hasAi && !entry.published && !pendingEdit && !aiLoading && (
              <button
                onClick={() => setAiExpanded(v => !v)}
                className="flex items-center gap-1 text-[11px] font-medium text-purple-500 hover:text-purple-700 transition-colors"
              >
                <Sparkles size={11} />AI 변환됨 ({aiExpanded ? '닫기' : '열기'}) {aiExpanded ? '▲' : '▾'}
              </button>
            )}
            {entry.published && (
              <button
                onClick={() => setPublishedExpanded(v => !v)}
                className="flex items-center gap-1 text-[11px] text-emerald-500 font-medium hover:text-emerald-700 transition-colors"
              >
                <Check size={11} /> 학부모 포털 노출 중 {publishedExpanded ? '▲' : '▾'}
              </button>
            )}
          </div>
        </div>
        {editingMemo ? (
          <div className="mt-1">
            <textarea
              value={memoValue}
              onChange={e => setMemoValue(e.target.value)}
              rows={6}
              className="w-full text-[13px] text-gray-800 bg-white border border-gray-300 focus:border-blue-400 rounded-lg px-3 py-2 leading-relaxed resize-y outline-none transition-colors"
            />
            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={async () => {
                  const ok = await onEditMemo(memoValue);
                  if (ok) setEditingMemo(false);
                }}
                disabled={memoSaving}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg text-xs font-bold text-white transition-colors"
              >
                <Check size={12} />{memoSaving ? '저장 중...' : '저장'}
              </button>
              <button
                onClick={() => { setMemoValue(entry.raw_memo); setEditingMemo(false); }}
                disabled={memoSaving}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-400 hover:text-gray-600 border border-gray-200 rounded-lg transition-colors"
              >
                <X size={11} />취소
              </button>
            </div>
          </div>
        ) : (
          <div className="group relative">
            <p className="text-[13px] text-gray-700 leading-relaxed whitespace-pre-wrap" style={{ lineHeight: '1.7' }}>
              {entry.raw_memo}
            </p>
            <button
              onClick={() => { setMemoValue(entry.raw_memo); setEditingMemo(true); }}
              className="mt-1.5 flex items-center gap-1 text-[11px] text-gray-300 hover:text-gray-500 transition-colors"
            >
              <Pencil size={10} />원본 수정
            </button>
          </div>
        )}
        {!editingMemo && !hasAi && !entry.published && !aiLoading && !pendingEdit && (
          <button
            onClick={onAiCare}
            className="mt-2.5 flex items-center gap-1.5 text-xs text-purple-500 hover:text-purple-600 transition-colors"
          >
            <Sparkles size={11} />AI 변환
          </button>
        )}
      </div>

      {showAiSection && (
        <div className="border-t border-gray-100 px-4 py-3 bg-gray-50">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-medium text-purple-500 flex items-center gap-1">
              <Sparkles size={11} />학부모 포털 노출 버전
            </p>
            {!aiLoading && !pendingEdit && entry.ai_purified && (
              <button onClick={onDeleteAi} className="flex items-center gap-1 text-xs text-red-300 hover:text-red-500 transition-colors">
                <Trash2 size={11} />삭제
              </button>
            )}
          </div>

          {aiLoading && (
            <div className="flex items-center gap-2 text-xs text-gray-400 py-2">
              <div className="w-3 h-3 border border-purple-400 border-t-transparent rounded-full animate-spin" />
              AI 변환 중...
            </div>
          )}

          {!aiLoading && pendingEdit && (
            <>
              <textarea
                value={pendingEdit.purified}
                onChange={e => onChangePurified(e.target.value)}
                rows={4}
                className="w-full text-[13px] text-gray-800 bg-white border border-gray-200 focus:border-purple-300 rounded-lg px-3 py-2 leading-relaxed resize-none outline-none transition-colors"
              />
              <div className="flex items-center gap-2 mt-2">
                <button
                  onClick={onPublish}
                  disabled={publishing}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-lg text-xs font-bold text-white transition-colors"
                >
                  <Check size={12} />{publishing ? '적용 중...' : '적용'}
                </button>
                <button
                  onClick={onAiCare}
                  disabled={publishing}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-gray-400 hover:text-gray-600 border border-gray-200 rounded-lg transition-colors"
                >
                  <Sparkles size={11} />재변환
                </button>
              </div>
            </>
          )}

          {!aiLoading && !pendingEdit && entry.published && entry.ai_purified && (
            <>
              <p className="text-[13px] text-gray-600 leading-relaxed whitespace-pre-wrap" style={{ lineHeight: '1.7' }}>
                {entry.ai_purified}
              </p>
              <div className="flex items-center gap-3 mt-2">
                <button onClick={onStartEdit} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors">
                  <Pencil size={11} />수정
                </button>
                <button onClick={() => setPublishedExpanded(false)} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors">
                  <ChevronUp size={11} />닫기
                </button>
              </div>
            </>
          )}

          {!aiLoading && !pendingEdit && !entry.published && entry.ai_purified && aiExpanded && (
            <>
              <p className="text-[13px] text-gray-600 leading-relaxed whitespace-pre-wrap" style={{ lineHeight: '1.7' }}>
                {entry.ai_purified}
              </p>
              <div className="flex items-center gap-3 mt-2">
                <button onClick={onStartEdit} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors">
                  <Pencil size={11} />수정 후 노출
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
