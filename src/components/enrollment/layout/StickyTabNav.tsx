'use client';

import { useEffect, useRef, useState } from 'react';

interface Tab {
  id: string;
  label: string;
  sectionId: string;
}

const TABS: Tab[] = [
  { id: 'showcase',  label: '관리형 서비스', sectionId: 'section-showcase' },
  { id: 'selection', label: '수업 선택',    sectionId: 'section-selection' },
  { id: 'summary',   label: '가격 확인',    sectionId: 'section-summary' },
];

export function StickyTabNav({ visible }: { visible: boolean }) {
  const [activeId, setActiveId] = useState<string>('showcase');
  const navRef = useRef<HTMLDivElement>(null);

  // 스크롤 스파이
  useEffect(() => {
    if (!visible) return;

    const handlers = TABS.map(({ id, sectionId }) => {
      const el = document.getElementById(sectionId);
      if (!el) return null;
      const observer = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActiveId(id); },
        { rootMargin: '-30% 0px -60% 0px' }
      );
      observer.observe(el);
      return observer;
    });

    return () => handlers.forEach(o => o?.disconnect());
  }, [visible]);

  if (!visible) return null;

  function scrollTo(sectionId: string) {
    const el = document.getElementById(sectionId);
    if (!el) return;
    const navHeight = navRef.current?.offsetHeight ?? 56;
    const headerHeight = 60;
    const y = el.getBoundingClientRect().top + window.scrollY - headerHeight - navHeight - 8;
    window.scrollTo({ top: y, behavior: 'smooth' });
  }

  return (
    <div
      ref={navRef}
      className="sticky top-[60px] z-30 bg-black/80 backdrop-blur-md border-b border-white/8"
      style={{ WebkitBackdropFilter: 'blur(12px)' }}
    >
      <div className="max-w-2xl mx-auto px-4">
        <div className="flex items-center justify-center gap-0">
          {TABS.map((tab) => {
            const active = activeId === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => scrollTo(tab.sectionId)}
                className={`
                  relative flex-1 max-w-[140px] py-3.5 text-xs font-semibold
                  transition-colors duration-200 touch-manipulation
                  ${active ? 'text-white' : 'text-white/40'}
                `}
              >
                {tab.label}
                {active && (
                  <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-accent rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
