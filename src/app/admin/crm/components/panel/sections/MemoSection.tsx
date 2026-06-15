'use client';

import { useRef } from 'react';
import { Mic, Square, Loader2, Paperclip, X, FileText } from 'lucide-react';
import { SectionCard } from './SectionCard';
import type { StagedAttachment } from '../hooks/useMemoAttachments';

interface Props {
  memoText: string;
  setMemoText: (v: string) => void;
  savingMemo: boolean;
  memoError: string;
  setMemoError: (v: string) => void;
  onAddMemo: () => void;
  // 통화 녹음
  recording: boolean;
  processing: boolean;
  elapsedSec: number;
  recordError: string;
  onToggleRecord: () => void;
  // 첨부
  staged: StagedAttachment[];
  onAddFiles: (files: File[]) => void;
  onRemoveAttachment: (localId: string) => void;
  attachmentsUploading: boolean;
}

function fmtElapsed(sec: number): string {
  const m = String(Math.floor(sec / 60)).padStart(2, '0');
  const s = String(sec % 60).padStart(2, '0');
  return `${m}:${s}`;
}

export function MemoSection({
  memoText, setMemoText, savingMemo, memoError, setMemoError, onAddMemo,
  recording, processing, elapsedSec, recordError, onToggleRecord,
  staged, onAddFiles, onRemoveAttachment, attachmentsUploading,
}: Props) {
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
    <SectionCard title="상담 메모" defaultOpen={false}>
      {/* 통화 녹음 → 자동 요약 (스피커폰 + 이 기기 마이크) */}
      <div className="mb-2 flex items-center gap-2">
        <button
          onClick={onToggleRecord}
          disabled={processing}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-semibold transition-colors disabled:opacity-40 ${
            recording
              ? 'bg-rose-600 hover:bg-rose-500 text-white'
              : 'border border-gray-200 text-gray-700 hover:bg-gray-50'
          }`}
        >
          {processing ? (
            <><Loader2 size={13} className="animate-spin" /> 정리 중…</>
          ) : recording ? (
            <><Square size={12} /> 정지 {fmtElapsed(elapsedSec)}</>
          ) : (
            <><Mic size={13} /> 통화 녹음</>
          )}
        </button>
        {recording && (
          <span className="flex items-center gap-1 text-[11px] text-rose-500">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" /> 녹음 중
          </span>
        )}
        {!recording && !processing && (
          <span className="text-[11px] text-gray-400">스피커폰으로 통화하면 자동 요약돼요</span>
        )}
      </div>
      {recordError && <p className="mb-2 text-xs text-red-500">{recordError}</p>}

      <textarea
        value={memoText}
        onChange={e => { setMemoText(e.target.value); setMemoError(''); }}
        onPaste={handlePaste}
        placeholder="상담 내용을 입력하세요... (캡처 이미지는 여기에 붙여넣기 Ctrl/⌘+V)"
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
                aria-label="첨부 삭제"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {memoError && <p className="mt-1 text-xs text-red-500">{memoError}</p>}

      <div className="flex items-center justify-between mt-2">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-200 text-[13px] text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <Paperclip size={13} /> 파일 첨부
        </button>
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
          {savingMemo ? '저장 중...' : attachmentsUploading ? '업로드 중...' : '메모 저장'}
        </button>
      </div>
    </SectionCard>
  );
}
