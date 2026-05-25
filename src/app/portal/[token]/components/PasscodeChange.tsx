'use client';

import { useState, useRef } from 'react';
import { X } from 'lucide-react';

interface Props {
  token: string;
  onClose: () => void;
}

type Step = 'current' | 'new' | 'confirm' | 'done';

function PinInput({
  value,
  onChange,
  disabled,
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  function handleChange(index: number, ch: string) {
    const digit = ch.replace(/\D/g, '').slice(-1);
    const arr = value.split('');
    arr[index] = digit;
    const next = arr.join('').slice(0, 6);
    onChange(next);
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
          autoFocus={autoFocus && i === 0}
          disabled={disabled}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKeyDown(i, e)}
          onFocus={e => e.target.select()}
          className="w-10 h-12 border-2 border-stone-200 rounded-lg text-center text-lg font-bold focus:border-amber-400 focus:outline-none disabled:opacity-40 transition-colors bg-white"
        />
      ))}
    </div>
  );
}

export default function PasscodeChange({ token, onClose }: Props) {
  const [step, setStep] = useState<Step>('current');
  const [current, setCurrent] = useState('');
  const [newCode, setNewCode] = useState('');
  const [confirmCode, setConfirmCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleCurrentNext() {
    if (current.length !== 6) return;
    setError('');
    setLoading(true);
    // Pre-verify current passcode via a verify call
    const res = await fetch(`/api/portal/${token}/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'verify', passcode: current }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? '현재 비밀번호가 올바르지 않습니다');
      setCurrent('');
      return;
    }
    setStep('new');
  }

  async function handleChange() {
    if (newCode.length !== 6 || confirmCode.length !== 6) return;
    if (newCode !== confirmCode) { setError('새 비밀번호가 일치하지 않습니다'); setConfirmCode(''); return; }
    setError('');
    setLoading(true);
    const res = await fetch(`/api/portal/${token}/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'change', currentPasscode: current, newPasscode: newCode }),
    });
    setLoading(false);
    if (res.ok) { setStep('done'); return; }
    const data = await res.json().catch(() => ({}));
    setError(data.error ?? '변경에 실패했습니다');
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 p-1 text-stone-400 hover:text-stone-600 transition-colors">
          <X size={16} />
        </button>

        {step === 'done' ? (
          <div className="text-center py-4">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h3 className="font-bold text-stone-800 mb-1">비밀번호가 변경되었습니다</h3>
            <p className="text-sm text-stone-500 mb-5">다음 접속부터 새 비밀번호를 사용하세요.</p>
            <button onClick={onClose} className="w-full bg-stone-800 text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-stone-700 transition-colors">
              닫기
            </button>
          </div>
        ) : step === 'current' ? (
          <>
            <h3 className="font-bold text-stone-800 mb-1">비밀번호 변경</h3>
            <p className="text-sm text-stone-500 mb-6">현재 비밀번호를 먼저 확인합니다.</p>
            <div className="space-y-5">
              <div>
                <p className="text-xs text-stone-500 mb-2 text-center">현재 비밀번호</p>
                <PinInput value={current} onChange={v => { setCurrent(v); setError(''); }} autoFocus disabled={loading} />
              </div>
              {error && <p className="text-sm text-red-500 text-center">{error}</p>}
              <button
                onClick={handleCurrentNext}
                disabled={current.length < 6 || loading}
                className="w-full bg-stone-800 hover:bg-stone-700 disabled:opacity-40 text-white font-semibold py-2.5 rounded-xl transition-colors text-sm"
              >
                {loading ? '확인 중...' : '다음'}
              </button>
            </div>
          </>
        ) : (
          <>
            <h3 className="font-bold text-stone-800 mb-1">새 비밀번호 설정</h3>
            <p className="text-sm text-stone-500 mb-6">새로 사용할 6자리 숫자를 입력해 주세요.</p>
            <div className="space-y-5">
              <div>
                <p className="text-xs text-stone-500 mb-2 text-center">새 비밀번호</p>
                <PinInput value={newCode} onChange={v => { setNewCode(v); setError(''); }} autoFocus={step === 'new'} disabled={loading} />
              </div>
              <div>
                <p className="text-xs text-stone-500 mb-2 text-center">새 비밀번호 확인</p>
                <PinInput value={confirmCode} onChange={v => { setConfirmCode(v); setError(''); }} disabled={loading} />
              </div>
              {error && <p className="text-sm text-red-500 text-center">{error}</p>}
              <button
                onClick={handleChange}
                disabled={newCode.length < 6 || confirmCode.length < 6 || loading}
                className="w-full bg-stone-800 hover:bg-stone-700 disabled:opacity-40 text-white font-semibold py-2.5 rounded-xl transition-colors text-sm"
              >
                {loading ? '변경 중...' : '비밀번호 변경'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
