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
  onBack: () => void;
}

const ACCENT = '#6085FF';
const BG = '#09090b';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
}

function MemoItem({ memo }: { memo: PublishedMemo }) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left transition-colors hover:bg-white/5"
      >
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: ACCENT }} />
          <span className="text-sm font-medium text-slate-200">{formatDate(memo.created_at)}</span>
        </div>
        {open
          ? <ChevronUp size={14} className="text-slate-500 flex-shrink-0" />
          : <ChevronDown size={14} className="text-slate-500 flex-shrink-0" />
        }
      </button>

      {open && (
        <div className="px-5 pb-5 pt-1">
          <div className="h-px mb-4" style={{ background: 'rgba(255,255,255,0.06)' }} />
          <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{memo.content}</p>
        </div>
      )}
    </div>
  );
}

export default function ConsultationOverlay({ memos, onBack }: Props) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" style={{ background: BG }}>
      {/* Ambient glow */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 20% 0%, rgba(96,133,255,0.06) 0%, transparent 60%)',
        }}
      />

      {/* Sticky top bar */}
      <div
        className="sticky top-0 z-10"
        style={{ background: 'rgba(9,9,11,0.85)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="max-w-2xl mx-auto px-[6%] h-12 flex items-center">
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-sm text-slate-400 hover:text-white transition-colors"
          >
            <ChevronLeft size={16} />
            상담 리포트
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="relative max-w-2xl mx-auto px-[6%] pt-8 pb-16">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px w-6" style={{ background: ACCENT }} />
            <p className="text-xs font-bold uppercase tracking-[0.15em]" style={{ color: ACCENT }}>상담 기록</p>
          </div>
          <h2 className="text-2xl font-bold text-white" style={{ letterSpacing: '-0.02em' }}>
            누적 상담 기록
          </h2>
          {memos.length > 0 && (
            <p className="text-slate-500 text-sm mt-1">총 {memos.length}회</p>
          )}
        </div>

        {memos.length === 0 ? (
          <div
            className="rounded-2xl px-5 py-10 text-center"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <p className="text-slate-500 text-sm">아직 공유된 상담 내용이 없습니다.</p>
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
