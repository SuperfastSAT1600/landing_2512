'use client';

import { useCallback, useEffect, useState } from 'react';
import { SECTIONS, brand } from './theme';
import { Hero } from './sections/Hero';
import { WhyUs } from './sections/WhyUs';
import { Team } from './sections/Team';
import { ScreenConsole } from './sections/ScreenConsole';
import { ScreenRecord } from './sections/ScreenRecord';
import { ScreenApplications } from './sections/ScreenApplications';
import { ScreenAdvisor } from './sections/ScreenAdvisor';
import { Roadmap } from './sections/Roadmap';
import { NextStep } from './sections/NextStep';

export function NewtonDemoClient() {
  // 근거 노트 칩 → 학생 기록의 해당 노트로 점프할 때 쓰는 공유 상태.
  const [highlightNoteId, setHighlightNoteId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string>('intro');

  const jumpToNote = useCallback((noteId: string) => {
    setHighlightNoteId(noteId);
    // 타임라인이 접혀 있을 수 있으므로 펼침 신호를 먼저 보내고 다음 프레임에 스크롤한다.
    window.dispatchEvent(new CustomEvent('newton-demo:open-timeline'));
    requestAnimationFrame(() => {
      document.getElementById(`entry-${noteId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }, []);

  // 스크롤 위치에 따라 상단 네비의 현재 섹션을 표시한다.
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        const visible = entries.filter(e => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: '-45% 0px -45% 0px', threshold: [0, 0.25, 0.5] }
    );
    for (const s of SECTIONS) {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  return (
    <main className="min-h-screen bg-white" style={{ color: '#1f2430' }}>
      <nav className="sticky top-0 z-40 border-b border-gray-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-3 sm:px-10">
          <span className="shrink-0 font-serif text-[15px] tracking-[0.18em]" style={{ color: brand.primary }}>
            EDUMO
          </span>
          <ul className="flex min-w-0 flex-1 items-center justify-end gap-1 overflow-x-auto text-[12px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {SECTIONS.map(s => (
              <li key={s.id} className="shrink-0">
                <a
                  href={`#${s.id}`}
                  className="inline-block rounded-full px-3 py-2 transition-colors sm:px-2.5 sm:py-1.5"
                  style={
                    activeId === s.id
                      ? { color: '#fff', background: brand.primary }
                      : { color: '#8a8f9c' }
                  }
                >
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      <Hero />
      <WhyUs />
      <Team />
      <ScreenConsole />
      <ScreenRecord highlightNoteId={highlightNoteId} />
      <ScreenApplications />
      <ScreenAdvisor onJumpToNote={jumpToNote} />
      <Roadmap />
      <NextStep />
    </main>
  );
}
