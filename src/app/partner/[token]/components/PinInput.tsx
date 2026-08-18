'use client';

import { useRef, useState, useCallback } from 'react';

interface Props {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
}

export function PinInput({ value, onChange, disabled, autoFocus }: Props) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
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
    onChange(arr.join('').slice(0, 6));
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

  return (
    <div className="flex gap-2 justify-center" onPaste={handlePaste}>
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
              style={{
                width: 44,
                height: 52,
                borderRadius: 4,
                border: `1.5px solid ${filled ? '#0075de' : '#e6e6e6'}`,
                background: filled ? '#f0f7ff' : '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'border-color 0.15s, background 0.15s',
                userSelect: 'none',
              }}
            >
              {isRevealed ? (
                <span style={{ color: '#0075de', fontWeight: 700, fontSize: 18 }}>{value[i]}</span>
              ) : filled ? (
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#0075de' }} />
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
