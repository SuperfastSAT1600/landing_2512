'use client';

import React from 'react';
import { Users, UserCheck, MonitorPlay } from 'lucide-react';
import { Badge } from '@/components/enrollment/ui/Badge';
import { useScrollReveal } from '@/hooks/enrollment/useScrollReveal';
import { SectionHeader } from './SectionHeader';
import { CLASS_FORMATS_V2 } from '@/lib/enrollment/data/pricing-v2';
import type { ClassFormatV2 } from '@/types/enrollment-v2';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  UserCheck,
  Users,
  MonitorPlay,
};

interface ClassFormatSectionV2Props {
  classFormat: ClassFormatV2 | null;
  onSelect: (format: ClassFormatV2) => void;
  sectionNumber: number;
}

export const ClassFormatSectionV2 = React.forwardRef<HTMLDivElement, ClassFormatSectionV2Props>(
  function ClassFormatSectionV2({ classFormat, onSelect, sectionNumber }, ref) {
    const gridRef = useScrollReveal(0.05);

    return (
      <section
        ref={ref}
        id="section-format"
        className="max-w-2xl mx-auto px-4 pb-10 sm:pb-16 animate-fade-in scroll-mt-24"
      >
        <SectionHeader number={sectionNumber} title="수업 형태 선택" />

        {/* 모바일: 1열 / 데스크톱: 3열 */}
        <div ref={gridRef} className="reveal-children flex flex-col sm:grid sm:grid-cols-3 gap-3">
          {CLASS_FORMATS_V2.map((cf, i) => {
            const Icon = ICON_MAP[cf.icon];
            const selected = classFormat === cf.id;
            return (
              <div
                key={cf.id}
                className="reveal-item"
                style={{ '--stagger': i } as React.CSSProperties}
              >
                <button
                  type="button"
                  onClick={() => onSelect(cf.id)}
                  className={`
                    card-selectable w-full text-left rounded-card border p-4 sm:p-5
                    transition-all touch-manipulation
                    ${selected
                      ? 'selected border-accent/50 bg-accent/8'
                      : 'border-white/8 bg-clay-solid hover:border-white/15'
                    }
                  `}
                >
                  {/* 모바일: 가로 배치 / 데스크톱: 세로 배치 */}
                  <div className="flex sm:flex-col items-start gap-3 sm:gap-3">
                    <div className="flex-shrink-0 flex items-center justify-between sm:w-full">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center
                        ${selected ? 'bg-accent/20' : 'bg-accent-glow/12'}`}
                      >
                        {Icon && <Icon className={`w-5 h-5 ${selected ? 'text-accent' : 'text-accent-glow'}`} />}
                      </div>
                      {cf.recommended && (
                        <Badge variant="primary" className="sm:hidden">추천</Badge>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-white text-sm sm:text-base leading-tight">
                          {cf.name}
                        </span>
                        {cf.recommended && (
                          <Badge variant="primary" className="hidden sm:inline-flex">추천</Badge>
                        )}
                      </div>
                      <p className="text-xs text-white/55 leading-relaxed whitespace-pre-line">
                        {cf.description}
                      </p>
                    </div>

                    {/* 모바일 선택 표시 */}
                    <div className={`flex-shrink-0 w-5 h-5 rounded-full border-2 sm:hidden flex items-center justify-center
                      ${selected ? 'border-accent bg-accent' : 'border-white/20'}`}
                    >
                      {selected && (
                        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                          <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      </section>
    );
  }
);
