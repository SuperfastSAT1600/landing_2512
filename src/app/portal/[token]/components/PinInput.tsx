'use client';

import { useRef, useState, useCallback } from 'react';

interface Props {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  theme?: 'light' | 'dark';
}

export function PinInput({ value, onChange, disabled, autoFocus, theme = 'light' }: Props) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  // Track which index is briefly revealing its digit
  const [revealed, setRevealed] = useState<number | null>(null);
  const revealTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const revealBriefly = useCallback((index: number) => {
    if (revealTimer.current) clearTimeout(revealTimer.current);
    setRevealed(index);
    revealTimer.current = setTimeout(() => setRevealed(null), 700);
  }, []);

  function handleChange(index: number, ch: string) {
    const digit = ch.replace(/\D/g, '').slice(-1);
    if (!digit) return;
    const arr = value.split('');
    arr[index] = digit;
    const next = arr.join('').slice(0, 6);
    onChange(next);
    revealBriefly(index);
    if (index < 5) setTimeout(() => refs.current[index + 1]?.focus(), 0);
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace') {
      e.preventDefault();
      if (value[index]) {
        const arr = value.split(''); arr[index] = ''; onChange(arr.join(''));
      } else if (index > 0) {
        refs.current[index - 1]?.focus();
        const arr = value.split(''); arr[index - 1] = ''; onChange(arr.join(''));
      }
    } else if (e.key === 'ArrowLeft' && index > 0) refs.current[index - 1]?.focus();
    else if (e.key === 'ArrowRight' && index < 5) refs.current[index + 1]?.focus();
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    onChange(digits);
    refs.current[Math.min(digits.length, 5)]?.focus();
  }

  const isDark = theme === 'dark';

  return (
    <div className="flex gap-2.5 justify-center" onPaste={handlePaste}>
      {Array.from({ length: 6 }).map((_, i) => {
        const filled = !!value[i];
        const isRevealed = revealed === i && filled;

        return (
          <div key={i} className="relative">
            <input
              ref={el => { refs.current[i] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value=""
              autoFocus={autoFocus && i === 0}
              disabled={disabled}
              onChange={e => handleChange(i, e.target.value)}
              onKeyDown={e => handleKeyDown(i, e)}
              onFocus={e => e.target.select()}
              className="absolute inset-0 opacity-0 cursor-pointer"
              aria-label={`digit ${i + 1}`}
            />
            <div
              className={`w-11 h-13 flex items-center justify-center rounded-xl border-2 text-lg font-bold transition-all select-none
                ${filled
                  ? isDark
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-amber-400 bg-amber-50'
                  : isDark
                    ? 'border-zinc-700 bg-zinc-800/50'
                    : 'border-stone-200 bg-white/60'
                }
              `}
              style={{ width: 44, height: 52 }}
            >
              {isRevealed ? (
                <span className={isDark ? 'text-white' : 'text-stone-800'}>
                  {value[i]}
                </span>
              ) : filled ? (
                <div className={`w-2.5 h-2.5 rounded-full ${isDark ? 'bg-blue-400' : 'bg-amber-500'}`} />
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
