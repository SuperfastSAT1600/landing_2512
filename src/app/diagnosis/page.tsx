'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { DiagnosticTestView } from './components/DiagnosticTestView';
import { TokenInputForm } from './components/TokenInputForm';
import { StudentConfirmForm } from './components/StudentConfirmForm';
import diagnosticTest1 from './data/diagnostic-test-1';
import { ValidateTokenResponse } from '@/types/diagnosis';

const CODE_LENGTH = 6;
const VALID_CODE = process.env.NEXT_PUBLIC_DIAGNOSIS_CODE ?? '123456';

type Phase = 'code-entry' | 'info-entry' | 'token-entry' | 'student-confirm' | 'test-active';

export default function DiagnosisPage() {
  // Determine if using token-based flow (URL parameter) or code entry
  const [useTokenFlow, setUseTokenFlow] = useState(false);
  const [phase, setPhase] = useState<Phase>('code-entry');
  const [code, setCode] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const [error, setError] = useState('');
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Token-based flow state
  const [tokenId, setTokenId] = useState<string>('');
  const [studentEmail, setStudentEmail] = useState<string>('');
  const [studentName, setStudentName] = useState<string>('');

  // Check URL for token parameter on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get('token');
    if (urlToken) {
      setUseTokenFlow(true);
      setPhase('token-entry');
    }
  }, []);

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

  const handleSubmit = () => {
    if (!isFilled) return;
    if (code.join('') === VALID_CODE) {
      setPhase('info-entry');
    } else {
      setError('접속 코드가 올바르지 않습니다. 다시 확인해주세요.');
    }
  };

  const handleTokenValidation = (data: ValidateTokenResponse) => {
    setTokenId(data.tokenId);
    setStudentEmail(data.studentEmail);
    setStudentName(data.studentName);
    setPhase('student-confirm');
  };

  const handleTestStart = () => {
    setPhase('test-active');
  };

  // Name & Email input phase (after code validation)
  if (phase === 'info-entry') {
    return (
      <div className="min-h-screen bg-[#151719] text-gray-100 flex flex-col items-center justify-center p-4 font-sans">
        <div className="mb-8 text-center">
          <p className="text-xl text-gray-400">Please enter your information to continue</p>
        </div>

        <div className="w-full max-w-md bg-[#1e2023] rounded-2xl border border-white/5 p-6 md:p-8 shadow-2xl space-y-6">
          <div>
            <label className="block text-sm font-semibold mb-2">Name</label>
            <input
              type="text"
              value={studentName}
              onChange={(e) => {
                setStudentName(e.target.value);
                setError('');
              }}
              placeholder="Enter your name"
              className="w-full px-4 py-3 bg-[#151719] border border-white/10 rounded-xl text-white placeholder-gray-500 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Email</label>
            <input
              type="email"
              value={studentEmail}
              onChange={(e) => {
                setStudentEmail(e.target.value);
                setError('');
              }}
              placeholder="Enter your email"
              className="w-full px-4 py-3 bg-[#151719] border border-white/10 rounded-xl text-white placeholder-gray-500 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm text-center">{error}</p>
          )}

          <button
            onClick={() => {
              if (!studentName.trim() || !studentEmail.trim()) {
                setError('Please fill in all fields');
                return;
              }
              setPhase('test-active');
            }}
            className="w-full py-4 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold transition-all text-lg shadow-lg shadow-blue-900/20"
          >
            Start Test
          </button>
        </div>
      </div>
    );
  }

  // Token input phase
  if (phase === 'token-entry') {
    return (
      <div className="min-h-screen bg-[#151719] text-gray-100 flex flex-col items-center justify-center p-4 font-sans">
        <div className="mb-8 text-center">
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight mb-4 bg-gradient-to-r from-[#6085FF] via-[#071be9] to-[#6085FF] bg-[length:200%_auto] bg-clip-text text-transparent">
            SAT 진단 테스트
          </h1>
          <p className="text-xl text-gray-400">30분 진단테스트로 현재 내 실력을 확인해보세요.</p>
        </div>

        <TokenInputForm onSuccess={handleTokenValidation} />
      </div>
    );
  }

  // Student confirmation phase
  if (phase === 'student-confirm') {
    return (
      <div className="min-h-screen bg-[#151719] text-gray-100 flex flex-col items-center justify-center p-4 font-sans">
        <div className="mb-8 text-center">
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight mb-4 bg-gradient-to-r from-[#6085FF] via-[#071be9] to-[#6085FF] bg-[length:200%_auto] bg-clip-text text-transparent">
            SAT 진단 테스트
          </h1>
          <p className="text-xl text-gray-400">30분 진단테스트로 현재 내 실력을 확인해보세요.</p>
        </div>

        <StudentConfirmForm
          studentEmail={studentEmail}
          studentName={studentName}
          onStart={handleTestStart}
        />
      </div>
    );
  }

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

  return (
    <div className="min-h-screen bg-[#151719] text-gray-100 flex flex-col items-center justify-center p-4 font-sans">
      {/* Branding */}
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

        {/* OTP inputs */}
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
              aria-label={`코드 ${idx + 1}번째 자리`}
            />
          ))}
        </div>

        {/* Error */}
        {error && (
          <p className="text-red-400 text-sm text-center mb-4">{error}</p>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={!isFilled}
          className="w-full py-4 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed text-lg shadow-lg shadow-blue-900/20 mt-4"
        >
          확인
        </button>
      </div>
    </div>
  );
}
