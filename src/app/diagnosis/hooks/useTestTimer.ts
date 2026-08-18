'use client';

import { useState, useEffect, useRef } from 'react';

export function useTestTimer(timeLimitMin: number | null, active: boolean) {
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeStartRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active) return;
    activeStartRef.current = Date.now();
    intervalRef.current = setInterval(() => setElapsed(prev => prev + 1), 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [active]);

  // 탭 전환 후 복귀 시 실제 경과 시간으로 보정 — interval throttle로 인한 자동 제출 누락 방지
  useEffect(() => {
    if (!active) return;
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && activeStartRef.current) {
        const corrected = Math.floor((Date.now() - activeStartRef.current) / 1000);
        const total = timeLimitMin ? timeLimitMin * 60 : Infinity;
        setElapsed(Math.min(corrected, total));
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [active, timeLimitMin]);

  const totalSeconds = timeLimitMin ? timeLimitMin * 60 : null;
  const remaining = totalSeconds ? Math.max(0, totalSeconds - elapsed) : null;
  const isWarning = remaining !== null && remaining <= 300 && remaining > 60;
  const isDanger = remaining !== null && remaining <= 60;

  const format = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return { elapsed, remaining, isWarning, isDanger, format };
}
