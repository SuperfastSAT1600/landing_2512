'use client';

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export interface Problem {
  id: string;
  title: string | null;
  question_image_url: string;
  answer_image_url: string | null;
  memo: string | null;
  concepts: { id: string; name: string; slug: string }[];
}

interface FlashcardModalProps {
  problem: Problem | null;
  flipped: boolean;
  onFlip: () => void;
  onClose: () => void;
}

export function FlashcardModal({ problem, flipped, onFlip, onClose }: FlashcardModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!problem) return;
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [problem, onClose]);

  if (!problem) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className="relative" style={{ perspective: '1200px', width: '90vw', maxWidth: 640, height: '80vh', maxHeight: 700 }}>
        {/* Flip container */}
        <div
          className="w-full h-full cursor-pointer"
          style={{
            transformStyle: 'preserve-3d',
            transition: 'transform 0.5s ease',
            transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          }}
          onClick={onFlip}
        >
          {/* Front — question */}
          <div
            className="absolute inset-0 bg-[#09090b] border border-white/10 rounded-2xl overflow-hidden flex flex-col"
            style={{ backfaceVisibility: 'hidden' }}
          >
            <div className="flex-1 relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={problem.question_image_url}
                alt="문제"
                className="w-full h-full object-contain"
                loading="lazy"
              />
            </div>
            <div className="p-4 border-t border-white/5 space-y-2">
              {problem.memo && <p className="text-gray-400 text-sm">{problem.memo}</p>}
              <div className="flex flex-wrap gap-2">
                {problem.concepts.map(c => (
                  <span key={c.id} className="px-2 py-1 bg-[#071be9]/20 text-[#6085FF] text-xs rounded-full">{c.name}</span>
                ))}
              </div>
              <p className="text-gray-600 text-xs text-center">탭하여 답 보기</p>
            </div>
          </div>

          {/* Back — answer */}
          <div
            className="absolute inset-0 bg-[#09090b] border border-white/10 rounded-2xl overflow-hidden flex flex-col items-center justify-center"
            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
          >
            {problem.answer_image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={problem.answer_image_url}
                alt="답"
                className="w-full h-full object-contain"
                loading="lazy"
              />
            ) : (
              <p className="text-gray-500 text-base">답이 아직 등록되지 않았어요.</p>
            )}
            <p className="absolute bottom-4 text-gray-600 text-xs">탭하여 문제로 돌아가기</p>
          </div>
        </div>

        {/* Close button */}
        <button
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          className="absolute -top-3 -right-3 z-10 w-8 h-8 rounded-full bg-[#09090b] border border-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
          aria-label="닫기"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
