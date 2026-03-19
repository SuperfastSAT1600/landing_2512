'use client';

import { useEffect, useState } from 'react';

const CHAPTERS = [
  { id: 'section-01', label: '전체 성적' },
  { id: 'section-02', label: '비교 성적' },
  { id: 'section-03', label: '풀이 패턴' },
  { id: 'section-04', label: '단어 상태' },
] as const;

function useScrollProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    function update() {
      const scrolled = window.scrollY;
      const total = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(total > 0 ? Math.min(scrolled / total, 1) : 0);
    }
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);

  return progress;
}

export function ChapterNav() {
  const [activeSection, setActiveSection] = useState<string>('section-01');
  const progress = useScrollProgress();

  useEffect(() => {
    const sections = CHAPTERS.map((c) => document.getElementById(c.id)).filter(Boolean) as HTMLElement[];
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) setActiveSection(visible[0].target.id);
      },
      { rootMargin: '-52px 0px -50% 0px', threshold: 0 },
    );

    sections.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  function scrollTo(id: string) {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <>
      {/* Progress bar — always at very top */}
      <div
        className="fixed top-0 left-0 right-0 z-50 print:hidden"
        style={{ height: 2, background: '#E2E8F0' }}
      >
        <div
          style={{
            height: '100%',
            width: `${progress * 100}%`,
            background: '#6085FF',
            transition: 'width 0.1s linear',
          }}
        />
      </div>

      {/* Mobile: fixed bottom tab bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 sm:hidden print:hidden"
        style={{
          background: 'white',
          borderTop: '1px solid #E2E8F0',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <div className="flex">
          {CHAPTERS.map((chapter) => {
            const isActive = activeSection === chapter.id;
            return (
              <button
                key={chapter.id}
                onClick={() => scrollTo(chapter.id)}
                className="flex-1 flex flex-col items-center justify-center transition-colors"
                style={{
                  paddingTop: 18,
                  paddingBottom: 18,
                  fontSize: 14,
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? '#09090b' : '#94A3B8',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  borderTop: isActive ? '2px solid #071be9' : '2px solid transparent',
                  gap: 2,
                }}
              >
                {chapter.label}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Desktop: fixed top bar */}
      <nav
        className="hidden sm:block fixed top-0 left-0 right-0 z-40 print:hidden"
        style={{
          background: 'white',
          borderBottom: '1px solid #E2E8F0',
        }}
      >
        <div className="max-w-3xl mx-auto px-6">
          <div className="flex items-center gap-2 py-2">
            <span className="text-xs font-bold text-slate-800 mr-2">SuperfastSAT</span>
            <span className="text-slate-300 text-xs mr-2">|</span>
            {CHAPTERS.map((chapter) => {
              const isActive = activeSection === chapter.id;
              return (
                <button
                  key={chapter.id}
                  onClick={() => scrollTo(chapter.id)}
                  className="flex-shrink-0 rounded-full transition-colors"
                  style={{
                    padding: '4px 14px',
                    fontSize: 12,
                    fontWeight: isActive ? 600 : 500,
                    background: isActive ? '#09090b' : '#F1F5F9',
                    color: isActive ? '#ffffff' : '#475569',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {chapter.label}
                </button>
              );
            })}
          </div>
        </div>
      </nav>
    </>
  );
}
