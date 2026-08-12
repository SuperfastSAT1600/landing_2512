'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, BookOpen, Check } from 'lucide-react';
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
  onPrev?: () => void;
  onNext?: () => void;
  currentIndex?: number;
  total?: number;
}

const REQUESTED_KEY = 'mathweb_requested';

function getRequested(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(REQUESTED_KEY) ?? '[]')); }
  catch { return new Set(); }
}

function saveRequested(set: Set<string>) {
  localStorage.setItem(REQUESTED_KEY, JSON.stringify([...set]));
}

export function FlashcardModal({ problem, flipped, onFlip, onClose, onPrev, onNext, currentIndex, total }: FlashcardModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [requested, setRequested] = useState<Set<string>>(new Set());
  const [requesting, setRequesting] = useState(false);

  useEffect(() => { setRequested(getRequested()); }, []);

  const handleRequest = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!problem || requesting || requested.has(problem.id)) return;
    setRequesting(true);
    try {
      await fetch(`/api/mathweb/problems/${problem.id}/request-explanation`, { method: 'POST' });
      const next = new Set(requested);
      next.add(problem.id);
      setRequested(next);
      saveRequested(next);
    } finally {
      setRequesting(false);
    }
  }, [problem, requested, requesting]);

  useEffect(() => {
    if (!problem) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') onPrev?.();
      if (e.key === 'ArrowRight') onNext?.();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [problem, onClose, onPrev, onNext]);

  if (!problem) return null;

  const hasNav = onPrev && onNext && total && total > 1;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className="relative" style={{ perspective: '1200px', width: '76vw', maxWidth: 560, height: '70vh', maxHeight: 600 }}>

        {/* 이전 버튼 */}
        {hasNav && (
          <button
            onClick={(e) => { e.stopPropagation(); onPrev?.(); }}
            className="absolute -left-12 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white hover:border-zinc-500 transition-all"
            aria-label="이전 문제"
          >
            <ChevronLeft size={18} />
          </button>
        )}

        {/* 다음 버튼 */}
        {hasNav && (
          <button
            onClick={(e) => { e.stopPropagation(); onNext?.(); }}
            className="absolute -right-12 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white hover:border-zinc-500 transition-all"
            aria-label="다음 문제"
          >
            <ChevronRight size={18} />
          </button>
        )}

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
            className="absolute inset-0 bg-[#0d0d10] border border-zinc-500/50 rounded-2xl overflow-hidden flex flex-col shadow-[0_0_32px_rgba(96,133,255,0.12),0_0_0_1px_rgba(255,255,255,0.06)]"
            style={{ backfaceVisibility: 'hidden' }}
          >
            {/* 상단 힌트 + 인덱스 */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-700/60 shrink-0 bg-zinc-900/40">
              <span className="text-zinc-300 text-sm font-medium">🙌 탭하여 답 보기</span>
              {hasNav && (
                <span className="text-zinc-600 text-xs tabular-nums">{(currentIndex ?? 0) + 1} / {total}</span>
              )}
            </div>

            {/* 문제 본문 */}
            <div className="flex-1 overflow-y-auto">
              {problem.question_image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={problem.question_image_url}
                  alt="문제"
                  className="w-full h-full object-contain"
                  loading="lazy"
                />
              ) : problem.question_html ? (
                <div className="p-5 flex flex-col gap-5">
                  <ContentRenderer
                    content={problem.question_html}
                    className="text-zinc-100 text-[15px] leading-relaxed mathweb-html"
                  />
                  {problem.options_json && problem.options_json.length > 0 && (
                    <ol className="flex flex-col gap-2.5">
                      {problem.options_json.map((opt) => (
                        <li key={opt.label} className="flex gap-3 items-start">
                          <span className="shrink-0 w-6 h-6 rounded-full bg-zinc-800 border border-zinc-600 flex items-center justify-center text-[11px] font-semibold text-zinc-300 mt-0.5">
                            {opt.label}
                          </span>
                          <ContentRenderer
                            content={opt.text}
                            className="mathweb-html flex-1 text-[14px] text-zinc-200 leading-relaxed"
                          />
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              ) : null}
            </div>

            {/* 하단 태그 */}
            <div className="px-4 py-3 border-t border-zinc-800 flex flex-wrap items-center gap-1.5">
              {problem.difficulty && DIFFICULTY_LABEL[problem.difficulty] && (
                <span
                  className="px-2 py-0.5 text-xs rounded-full font-medium"
                  style={{
                    color: DIFFICULTY_LABEL[problem.difficulty].color,
                    backgroundColor: DIFFICULTY_LABEL[problem.difficulty].color + '18',
                    border: `1px solid ${DIFFICULTY_LABEL[problem.difficulty].color}40`,
                  }}
                >
                  {DIFFICULTY_LABEL[problem.difficulty].label}
                </span>
              )}
              {problem.concepts.map(c => (
                <span key={c.id} className="px-2 py-0.5 bg-indigo-950/60 text-indigo-300 text-xs rounded-full border border-indigo-800/40">{c.name}</span>
              ))}
              {problem.memo && <p className="w-full text-zinc-600 text-xs mt-1">{problem.memo}</p>}
            </div>
          </div>

          {/* Back — answer */}
          <div
            className="absolute inset-0 bg-[#0d0d10] border border-zinc-500/50 rounded-2xl overflow-hidden flex flex-col items-center justify-center shadow-[0_0_32px_rgba(96,133,255,0.12),0_0_0_1px_rgba(255,255,255,0.06)]"
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
                <p className="text-white text-6xl font-bold leading-relaxed text-center whitespace-pre-wrap">
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
              <p className="text-zinc-500 text-base">답이 아직 등록되지 않았어요.</p>
            )}
            {hasNav && (
              <span className="absolute top-3 right-4 text-zinc-700 text-xs tabular-nums">{(currentIndex ?? 0) + 1} / {total}</span>
            )}

            {/* 해설 신청 버튼 */}
            {problem && (() => {
              const isRequested = requested.has(problem.id);
              return (
                <button
                  onClick={handleRequest}
                  disabled={isRequested || requesting}
                  className={`absolute bottom-10 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    isRequested
                      ? 'bg-emerald-900/40 border border-emerald-700/50 text-emerald-400 cursor-default'
                      : 'bg-indigo-900/40 border border-indigo-600/50 text-indigo-300 hover:bg-indigo-800/50 hover:text-white active:scale-95'
                  }`}
                >
                  {isRequested
                    ? <><Check size={14} /> 해설 신청 완료</>
                    : <><BookOpen size={14} /> {requesting ? '신청 중...' : '해설 신청하기'}</>
                  }
                </button>
              );
            })()}

            <p className="absolute bottom-3 text-zinc-700 text-xs">탭하여 문제로 돌아가기</p>
          </div>
        </div>

        {/* Close button */}
        <button
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          className="absolute -top-3 -right-3 z-10 w-8 h-8 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
          aria-label="닫기"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
