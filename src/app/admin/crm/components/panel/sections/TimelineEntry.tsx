'use client';

import { useState } from 'react';
import { Check, Pencil, X } from 'lucide-react';
import type { ConsultationEntry } from '@/types/crm';
import { AttachmentThumb } from './AttachmentThumb';

interface PendingEdit { purified: string; coachHistory: string; deletedItems: string[] }

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
}

// 학부모 포털 노출(AI 변환) UI는 제거됨 — 원본 상담 메모 표시/수정만 담당.
// AI 관련 props는 호출부 계약 유지를 위해 인터페이스에는 남겨두되 사용하지 않는다.
export function TimelineEntry({ studentId, adminKey, entry, memoSaving, onEditMemo }: Props) {
  const [editingMemo, setEditingMemo] = useState(false);
  const [memoValue, setMemoValue] = useState(entry.raw_memo);
  const date = new Date(entry.created_at).toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-4 pt-3 pb-3">
        <div className="mb-1.5">
          <span className="text-[11px] text-gray-400">{date}</span>
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
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg text-xs font-semibold text-white transition-colors"
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
            {entry.raw_memo && (
              <p className="text-[13px] text-gray-700 leading-relaxed whitespace-pre-wrap" style={{ lineHeight: '1.7' }}>
                {entry.raw_memo}
              </p>
            )}
            <button
              onClick={() => { setMemoValue(entry.raw_memo); setEditingMemo(true); }}
              className="mt-1.5 flex items-center gap-1 text-[11px] text-gray-300 hover:text-gray-500 transition-colors"
            >
              <Pencil size={10} />원본 수정
            </button>
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
