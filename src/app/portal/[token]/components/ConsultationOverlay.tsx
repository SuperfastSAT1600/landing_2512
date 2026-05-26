'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronDown, ChevronUp } from 'lucide-react';

interface PublishedMemo {
  id: string;
  created_at: string;
  content: string;
}

interface Props {
  memos: PublishedMemo[];
  studentName: string;
  onBack: () => void;
}

const ACCENT = '#6085FF';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
}

function MemoItem({ memo }: { memo: PublishedMemo }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-2xl overflow-hidden bg-white" style={{ border: '1px solid #E2E8F0' }}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left transition-colors hover:bg-slate-50"
      >
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: ACCENT }} />
          <span className="text-sm font-medium text-slate-700">{formatDate(memo.created_at)}</span>
        </div>
        {open
          ? <ChevronUp size={14} className="text-slate-400 flex-shrink-0" />
          : <ChevronDown size={14} className="text-slate-400 flex-shrink-0" />
        }
      </button>

      {open && (
        <div className="px-5 pb-5 pt-1">
          <div className="h-px mb-4" style={{ background: '#E2E8F0' }} />
          <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{memo.content}</p>
        </div>
      )}
    </div>
  );
}

export default function ConsultationOverlay({ memos, studentName, onBack }: Props) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" style={{ background: '#F4F5F9' }}>

      {/* Sticky top bar */}
      <div className="sticky top-0 z-10 bg-white" style={{ borderBottom: '1px solid #E2E8F0' }}>
        <div className="max-w-2xl mx-auto px-[6%] h-12 flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ChevronLeft size={16} />
            상담 리포트
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo_header.png" alt="SuperfastSAT" className="h-4 w-auto" />
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-[6%] pt-8 pb-16">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px w-6" style={{ background: ACCENT }} />
            <p className="text-xs font-bold uppercase tracking-[0.15em]" style={{ color: ACCENT }}>상담 기록</p>
          </div>
          <h2 className="text-2xl font-bold text-slate-900" style={{ letterSpacing: '-0.02em' }}>
            누적 상담 기록
          </h2>
          {memos.length > 0 && (
            <p className="text-slate-400 text-sm mt-1">총 {memos.length}회</p>
          )}
        </div>

        {memos.length === 0 ? (
          <div className="rounded-2xl px-5 py-10 text-center bg-white" style={{ border: '1px solid #E2E8F0' }}>
            <p className="text-slate-400 text-sm">아직 공유된 상담 내용이 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {memos.map(memo => (
              <MemoItem key={memo.id} memo={memo} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
