'use client';

import { useState, useRef, useCallback } from 'react';

const PASSCODE_LENGTH = 6;

interface PasscodeSetupProps {
  studentId: string;
  onSetupComplete: (passcode: string) => void;
}

export function PasscodeSetup({ studentId, onSetupComplete }: PasscodeSetupProps) {
  const [step, setStep] = useState<'enter' | 'confirm'>('enter');
  const [first, setFirst] = useState<string[]>(Array(PASSCODE_LENGTH).fill(''));
  const [second, setSecond] = useState<string[]>(Array(PASSCODE_LENGTH).fill(''));
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const firstRefs = useRef<(HTMLInputElement | null)[]>([]);
  const secondRefs = useRef<(HTMLInputElement | null)[]>([]);

  const setFirstRef = useCallback((el: HTMLInputElement | null, idx: number) => {
    firstRefs.current[idx] = el;
  }, []);
  const setSecondRef = useCallback((el: HTMLInputElement | null, idx: number) => {
    secondRefs.current[idx] = el;
  }, []);

  function handleDigitChange(
    idx: number,
    value: string,
    code: string[],
    setCode: (c: string[]) => void,
    refs: React.MutableRefObject<(HTMLInputElement | null)[]>
  ) {
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...code];
    next[idx] = digit;
    setCode(next);
    setError('');
    if (digit && idx < PASSCODE_LENGTH - 1) refs.current[idx + 1]?.focus();
  }

  function handleDigitKeyDown(
    idx: number,
    e: React.KeyboardEvent,
    code: string[],
    refs: React.MutableRefObject<(HTMLInputElement | null)[]>
  ) {
    if (e.key === 'Backspace' && !code[idx] && idx > 0) {
      refs.current[idx - 1]?.focus();
    }
  }

  function handlePaste(
    e: React.ClipboardEvent,
    setCode: (c: string[]) => void,
    refs: React.MutableRefObject<(HTMLInputElement | null)[]>
  ) {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, PASSCODE_LENGTH);
    if (!pasted) return;
    const next = Array(PASSCODE_LENGTH).fill('');
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
    setCode(next);
    refs.current[Math.min(pasted.length, PASSCODE_LENGTH - 1)]?.focus();
  }

  function handleFirstNext() {
    if (first.some((d) => !d)) {
      setError('6자리 숫자를 모두 입력해주세요.');
      return;
    }
    setError('');
    setStep('confirm');
    setTimeout(() => secondRefs.current[0]?.focus(), 50);
  }

  async function handleConfirmSubmit() {
    if (second.some((d) => !d)) {
      setError('확인 패스코드를 모두 입력해주세요.');
      return;
    }
    if (first.join('') !== second.join('')) {
      setError('패스코드가 일치하지 않습니다. 다시 입력해주세요.');
      setSecond(Array(PASSCODE_LENGTH).fill(''));
      setTimeout(() => secondRefs.current[0]?.focus(), 50);
      return;
    }
    setError('');
    setLoading(true);
    try {
      const passcode = first.join('');
      const res = await fetch(`/api/mypage/${studentId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'setup', passcode }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error?.message ?? '설정 중 오류가 발생했습니다.');
        return;
      }
      onSetupComplete(passcode);
    } catch {
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">패스코드 설정</h1>
          <p className="text-gray-500 text-sm">
            {step === 'enter'
              ? '마이페이지 보호를 위해 6자리 패스코드를 설정해주세요.'
              : '패스코드를 한 번 더 입력해주세요.'}
          </p>
        </div>

        <div className="bg-gray-50 rounded-2xl border border-gray-100 p-6">
          {step === 'enter' ? (
            <>
              <p className="text-sm font-medium text-gray-700 text-center mb-4">새 패스코드</p>
              <PinRow
                code={first}
                refs={firstRefs}
                setRef={setFirstRef}
                onChange={(idx, val) => handleDigitChange(idx, val, first, setFirst, firstRefs)}
                onKeyDown={(idx, e) => handleDigitKeyDown(idx, e, first, firstRefs)}
                onPaste={(e) => handlePaste(e, setFirst, firstRefs)}
                autoFocusFirst
              />
              {error && <p className="text-red-500 text-xs text-center mt-3">{error}</p>}
              <button
                onClick={handleFirstNext}
                className="w-full mt-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm transition-colors"
              >
                다음
              </button>
            </>
          ) : (
            <>
              <p className="text-sm font-medium text-gray-700 text-center mb-4">패스코드 확인</p>
              <PinRow
                code={second}
                refs={secondRefs}
                setRef={setSecondRef}
                onChange={(idx, val) => handleDigitChange(idx, val, second, setSecond, secondRefs)}
                onKeyDown={(idx, e) => handleDigitKeyDown(idx, e, second, secondRefs)}
                onPaste={(e) => handlePaste(e, setSecond, secondRefs)}
                autoFocusFirst={false}
              />
              {error && <p className="text-red-500 text-xs text-center mt-3">{error}</p>}
              <button
                onClick={handleConfirmSubmit}
                disabled={loading}
                className="w-full mt-5 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-semibold text-sm transition-colors"
              >
                {loading ? '설정 중...' : '패스코드 설정 완료'}
              </button>
              <button
                onClick={() => { setStep('enter'); setSecond(Array(PASSCODE_LENGTH).fill('')); setError(''); }}
                className="w-full mt-2 py-2 text-gray-400 hover:text-gray-600 text-sm transition-colors"
              >
                다시 입력
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

interface PasscodeVerifyProps {
  studentId: string;
  onVerified: (passcode: string) => void;
}

export function PasscodeVerify({ studentId, onVerified }: PasscodeVerifyProps) {
  const [code, setCode] = useState<string[]>(Array(PASSCODE_LENGTH).fill(''));
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [locked, setLocked] = useState(false);

  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const setRef = useCallback((el: HTMLInputElement | null, idx: number) => {
    refs.current[idx] = el;
  }, []);

  function handleChange(idx: number, value: string) {
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...code];
    next[idx] = digit;
    setCode(next);
    setError('');
    if (digit && idx < PASSCODE_LENGTH - 1) refs.current[idx + 1]?.focus();
  }

  function handleKeyDown(idx: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !code[idx] && idx > 0) refs.current[idx - 1]?.focus();
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, PASSCODE_LENGTH);
    if (!pasted) return;
    const next = Array(PASSCODE_LENGTH).fill('');
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
    setCode(next);
    refs.current[Math.min(pasted.length, PASSCODE_LENGTH - 1)]?.focus();
  }

  async function handleVerify() {
    if (code.some((d) => !d)) {
      setError('6자리 패스코드를 모두 입력해주세요.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const passcode = code.join('');
      const res = await fetch(`/api/mypage/${studentId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify', passcode }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 423) {
          setLocked(true);
          setError('잠시 후 다시 시도해주세요.');
        } else {
          const remaining = data?.remaining_attempts;
          setError(
            remaining != null
              ? `틀렸습니다. ${remaining}회 남았습니다.`
              : '패스코드가 올바르지 않습니다.'
          );
          setCode(Array(PASSCODE_LENGTH).fill(''));
          setTimeout(() => refs.current[0]?.focus(), 50);
        }
        return;
      }
      onVerified(passcode);
    } catch {
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">패스코드 입력</h1>
          <p className="text-gray-500 text-sm">6자리 패스코드를 입력해주세요.</p>
        </div>

        <div className="bg-gray-50 rounded-2xl border border-gray-100 p-6">
          <PinRow
            code={code}
            refs={refs}
            setRef={setRef}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            autoFocusFirst
            disabled={locked}
          />

          {error && (
            <p className={`text-xs text-center mt-3 ${locked ? 'text-orange-500' : 'text-red-500'}`}>
              {error}
            </p>
          )}

          <button
            onClick={handleVerify}
            disabled={loading || locked}
            className="w-full mt-5 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-semibold text-sm transition-colors"
          >
            {locked ? '잠금 상태' : loading ? '확인 중...' : '확인'}
          </button>
        </div>
      </div>
    </div>
  );
}

