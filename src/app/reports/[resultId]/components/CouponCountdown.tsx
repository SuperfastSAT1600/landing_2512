'use client';

import { useState, useEffect } from 'react';

interface Props {
  discountPercent: number;
  expiresAt: string; // ISO datetime string
}

function getTimeLeft(expiresAt: string) {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return null;

  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return { days, hours, minutes, seconds };
}

export function CouponCountdown({ discountPercent, expiresAt }: Props) {
  const [timeLeft, setTimeLeft] = useState<ReturnType<typeof getTimeLeft>>(
    () => getTimeLeft(expiresAt),
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    setTimeLeft(getTimeLeft(expiresAt));
    const id = setInterval(() => {
      const tl = getTimeLeft(expiresAt);
      setTimeLeft(tl);
      if (!tl) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  if (!timeLeft) return null;

  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <div
      className="rounded-2xl p-6 text-center"
      style={{ background: 'linear-gradient(135deg, #071be9 0%, #1a31f0 100%)', color: 'white' }}
    >
      <p className="text-xs font-bold uppercase tracking-widest mb-1 opacity-80">
        한정 할인 혜택
      </p>
      <p className="text-3xl font-extrabold mb-1">
        {discountPercent}% OFF
      </p>
      <p className="text-sm opacity-80 mb-4">
        SuperfastSAT 수강료 특별 할인 — 지금 신청하세요
      </p>

      <div className="flex items-center justify-center gap-3">
        {timeLeft.days > 0 && (
          <>
            <div className="flex flex-col items-center">
              <span
                className="text-2xl font-bold rounded-lg px-3 py-1.5 min-w-[52px]"
                style={{ background: 'rgba(255,255,255,0.15)' }}
                suppressHydrationWarning
              >
                {pad(timeLeft.days)}
              </span>
              <span className="text-[10px] mt-1 opacity-70 uppercase tracking-wider">일</span>
            </div>
            <span className="text-xl font-bold opacity-60 mb-4">:</span>
          </>
        )}
        <div className="flex flex-col items-center">
          <span
            className="text-2xl font-bold rounded-lg px-3 py-1.5 min-w-[52px]"
            style={{ background: 'rgba(255,255,255,0.15)' }}
            suppressHydrationWarning
          >
            {pad(timeLeft.hours)}
          </span>
          <span className="text-[10px] mt-1 opacity-70 uppercase tracking-wider">시간</span>
        </div>
        <span className="text-xl font-bold opacity-60 mb-4">:</span>
        <div className="flex flex-col items-center">
          <span
            className="text-2xl font-bold rounded-lg px-3 py-1.5 min-w-[52px]"
            style={{ background: 'rgba(255,255,255,0.15)' }}
            suppressHydrationWarning
          >
            {pad(timeLeft.minutes)}
          </span>
          <span className="text-[10px] mt-1 opacity-70 uppercase tracking-wider">분</span>
        </div>
        <span className="text-xl font-bold opacity-60 mb-4">:</span>
        <div className="flex flex-col items-center">
          <span
            className="text-2xl font-bold rounded-lg px-3 py-1.5 min-w-[52px]"
            style={{ background: 'rgba(255,255,255,0.15)' }}
            suppressHydrationWarning
          >
            {pad(timeLeft.seconds)}
          </span>
          <span className="text-[10px] mt-1 opacity-70 uppercase tracking-wider">초</span>
        </div>
      </div>

      <p className="text-xs mt-4 opacity-60">
        만료: {new Date(expiresAt).toLocaleString('ko-KR')}
      </p>
    </div>
  );
}
