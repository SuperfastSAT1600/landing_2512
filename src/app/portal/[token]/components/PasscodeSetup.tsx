'use client';

import { useState, useRef } from 'react';

interface Props {
  token: string;
  onSuccess: () => void;
}

function PinInput({
  value,
  onChange,
  autoFocus,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  autoFocus?: boolean;
  label: string;
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
    <div>
      <p className="text-xs text-stone-400 text-center mb-2">{label}</p>
      <div className="flex gap-2 justify-center" onPaste={handlePaste}>
        {Array.from({ length: 6 }).map((_, i) => (
          <input
            key={i}
            ref={el => { refs.current[i] = el; }}
            type="password"
            inputMode="numeric"
            maxLength={1}
            value={value[i] ?? ''}
            autoFocus={autoFocus && i === 0}
            onChange={e => handleChange(i, e.target.value)}
            onKeyDown={e => handleKeyDown(i, e)}
            onFocus={e => e.target.select()}
            className="w-10 h-12 border-2 border-stone-200 rounded-lg text-center text-lg font-bold focus:border-amber-400 focus:outline-none transition-colors bg-white/80"
          />
        ))}
      </div>
    </div>
  );
}

export default function PasscodeSetup({ token, onSuccess }: Props) {
  const [passcode, setPasscode] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const ready = passcode.length === 6 && confirm.length === 6;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (passcode !== confirm) { setError('비밀번호가 일치하지 않습니다'); setConfirm(''); return; }

    setLoading(true);
    const res = await fetch(`/api/portal/${token}/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'set', passcode }),
    });
    setLoading(false);

    if (res.ok) { onSuccess(); return; }
    const data = await res.json().catch(() => ({}));
    setError(data.error ?? '오류가 발생했습니다');
  }

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-stone-200/60 p-6 shadow-sm">
      <h2 className="text-base font-bold text-stone-800 mb-1 text-center">비밀번호 설정</h2>
      <p className="text-xs text-stone-400 mb-6 text-center">
        이 공간에 접근하기 위한 6자리 숫자 비밀번호를 설정해 주세요.
      </p>
      <form onSubmit={handleSubmit} className="space-y-5">
        <PinInput value={passcode} onChange={v => { setPasscode(v); setError(''); }} autoFocus label="비밀번호 (6자리)" />
        <PinInput value={confirm} onChange={v => { setConfirm(v); setError(''); }} label="비밀번호 확인" />
        {error && <p className="text-sm text-red-500 text-center">{error}</p>}
        <button
          type="submit"
          disabled={!ready || loading}
          className="w-full bg-stone-800 hover:bg-stone-700 disabled:opacity-40 text-white font-semibold py-2.5 rounded-xl transition-colors text-sm"
        >
          {loading ? '설정 중...' : ready ? '비밀번호 설정하기' : `${passcode.length < 6 ? `${passcode.length}/6` : `확인 ${confirm.length}/6`} 입력 중`}
        </button>
      </form>
    </div>
  );
}
