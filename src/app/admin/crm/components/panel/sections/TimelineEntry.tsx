'use client';

import { useState } from 'react';
import { Check, Pencil, Sparkles, Trash2, User, X } from 'lucide-react';
import type { ConsultationEntry } from '@/types/crm';
import { AttachmentThumb } from './AttachmentThumb';

interface PendingEdit {
  purified: string;
  coachHistory: string;
  deletedItems: string[];
}
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
  onUnpublish: () => void;
  onChangePurified: (v: string) => void;
  onStartEdit: () => void;
  onDeleteAi: () => void;
  onEditMemo: (newMemo: string) => Promise<boolean>;
  onDeleteMemo: () => void;
}

export function TimelineEntry({
  studentId,
  adminKey,
  entry,
  aiLoading,
  pendingEdit,
  publishing,
  memoSaving,
  onAiCare,
  onPublish,
  onUnpublish,
  onChangePurified,
  onStartEdit,
  onDeleteAi,
  onEditMemo,
  onDeleteMemo,
}: Props) {
  const [editingMemo, setEditingMemo] = useState(false);
  const [memoValue, setMemoValue] = useState(entry.raw_memo);
  const date = new Date(entry.created_at).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const hasPublic = Boolean(entry.ai_purified?.trim());
  const author = entry.author?.replace(/^\s*\d+\)\s*/, '').trim();
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-4 pt-3 pb-3">
        <div className="flex items-center justify-between mb-2 text-[11px] text-gray-400">
          <div className="flex items-center gap-1.5">
            <span>{date}</span>
            {author && (
              <>
                <span>·</span>
                <span className="flex items-center gap-0.5">
                  <User size={10} />
                  {author}
                </span>
              </>
            )}
          </div>
          <span className={entry.published ? 'text-emerald-600' : 'text-gray-400'}>
            {entry.published ? '학부모 공개 중' : '내부 전용'}
          </span>
        </div>
        {editingMemo ? (
          <div>
            <textarea
              value={memoValue}
              onChange={(e) => setMemoValue(e.target.value)}
              rows={6}
              className="w-full text-[13px] text-gray-800 border rounded-lg px-3 py-2 resize-y"
            />
            <div className="flex gap-2 mt-2">
              <button
                onClick={async () => {
                  if (await onEditMemo(memoValue)) setEditingMemo(false);
                }}
                disabled={memoSaving}
                className="px-3 py-1.5 bg-blue-600 rounded-lg text-xs text-white"
              >
                <Check size={12} />
                {memoSaving ? '저장 중...' : '저장'}
              </button>
              <button
                onClick={() => {
                  setMemoValue(entry.raw_memo);
                  setEditingMemo(false);
                }}
                disabled={memoSaving}
                className="px-2.5 py-1.5 text-xs text-gray-400 border rounded-lg"
              >
                <X size={11} />
                취소
              </button>
            </div>
          </div>
        ) : (
          <div>
            {entry.raw_memo && (
              <p className="text-[13px] text-gray-700 leading-relaxed whitespace-pre-wrap">
                {entry.raw_memo}
              </p>
            )}
            <div className="mt-1.5 flex gap-3">
              <button onClick={() => setEditingMemo(true)} className="text-[11px] text-gray-400">
                <Pencil size={10} />
                원본 수정
              </button>
              <button
                onClick={onDeleteMemo}
                className="text-[11px] text-gray-400 hover:text-red-500"
              >
                <Trash2 size={10} />
                메모 삭제
              </button>
            </div>
          </div>
        )}
        {entry.attachments?.length ? (
          <div className="mt-2 flex flex-wrap gap-2">
            {entry.attachments.map((att) => (
              <AttachmentThumb
                key={att.path}
                studentId={studentId}
                adminKey={adminKey}
                attachment={att}
              />
            ))}
          </div>
        ) : null}
      </div>
      <div className="border-t border-gray-100 px-4 py-3 bg-gray-50">
        <p className="text-[11px] font-medium text-purple-500 flex items-center gap-1 mb-2">
          <Sparkles size={11} />
          학부모 공개본
        </p>
        {aiLoading && <p className="text-xs text-gray-400">AI 초안 생성 중...</p>}
        {!aiLoading && pendingEdit && (
          <>
            <textarea
              value={pendingEdit.purified}
              onChange={(e) => onChangePurified(e.target.value)}
              rows={4}
              className="w-full text-[13px] border rounded-lg px-3 py-2 resize-y"
            />
            <div className="flex gap-2 mt-2">
              <button
                onClick={onPublish}
                disabled={publishing}
                className="px-3 py-1.5 bg-emerald-600 rounded-lg text-xs text-white"
              >
                <Check size={12} />
                공개 적용
              </button>
              <button
                onClick={onAiCare}
                disabled={publishing}
                className="px-2.5 py-1.5 text-xs text-gray-400 border rounded-lg"
              >
                <Sparkles size={11} />
                재생성
              </button>
            </div>
          </>
        )}
        {!aiLoading && !pendingEdit && hasPublic && (
          <>
            <p className="text-[13px] text-gray-600 leading-relaxed whitespace-pre-wrap">
              {entry.ai_purified}
            </p>
            <div className="flex gap-3 mt-2">
              <button onClick={onStartEdit} className="text-xs text-gray-400">
                <Pencil size={11} />
                수정
              </button>
              {entry.published && (
                <button onClick={onUnpublish} className="text-xs text-gray-400">
                  공개 해제
                </button>
              )}
              <button onClick={onDeleteAi} className="text-xs text-red-400">
                <Trash2 size={11} />
                삭제
              </button>
            </div>
          </>
        )}
        {!aiLoading && !pendingEdit && !hasPublic && (
          <button
            onClick={onAiCare}
            disabled={!entry.raw_memo}
            className="text-xs text-purple-500 disabled:opacity-40"
          >
            <Sparkles size={11} />✨ AI 초안 생성
          </button>
        )}
      </div>
    </div>
  );
}
