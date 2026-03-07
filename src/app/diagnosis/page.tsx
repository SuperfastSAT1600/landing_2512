'use client';

import { useState, useRef, useCallback } from 'react';
import { DiagnosticTestView } from './components/DiagnosticTestView';
import diagnosticTest1 from './data/diagnostic-test-1';

const CODE_LENGTH = 6;

type Phase = 'code-entry' | 'student-confirm' | 'test-active';

export default function DiagnosisPage() {
  const [phase, setPhase] = useState<Phase>('code-entry');
  const [code, setCode] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [tokenId, setTokenId] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [studentName, setStudentName] = useState('');

  const setRef = useCallback((el: HTMLInputElement | null, idx: number) => {
    inputRefs.current[idx] = el;
  }, []);

  const focusInput = (idx: number) => inputRefs.current[idx]?.focus();

  const handleChange = (idx: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...code];
    next[idx] = digit;
    setCode(next);
    setError('');
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
    setError('');
    focusInput(Math.min(pasted.length, CODE_LENGTH - 1));
  };

  const isFilled = code.every(d => d !== '');

  const handleSubmit = async () => {
    if (!isFilled || loading) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/diagnosis/validate-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.join('') }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error?.includes('expired')) {
          setError('This code has expired. Please contact your instructor.');
        } else {
          setError('Invalid code. Please check and try again.');
        }
        return;
      }

      setTokenId(data.tokenId);
      setStudentEmail(data.studentEmail);
      setStudentName(data.studentName);
      setPhase('student-confirm');
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Student confirmation phase
  if (phase === 'student-confirm') {
    return (
      <div className="min-h-screen bg-[#151719] text-gray-100 flex flex-col items-center justify-center p-4 font-sans">
        <div className="w-full max-w-md bg-[#1e2023] rounded-2xl border border-white/5 p-6 md:p-8 shadow-2xl">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-2">Confirm Your Information</h2>
            <p className="text-gray-500 text-sm">Please verify that this is correct</p>
          </div>

          <div className="space-y-4 mb-8">
            <div className="bg-[#151719] rounded-xl p-4 border border-white/5">
              <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase">Name</label>
              <p className="text-white text-lg font-semibold">{studentName}</p>
            </div>
            <div className="bg-[#151719] rounded-xl p-4 border border-white/5">
              <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase">Email</label>
              <p className="text-white text-lg font-semibold break-all">{studentEmail}</p>
            </div>
          </div>

          <button
            onClick={() => setPhase('test-active')}
            className="w-full py-4 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold transition-all text-lg shadow-lg shadow-blue-900/20"
          >
            Start Test
          </button>
        </div>
      </div>
    );
  }

  // Test active phase
  if (phase === 'test-active') {
    return (
      <div style={{ minHeight: 'calc(100vh - 56px)', paddingTop: '56px', display: 'flex', flexDirection: 'column' }}>
        <DiagnosticTestView
          testData={diagnosticTest1}
          tokenId={tokenId}
          studentEmail={studentEmail}
          studentName={studentName}
        />
      </div>
    );
  }

  // Code entry phase (default)
  return (
    <div className="min-h-screen bg-[#151719] text-gray-100 flex flex-col items-center justify-center p-4 font-sans">
      <div className="mb-8 text-center">
        <h1 className="text-3xl sm:text-5xl font-bold tracking-tight mb-4 bg-gradient-to-r from-[#6085FF] via-[#071be9] to-[#6085FF] bg-[length:200%_auto] bg-clip-text text-transparent">
          SAT 진단 테스트
        </h1>
        <p className="text-xl text-gray-400">30분 진단테스트로 현재 내 실력을 확인해보세요.</p>
      </div>

      <div className="w-full max-w-md bg-[#1e2023] rounded-2xl border border-white/5 p-6 md:p-8 shadow-2xl">
        <h2 className="text-2xl font-bold text-center mb-2">접속 코드를 입력하세요</h2>
        <p className="text-gray-500 text-sm text-center mb-8">
          문자/이메일로 받은 6자리 코드를 입력해주세요
        </p>

        <div className="flex justify-center gap-2 md:gap-3 mb-4">
          {Array.from({ length: CODE_LENGTH }).map((_, idx) => (
            <input
              key={idx}
              ref={(el) => setRef(el, idx)}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={code[idx]}
              onChange={(e) => handleChange(idx, e.target.value)}
              onKeyDown={(e) => handleKeyDown(idx, e)}
              onPaste={idx === 0 ? handlePaste : undefined}
              autoFocus={idx === 0}
              className="w-12 h-14 md:w-14 md:h-16 text-center text-2xl font-bold bg-[#151719] border border-white/10 rounded-xl text-white outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              aria-label={`Code digit ${idx + 1}`}
            />
          ))}
        </div>

        {error && (
          <p className="text-red-400 text-sm text-center mb-4">{error}</p>
        )}

        <button
          onClick={handleSubmit}
          disabled={!isFilled || loading}
          className="w-full py-4 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed text-lg shadow-lg shadow-blue-900/20 mt-4"
        >
          {loading ? 'Verifying...' : '확인'}
        </button>
      </div>
    </div>
  );
}
