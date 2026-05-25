'use client';

import { useState, useRef } from 'react';

interface Props {
  token: string;
  onSuccess: () => void;
  onLocked: () => void;
}

function PinInput({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  function handleChange(index: number, ch: string) {
    const digit = ch.replace(/\D/g, '').slice(-1);
    const arr = value.split('');
    arr[index] = digit;
    onChange(arr.join('').slice(0, 6));
    if (digit && index < 5) refs.current[index + 1]?.focus();
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace') {
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
      {Array.from({ length: 6 }).map((_, i) => (
        <input
          key={i}
          ref={el => { refs.current[i] = el; }}
          type="password"
          inputMode="numeric"
          maxLength={1}
          value={value[i] ?? ''}
          autoFocus={i === 0}
          disabled={disabled}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKeyDown(i, e)}
          onFocus={e => e.target.select()}
          className="w-10 h-12 border-2 border-stone-200 rounded-lg text-center text-lg font-bold focus:border-amber-400 focus:outline-none disabled:opacity-40 transition-colors bg-white/80"
        />
      ))}
    </div>
  );
}

export default function PasscodeEntry({ token, onSuccess, onLocked }: Props) {
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (passcode.length !== 6) return;
    setError('');
    setLoading(true);

    const res = await fetch(`/api/portal/${token}/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'verify', passcode }),
    });
    setLoading(false);

    if (res.ok) { onSuccess(); return; }
    const data = await res.json().catch(() => ({}));
    if (res.status === 429 || data.locked) { onLocked(); return; }
    setError(data.error ?? '오류가 발생했습니다');
    setPasscode('');
  }

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-stone-200/60 p-6 shadow-sm">
      <h2 className="text-base font-bold text-stone-800 mb-1 text-center">비밀번호 입력</h2>
      <p className="text-xs text-stone-400 mb-6 text-center">
        6자리 비밀번호를 입력해 주세요.
      </p>
      <form onSubmit={handleSubmit} className="space-y-5">
        <PinInput value={passcode} onChange={v => { setPasscode(v); setError(''); }} disabled={loading} />
        {error && <p className="text-sm text-red-500 text-center">{error}</p>}
        <button
          type="submit"
          disabled={passcode.length < 6 || loading}
          className="w-full bg-stone-800 hover:bg-stone-700 disabled:opacity-40 text-white font-semibold py-2.5 rounded-xl transition-colors text-sm"
        >
          {loading ? '확인 중...' : '입력하기'}
        </button>
      </form>
    </div>
  );
}
