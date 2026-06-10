'use client';

import { Mic, Square, Loader2 } from 'lucide-react';
import { SectionCard } from './SectionCard';

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
}

function fmtElapsed(sec: number): string {
  const m = String(Math.floor(sec / 60)).padStart(2, '0');
  const s = String(sec % 60).padStart(2, '0');
  return `${m}:${s}`;
}

export function MemoSection({
  memoText, setMemoText, savingMemo, memoError, setMemoError, onAddMemo,
  recording, processing, elapsedSec, recordError, onToggleRecord,
}: Props) {
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
        placeholder="상담 내용을 입력하세요..."
        rows={3}
        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 resize-y focus:outline-none focus:border-blue-400 min-h-[64px]"
      />
      {memoError && <p className="mt-1 text-xs text-red-500">{memoError}</p>}
      <div className="flex justify-end mt-2">
        <button
          onClick={onAddMemo}
          disabled={!memoText.trim() || savingMemo}
          className="px-4 py-1.5 bg-gray-900 hover:bg-gray-700 disabled:opacity-40 rounded-lg text-[13px] font-semibold text-white transition-colors"
        >
          {savingMemo ? '저장 중...' : '메모 저장'}
        </button>
      </div>
    </SectionCard>
  );
}
