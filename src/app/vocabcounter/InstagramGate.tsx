'use client';

import { useState, useRef, useCallback, useSyncExternalStore, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

const STORAGE_KEY = 'vocab_search_v2';
const CODE_LENGTH = 6;

function subscribe(callback: () => void) {
  window.addEventListener('storage', callback);
  return () => window.removeEventListener('storage', callback);
}
function getSnapshot() { return localStorage.getItem(STORAGE_KEY) ?? null; }
function getServerSnapshot() { return null; }

export function InstagramGate({ children }: { children: React.ReactNode }) {
  const stored = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const searchParams = useSearchParams();
  const codeFromUrl = searchParams.get('c');

  const [instagramId, setInstagramId] = useState('');
  const [code, setCode] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const setRef = useCallback((el: HTMLInputElement | null, idx: number) => {
    inputRefs.current[idx] = el;
  }, []);

  const focusInput = (idx: number) => inputRefs.current[idx]?.focus();

  const handleDigitChange = (idx: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...code];
    next[idx] = digit;
    setCode(next);
    setErrorMsg('');
    if (digit && idx < CODE_LENGTH - 1) focusInput(idx + 1);
  };

  const handleKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !code[idx] && idx > 0) focusInput(idx - 1);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, CODE_LENGTH);
    if (!pasted) return;
    const next = [...code];
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
    setCode(next);
    setErrorMsg('');
    focusInput(Math.min(pasted.length, CODE_LENGTH - 1));
  };

  const verifyCode = useCallback(async (codeStr: string, igId?: string) => {
    setStatus('loading');
    setErrorMsg('');
    try {
      const body: Record<string, string> = { code: codeStr };
      if (igId) body.instagram_id = igId;
      const res = await fetch('/api/vocab-access/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        setErrorMsg(json.error?.message ?? '코드가 올바르지 않아요.');
        setStatus('error');
        return;
      }
      localStorage.setItem(STORAGE_KEY, json.data.instagram_id);
      window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY }));
    } catch {
      setErrorMsg('네트워크 오류가 발생했어요. 다시 시도해주세요.');
      setStatus('error');
    }
  }, []);

  // ?c= 파라미터가 있으면 자동 인증
  useEffect(() => {
    if (codeFromUrl && codeFromUrl.length === CODE_LENGTH) {
      setCode(codeFromUrl.split(''));
      verifyCode(codeFromUrl);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codeFromUrl]);

  const isFilled = codeFromUrl
    ? false // 자동 모드에서는 버튼 비활성화
    : instagramId.trim().length > 0 && code.every(d => d !== '');

  const handleSubmit = async () => {
    if (status === 'loading') return;
    await verifyCode(code.join(''), instagramId.trim() || undefined);
  };

  if (stored) return <>{children}</>;

  // ?c= 파라미터 있는 경우: 코드 전용 UI
  if (codeFromUrl) {
    return (
      <div className="fixed inset-0 z-50 bg-[#000000] text-gray-100 font-sans flex flex-col items-center overflow-y-auto px-4">
        <header className="pt-28 pb-10 sm:pt-32 sm:pb-16 px-6 text-center">
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-4 bg-gradient-to-r from-[#6085FF] via-[#071be9] to-[#6085FF] bg-[length:200%_auto] bg-clip-text text-transparent">
            Vocab Counter
          </h1>
          <p className="text-xl text-gray-400">
            {status === 'loading' ? '코드를 확인하는 중...' : status === 'error' ? '코드 확인에 실패했어요.' : '접속 코드를 확인합니다.'}
          </p>
        </header>

        <div className="w-full max-w-md bg-[#09090b] rounded-2xl border border-white/5 shadow-2xl p-6 md:p-8">
          <div className="mb-2">
            <label className="block text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wider">
              접속 코드
            </label>
            <div className="flex justify-center gap-2 md:gap-3">
              {codeFromUrl.split('').map((digit, idx) => (
                <div
                  key={idx}
                  className="w-12 h-14 md:w-14 md:h-16 flex items-center justify-center text-2xl font-bold bg-[#000000] border border-white/10 rounded-xl text-white"
                >
                  {digit}
                </div>
              ))}
            </div>
          </div>

          {errorMsg && (
            <p className="text-red-400 text-sm text-center mt-3">{errorMsg}</p>
          )}

          {status === 'error' && (
            <button
              onClick={() => verifyCode(codeFromUrl)}
              className="w-full mt-6 py-4 bg-[#071be9] hover:bg-[#1a31f0] rounded-xl font-bold transition-all text-lg shadow-lg shadow-[#071be9]/20"
            >
              다시 시도
            </button>
          )}

          {status === 'loading' && (
            <div className="w-full mt-6 py-4 text-center text-gray-500 text-sm">
              확인 중...
            </div>
          )}
        </div>
      </div>
    );
  }

  // 일반 UI: Instagram ID + 코드 입력
  return (
    <div className="fixed inset-0 z-50 bg-[#000000] text-gray-100 font-sans flex flex-col items-center overflow-y-auto px-4">
      <header className="pt-28 pb-10 sm:pt-32 sm:pb-16 px-6 text-center">
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-4 bg-gradient-to-r from-[#6085FF] via-[#071be9] to-[#6085FF] bg-[length:200%_auto] bg-clip-text text-transparent">
          Vocab Counter
        </h1>
        <p className="text-xl text-gray-400">인스타그램 ID와 발급받은 코드를 입력해주세요.</p>
      </header>

      <div className="w-full max-w-md bg-[#09090b] rounded-2xl border border-white/5 shadow-2xl p-6 md:p-8">

        {/* Instagram ID */}
        <div className="mb-6">
          <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">
            Instagram ID
          </label>
          <input
            type="text"
            value={instagramId}
            onChange={(e) => { setInstagramId(e.target.value.replace(/^@/, '')); setErrorMsg(''); }}
            placeholder="@ 제외하고 입력"
            autoComplete="off"
            className="w-full px-4 py-3 bg-[#000000] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#071be9] focus:ring-2 focus:ring-[#071be9]/20 text-base"
          />
        </div>

        {/* 6-digit code boxes */}
        <div className="mb-2">
          <label className="block text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wider">
            접속 코드
          </label>
          <div className="flex justify-center gap-2 md:gap-3">
            {Array.from({ length: CODE_LENGTH }).map((_, idx) => (
              <input
                key={idx}
                ref={(el) => setRef(el, idx)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={code[idx]}
                onChange={(e) => handleDigitChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                onPaste={idx === 0 ? handlePaste : undefined}
                className="w-12 h-14 md:w-14 md:h-16 text-center text-2xl font-bold bg-[#000000] border border-white/10 rounded-xl text-white outline-none transition-all focus:border-[#071be9] focus:ring-2 focus:ring-[#071be9]/20"
                aria-label={`코드 ${idx + 1}번째 자리`}
              />
            ))}
          </div>
        </div>

        {errorMsg && (
          <p className="text-red-400 text-sm text-center mt-3">{errorMsg}</p>
        )}

        <button
          onClick={handleSubmit}
          disabled={!isFilled || status === 'loading'}
          className="w-full mt-6 py-4 bg-[#071be9] hover:bg-[#1a31f0] rounded-xl font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed text-lg shadow-lg shadow-[#071be9]/20"
        >
          {status === 'loading' ? '확인 중...' : '확인'}
        </button>
      </div>
    </div>
  );
}
