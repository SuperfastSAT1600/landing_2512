'use client';

import { useRef, useCallback, useEffect } from 'react';
import type React from 'react';

const SM_BREAKPOINT = 640;
const HEADER_HEIGHT = { mobile: 56, desktop: 64 };
const SCROLL_GAP = 16;

type ScrollMode = 'top' | 'peek-next' | 'center';

export function useScrollBehavior() {
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoScrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
      if (autoScrollTimerRef.current) clearTimeout(autoScrollTimerRef.current);
    };
  }, []);

  const scrollTo = useCallback((
    ref: React.RefObject<HTMLDivElement | null>,
    mode: ScrollMode = 'top',
    delay = 200,
  ) => {
    if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    scrollTimerRef.current = setTimeout(() => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const isMobile = window.innerWidth < SM_BREAKPOINT;
      const headerHeight = isMobile ? HEADER_HEIGHT.mobile : HEADER_HEIGHT.desktop;

      if (mode === 'peek-next') {
        const peekRatio = isMobile ? 0.75 : 0.82;
        const target = window.scrollY + rect.bottom - window.innerHeight * peekRatio;
        if (target > window.scrollY) {
          window.scrollTo({ top: target, behavior: 'smooth' });
        }
      } else if (mode === 'center') {
        const elCenter = window.scrollY + rect.top + rect.height / 2;
        const viewCenter = (window.innerHeight + headerHeight) / 2;
        window.scrollTo({ top: Math.max(0, elCenter - viewCenter), behavior: 'smooth' });
      } else {
        const offset = window.scrollY + rect.top - headerHeight - SCROLL_GAP;
        window.scrollTo({ top: Math.max(0, offset), behavior: 'smooth' });
      }
    }, delay);
  }, []);

  return { scrollTo, autoScrollTimerRef };
}
