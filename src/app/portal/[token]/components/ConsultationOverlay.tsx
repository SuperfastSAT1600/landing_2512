'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface PublishedMemo {
  id: string;
  created_at: string;
  content: string;
}

interface Props {
  memos: PublishedMemo[];
  studentName: string;
  studentCreatedAt: string | null;
  blogLinkCount: number;
}

const ACCENT = '#6085FF';
const BG = '#09090b';

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

export default function ConsultationOverlay({ memos, studentName, studentCreatedAt, blogLinkCount }: Props) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto pt-12" style={{ background: '#F4F5F9' }}>

      {/* Dark cover */}
      <div className="relative overflow-hidden" style={{ background: BG }}>
        <div
          className="absolute inset-0 opacity-5 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle at 20% 50%, #6085FF 0%, transparent 50%), radial-gradient(circle at 80% 20%, #071be9 0%, transparent 40%)',
          }}
        />
        <div className="relative max-w-5xl mx-auto px-[6%] py-10 sm:py-16">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-px flex-1 max-w-[40px]" style={{ background: ACCENT }} />
            <p className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: ACCENT }}>상담 기록</p>
          </div>
          <h1
            className="text-white mb-1 leading-tight"
            style={{ fontSize: 'clamp(2rem, 6vw, 4.5rem)', fontWeight: 800, letterSpacing: '-0.02em' }}
          >
            {studentName} 학생
          </h1>
          {studentCreatedAt && (
            <p className="text-slate-400 text-sm mb-8">
              {new Date(studentCreatedAt).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })} 시작
            </p>
          )}
          {/* 2 cards — horizontal on all screen sizes */}
          <div className="flex flex-row gap-3">
            <div
              className="flex-1 flex flex-col items-center justify-center rounded-2xl px-4 py-5"
              style={{ background: 'rgba(96,133,255,0.12)', border: '1px solid rgba(96,133,255,0.3)' }}
            >
              <span className="text-5xl font-bold leading-none" style={{ color: ACCENT }}>{memos.length}</span>
              <span className="text-slate-300 text-xs mt-1.5 uppercase tracking-widest">총 상담 횟수</span>
            </div>
            <div
              className="flex-1 flex flex-col items-center justify-center rounded-2xl px-4 py-5"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              <span className="text-5xl font-bold leading-none text-white">{blogLinkCount}</span>
              <span className="text-slate-300 text-xs mt-1.5 uppercase tracking-widest">추천 학습 자료</span>
            </div>
          </div>
        </div>
      </div>

      {/* Light section */}
      <div style={{ background: '#F4F5F9' }}>
        <div className="max-w-5xl mx-auto px-[6%] py-8 pb-16">
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
    </div>
  );
}
