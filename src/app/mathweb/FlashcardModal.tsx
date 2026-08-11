'use client';

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { ContentRenderer } from '@/app/diagnosis/components/ContentRenderer';

export interface Option {
  label: string;
  text: string;
}

export interface Problem {
  id: string;
  title: string | null;
  question_image_url: string | null;
  question_html: string | null;
  options_json: Option[] | null;
  answer_image_url: string | null;
  answer_text: string | null;
  memo: string | null;
  difficulty: string | null;
  concepts: { id: string; name: string; slug: string }[];
}

const DIFFICULTY_LABEL: Record<string, { label: string; color: string }> = {
  easy:   { label: 'Easy',   color: '#22c55e' },
  medium: { label: 'Medium', color: '#f59e0b' },
  hard:   { label: 'Hard',   color: '#ef4444' },
  killer: { label: 'Killer', color: '#c084fc' },
};

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
      <div className="relative" style={{ perspective: '1200px', width: '72vw', maxWidth: 520, height: '65vh', maxHeight: 560 }}>
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
            <p className="text-gray-600 text-xs text-center py-2 border-b border-white/5 shrink-0">탭하여 답 보기</p>
            <div className="flex-1 relative overflow-y-auto">
              {problem.question_image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={problem.question_image_url}
                  alt="문제"
                  className="w-full h-full object-contain"
                  loading="lazy"
                />
              ) : problem.question_html ? (
                <div className="p-6 flex flex-col gap-5">
                  <ContentRenderer
                    content={problem.question_html}
                    className="text-white text-sm mathweb-html"
                  />
                  {problem.options_json && problem.options_json.length > 0 && (
                    <ol className="flex flex-col gap-2">
                      {problem.options_json.map((opt) => (
                        <li key={opt.label} className="flex gap-3 text-sm text-gray-300">
                          <span className="shrink-0 w-6 h-6 rounded-full border border-white/20 flex items-center justify-center text-xs text-gray-400 mt-0.5">
                            {opt.label}
                          </span>
                          <ContentRenderer
                            content={opt.text}
                            className="mathweb-html flex-1"
                          />
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              ) : null}
            </div>
            <div className="p-4 border-t border-white/5 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                {problem.difficulty && DIFFICULTY_LABEL[problem.difficulty] && (
                  <span
                    className="px-2 py-1 text-xs rounded-full font-medium"
                    style={{
                      color: DIFFICULTY_LABEL[problem.difficulty].color,
                      backgroundColor: DIFFICULTY_LABEL[problem.difficulty].color + '18',
                      border: `1px solid ${DIFFICULTY_LABEL[problem.difficulty].color}33`,
                    }}
                  >
                    {DIFFICULTY_LABEL[problem.difficulty].label}
                  </span>
                )}
                {problem.concepts.map(c => (
                  <span key={c.id} className="px-2 py-1 bg-[#071be9]/20 text-[#6085FF] text-xs rounded-full">{c.name}</span>
                ))}
              </div>
              {problem.memo && <p className="text-gray-500 text-xs">{problem.memo}</p>}
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
            ) : problem.answer_text ? (
              <div className="flex-1 flex items-center justify-center p-8">
                <p className="text-white text-lg leading-relaxed text-center whitespace-pre-wrap">
                  {(() => {
                    try {
                      const parsed = JSON.parse(problem.answer_text!);
                      if (Array.isArray(parsed)) return parsed.join(' / ');
                    } catch { /* not JSON */ }
                    return problem.answer_text;
                  })()}
                </p>
              </div>
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
