'use client';

import { useState, useEffect, useRef } from 'react';

export function useTestTimer(timeLimitMin: number | null, active: boolean) {
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!active) return;
    intervalRef.current = setInterval(() => setElapsed(prev => prev + 1), 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [active]);

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
