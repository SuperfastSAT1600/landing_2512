'use client';

import { useRef } from 'react';
import { Loader2, Paperclip, X, FileText, Mic } from 'lucide-react';
import { SectionCard } from './SectionCard';
import type { StagedAttachment } from '../hooks/useMemoAttachments';
import { resolveCrmLabels, type CrmLabels } from '@/lib/crm-labels';

interface Props {
  memoText: string;
  setMemoText: (v: string) => void;
  savingMemo: boolean;
  memoError: string;
  setMemoError: (v: string) => void;
  onAddMemo: () => void;
  // 첨부
  staged: StagedAttachment[];
  onAddFiles: (files: File[]) => void;
  onRemoveAttachment: (localId: string) => void;
  attachmentsUploading: boolean;
  // Plaud 녹음 선택 모달 열기
  onOpenPlaud: () => void;
  /** 미지정 시 한글(기본). */
  labels?: Partial<CrmLabels>;
  /** true면 섹션을 기본 펼침으로 연다. */
  defaultOpen?: boolean;
}

export function MemoSection({
  memoText, setMemoText, savingMemo, memoError, setMemoError, onAddMemo,
  staged, onAddFiles, onRemoveAttachment, attachmentsUploading, onOpenPlaud,
  labels, defaultOpen = false,
}: Props) {
  const L = resolveCrmLabels(labels);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handlePaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const files = Array.from(e.clipboardData.files);
    if (files.length > 0) {
      e.preventDefault();
      onAddFiles(files);
    }
  }

  const canSave = (!!memoText.trim() || staged.some(s => s.path)) && !savingMemo && !attachmentsUploading;

  return (
    <SectionCard title={L.memoTitle} defaultOpen={defaultOpen}>
      <textarea
        value={memoText}
        onChange={e => { setMemoText(e.target.value); setMemoError(''); }}
        onPaste={handlePaste}
        placeholder={L.memoPlaceholder}
        rows={3}
        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 resize-y focus:outline-none focus:border-blue-400 min-h-[64px]"
      />

      {/* staged 첨부 미리보기 */}
      {staged.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {staged.map(att => (
            <div key={att.localId} className="relative group">
              {att.previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={att.previewUrl}
                  alt={att.name}
                  className={`h-20 w-20 rounded-lg border border-gray-200 object-cover ${att.uploading ? 'opacity-50' : ''}`}
                />
              ) : (
                <div className={`h-20 w-20 rounded-lg border border-gray-200 flex flex-col items-center justify-center gap-1 px-1 ${att.uploading ? 'opacity-50' : ''}`}>
                  <FileText size={20} className="text-gray-400" />
                  <span className="text-[9px] text-gray-500 truncate w-full text-center">{att.name}</span>
                </div>
              )}
              {att.uploading && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 size={18} className="animate-spin text-gray-600" />
                </div>
              )}
              {att.error && (
                <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-red-50/90 px-1">
                  <span className="text-[9px] text-red-500 text-center">{att.error}</span>
                </div>
              )}
              <button
                onClick={() => onRemoveAttachment(att.localId)}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-gray-800 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label={L.memoRemoveAttachment}
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {memoError && <p className="mt-1 text-xs text-red-500">{memoError}</p>}

      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-200 text-[13px] text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <Paperclip size={13} /> {L.memoAttachFile}
          </button>
          <button
            onClick={onOpenPlaud}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-blue-200 text-[13px] text-blue-600 hover:bg-blue-50 transition-colors"
          >
            <Mic size={13} /> {L.memoRecording}
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf"
          multiple
          className="hidden"
          onChange={e => {
            const files = Array.from(e.target.files ?? []);
            if (files.length > 0) onAddFiles(files);
            e.target.value = '';
          }}
        />
        <button
          onClick={onAddMemo}
          disabled={!canSave}
          className="px-4 py-1.5 bg-gray-900 hover:bg-gray-700 disabled:opacity-40 rounded-lg text-[13px] font-semibold text-white transition-colors"
        >
          {savingMemo ? L.memoSaving : attachmentsUploading ? L.memoUploading : L.memoSave}
        </button>
      </div>
    </SectionCard>
  );
}