interface PinRowProps {
  code: string[];
  refs: React.MutableRefObject<(HTMLInputElement | null)[]>;
  setRef: (el: HTMLInputElement | null, idx: number) => void;
  onChange: (idx: number, value: string) => void;
  onKeyDown: (idx: number, e: React.KeyboardEvent) => void;
  onPaste: (e: React.ClipboardEvent) => void;
  autoFocusFirst: boolean;
  disabled?: boolean;
}

function PinRow({ code, setRef, onChange, onKeyDown, onPaste, autoFocusFirst, disabled }: PinRowProps) {
  return (
    <div className="flex justify-center gap-2">
      {Array.from({ length: PASSCODE_LENGTH }).map((_, idx) => (
        <input
          key={idx}
          ref={(el) => setRef(el, idx)}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={code[idx]}
          disabled={disabled}
          onChange={(e) => onChange(idx, e.target.value)}
          onKeyDown={(e) => onKeyDown(idx, e)}
          onPaste={idx === 0 ? onPaste : undefined}
          autoFocus={autoFocusFirst && idx === 0}
          className="w-11 h-12 text-center text-xl font-bold bg-white border border-gray-200 rounded-xl text-gray-900 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-40"
          aria-label={`패스코드 ${idx + 1}번째 자리`}
        />
      ))}
    </div>
  );
}
