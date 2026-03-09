'use client';

import { useEffect, useState } from 'react';

const CHAPTERS = [
  { id: 'section-01', label: '01 전체 성적' },
  { id: 'section-02', label: '02 상위 10%' },
  { id: 'section-03', label: '03 풀이 패턴' },
  { id: 'section-04', label: '04 단어' },
] as const;

export function ChapterNav() {
  const [activeSection, setActiveSection] = useState<string>('section-01');

  useEffect(() => {
    const sections = CHAPTERS.map((c) => document.getElementById(c.id)).filter(Boolean) as HTMLElement[];
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Find the topmost intersecting section
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) {
          setActiveSection(visible[0].target.id);
        }
      },
      { rootMargin: '-96px 0px -50% 0px', threshold: 0 },
    );

    sections.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  function scrollTo(id: string) {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <div
      className="sticky z-20 print:hidden"
      style={{
        top: 48,
        background: 'white',
        borderBottom: '1px solid #E2E8F0',
      }}
    >
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <div
          className="flex gap-2 py-2 overflow-x-auto"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {CHAPTERS.map((chapter) => {
            const isActive = activeSection === chapter.id;
            return (
              <button
                key={chapter.id}
                onClick={() => scrollTo(chapter.id)}
                className="flex-shrink-0 rounded-full font-medium transition-colors"
                style={{
                  padding: '5px 14px',
                  fontSize: 12,
                  background: isActive ? '#09090b' : '#F1F5F9',
                  color: isActive ? '#ffffff' : '#475569',
                  fontWeight: isActive ? 600 : 500,
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
    </div>
  );
}
