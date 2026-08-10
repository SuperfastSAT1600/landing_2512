'use client';

import { useState } from 'react';
import { Check, ChevronDown, Pencil, Trash2, X, User } from 'lucide-react';
import type { ConsultationEntry } from '@/types/crm';
import { AttachmentThumb } from './AttachmentThumb';
import { resolveCrmLabels, type CrmLabels } from '@/lib/crm-labels';

interface PendingEdit { purified: string; coachHistory: string; deletedItems: string[] }

// NOTE: AI 변환/학부모 포털 노출 UI는 요청으로 숨김(2026-08-07). 관련 props·API·데이터는 보존해
// 나중에 쉽게 되살릴 수 있도록 인터페이스는 그대로 두고, 이 컴포넌트에서만 렌더링을 제거했다.
interface Props {
  studentId: string;
  adminKey: string;
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
  onDeleteMemo: () => void;
  /** 미지정 시 한글(기본). */
  labels?: Partial<CrmLabels>;
  /** true면 수정·삭제 액션을 감춘다. */
  readOnly?: boolean;
  /** true면 링 강조 — 근거 메모로 점프했을 때 시각적으로 짚어준다. */
  highlighted?: boolean;
  /**
   * true면 항목을 아코디언으로 접는다 — 날짜·작성자만 보이고 눌러야 본문이 열린다.
   * 좁은 화면에서 기록이 수십 건이면 전부 펼친 목록은 스크롤이 감당되지 않는다.
   * 미지정 시 기존 동작(항상 펼침)이라 /admin/crm 화면은 영향이 없다.
   */
  collapsible?: boolean;
}

export function TimelineEntry({
  studentId, adminKey, entry, memoSaving, onEditMemo, onDeleteMemo,
  labels, readOnly = false, highlighted = false, collapsible = false,
}: Props) {
  const L = resolveCrmLabels(labels);
  const [open, setOpen] = useState(false);
  const [editingMemo, setEditingMemo] = useState(false);
  const [memoValue, setMemoValue] = useState(entry.raw_memo);
  const date = new Date(entry.created_at).toLocaleDateString(L.entryDateLocale, {
    year: 'numeric', month: 'long', day: 'numeric',
  });
  // 저장된 작성자 표기 중 입력 아티팩트(예: "2)이민재")의 앞 번호를 표시할 때만 제거. DB 값은 그대로.
  const authorDisplay = entry.author?.replace(/^\s*\d+\)\s*/, '').trim() || '';
  // 접이 모드가 아니면 항상 열림. 근거 메모로 점프해 강조된 항목은 강제로 열어준다.
  const isOpen = !collapsible || open || highlighted;
  // 접힌 상태에서 무슨 내용인지 짐작할 수 있게 첫 줄만 미리 보여준다.
  const preview = entry.raw_memo.split('\n')[0];

  return (
    <div
      id={`entry-${entry.id}`}
      className={`bg-white rounded-xl border overflow-hidden transition-shadow ${
        highlighted ? 'border-blue-400 ring-2 ring-blue-200' : 'border-gray-200'
      }`}
    >
      <div className="px-4 pt-3 pb-3">
        <div
          className={`flex items-center justify-between mb-1.5 ${collapsible ? 'cursor-pointer' : ''}`}
          onClick={collapsible ? () => setOpen(v => !v) : undefined}
        >
          <div className="flex items-center gap-1.5 text-[11px] text-gray-400 min-w-0">
            <span>{date}</span>
            {authorDisplay && (
              <>
                <span aria-hidden>·</span>
                <span className="flex items-center gap-0.5 text-gray-500 truncate" title={`${L.entryAuthorTitle}: ${authorDisplay}`}>
                  <User size={10} className="shrink-0" />
                  {authorDisplay}
                </span>
              </>
            )}
          </div>
          {collapsible && (
            <ChevronDown
              size={14}
              className={`shrink-0 text-gray-300 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            />
          )}
        </div>

        {/* 접힌 상태: 첫 줄만 미리보기 */}
        {collapsible && !isOpen && preview && (
          <p
            className="text-[12.5px] text-gray-500 leading-snug overflow-hidden"
            style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}
            onClick={() => setOpen(true)}
          >
            {preview}
          </p>
        )}

        {collapsible && !isOpen ? null : editingMemo ? (
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
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg text-xs font-semibold text-white transition-colors"
              >
                <Check size={12} />{memoSaving ? L.entrySaving : L.entrySave}
              </button>
              <button
                onClick={() => { setMemoValue(entry.raw_memo); setEditingMemo(false); }}
                disabled={memoSaving}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-400 hover:text-gray-600 border border-gray-200 rounded-lg transition-colors"
              >
                <X size={11} />{L.entryCancel}
              </button>
            </div>
          </div>
        ) : (
          <div className="group relative">
            {entry.raw_memo && (
              <p className="text-[13px] text-gray-700 leading-relaxed whitespace-pre-wrap" style={{ lineHeight: '1.7' }}>
                {entry.raw_memo}
              </p>
            )}
            {!readOnly && (
              <div className="mt-1.5 flex items-center gap-3">
                <button
                  onClick={() => { setMemoValue(entry.raw_memo); setEditingMemo(true); }}
                  className="flex items-center gap-1 text-[11px] text-gray-300 hover:text-gray-500 transition-colors"
                >
                  <Pencil size={10} />{L.entryEditMemo}
                </button>
                <button
                  onClick={onDeleteMemo}
                  className="flex items-center gap-1 text-[11px] text-gray-300 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={10} />{L.entryDeleteMemo}
                </button>
              </div>
            )}
          </div>
        )}
        {entry.attachments && entry.attachments.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {entry.attachments.map(att => (
              <AttachmentThumb key={att.path} studentId={studentId} adminKey={adminKey} attachment={att} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
