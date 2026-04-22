'use client';

import { useState, useRef, useCallback } from 'react';
import { setPixelAdvancedMatching } from '@/lib/pixel-matching';
import { DiagnosticTestView } from './components/DiagnosticTestView';
import { ApplicationForm } from './components/ApplicationForm';
import type { DiagnosticTestData } from './data/diagnostic-test-1';

const CODE_LENGTH = 6;

type DiagnosisTab = 'code' | 'apply';
type Phase = 'code-entry' | 'student-confirm' | 'email-input' | 'test-loading' | 'test-active';

function formatKoreanDate(isoString: string | null): string {
  if (!isoString) return '';
  return new Date(isoString).toLocaleString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function DiagnosisPage() {
  const [activeTab, setActiveTab] = useState<DiagnosisTab>('code');
  const [phase, setPhase] = useState<Phase>('code-entry');
  const [code, setCode] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [tokenId, setTokenId] = useState('');
  const [testVersionId, setTestVersionId] = useState<string | null>(null);
  const [testData, setTestData] = useState<DiagnosticTestData | null>(null);
  const [studentEmail, setStudentEmail] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [emailError, setEmailError] = useState('');
  const [studentName, setStudentName] = useState('');
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [timeLimitMinutes, setTimeLimitMinutes] = useState<number>(30);

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
          setError('만료된 코드입니다. 선생님에게 문의해주세요.');
        } else {
          setError('유효하지 않은 코드입니다. 다시 확인해주세요.');
        }
        return;
      }

      setTokenId(data.tokenId);
      setStudentName(data.studentName);
      setExpiresAt(data.expiresAt);
      setTestVersionId(data.testVersionId ?? null);
      setTimeLimitMinutes(data.timeLimitMinutes ?? 30);
      setPhase('student-confirm');
    } catch {
      setError('연결 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  const loadAndStartTest = async (email: string) => {
    setStudentEmail(email);
    setPhase('test-loading');
    try {
      const url = testVersionId
        ? `/api/diagnosis/test-content?versionId=${testVersionId}`
        : '/api/diagnosis/test-content';
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to load test');
      const data = await res.json();
      setTestData(data);
      setPhase('test-active');
    } catch {
      setEmailError('Failed to load test. Please try again.');
      setPhase('email-input');
    }
  };

  const handleEmailSubmit = async () => {
    setEmailError('');
    if (!emailInput.trim()) {
      setEmailError('Please enter your email address.');
      return;
    }
    if (!isValidEmail(emailInput.trim())) {
      setEmailError('Please enter a valid email address.');
      return;
    }
    const trimmedEmail = emailInput.trim();
    setPixelAdvancedMatching({ em: trimmedEmail }).catch(() => {});
    window.fbq?.('track', 'Lead', { content_name: 'diagnosis_email', currency: 'KRW', value: 0 });
    fetch('/api/diagnosis/track-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: trimmedEmail }),
    }).catch(() => {});
    await loadAndStartTest(trimmedEmail);
  };

  // Student confirmation phase
  if (phase === 'student-confirm') {
    return (
      <div className="min-h-screen bg-[#000000] text-gray-100 flex flex-col items-center justify-center p-4 font-sans">
        <div className="w-full max-w-md bg-[#09090b] rounded-2xl border border-white/5 p-6 md:p-8 shadow-2xl">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-2">Confirm Your Identity</h2>
            <p className="text-gray-500 text-sm">Please verify that the information below is correct</p>
          </div>

          <div className="space-y-4 mb-8">
            <div className="bg-[#000000] rounded-xl p-4 border border-white/5">
              <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Name</label>
              <p className="text-white text-lg font-semibold">{studentName}</p>
            </div>
            {expiresAt && (
              <div className="bg-[#000000] rounded-xl p-4 border border-white/5">
                <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Code Valid Until</label>
                <p className="text-white text-base font-medium">{formatKoreanDate(expiresAt)}</p>
              </div>
            )}
          </div>

          <button
            onClick={() => setPhase('email-input')}
            className="w-full py-4 bg-[#071be9] hover:bg-[#1a31f0] rounded-xl font-bold transition-all text-lg shadow-lg shadow-[#071be9]/20"
          >
            That&apos;s me — Continue
          </button>
          <button
            onClick={() => { setPhase('code-entry'); setCode(Array(CODE_LENGTH).fill('')); }}
            className="w-full mt-3 py-3 text-gray-400 hover:text-gray-200 text-sm transition-colors"
          >
            No, re-enter code
          </button>
        </div>
      </div>
    );
  }

  // Email input phase
  if (phase === 'email-input') {
    return (
      <div className="min-h-screen bg-[#000000] text-gray-100 flex flex-col items-center justify-center p-4 font-sans">
        <div className="w-full max-w-md bg-[#09090b] rounded-2xl border border-white/5 p-6 md:p-8 shadow-2xl">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-2">Enter Your Email</h2>
            <p className="text-gray-500 text-sm">We&apos;ll send your results and study materials<br />to this address</p>
          </div>

          <div className="mb-6">
            <input
              type="email"
              value={emailInput}
              onChange={(e) => { setEmailInput(e.target.value); setEmailError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && handleEmailSubmit()}
              placeholder="example@email.com"
              autoFocus
              className="w-full px-4 py-3 bg-[#000000] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#071be9] focus:ring-2 focus:ring-[#071be9]/20 text-base"
            />
            {emailError && (
              <p className="text-red-400 text-sm mt-2">{emailError}</p>
            )}
          </div>

          <button
            onClick={handleEmailSubmit}
            className="w-full py-4 bg-[#071be9] hover:bg-[#1a31f0] rounded-xl font-bold transition-all text-lg shadow-lg shadow-[#071be9]/20"
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  // Test loading phase
  if (phase === 'test-loading') {
    return (
      <div className="min-h-screen bg-[#000000] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-[#071be9] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400 text-sm">Loading test...</p>
        </div>
      </div>
    );
  }

  // Test active phase
  if (phase === 'test-active' && testData) {
    return (
      <div style={{ height: 'calc(100vh - 56px)', marginTop: '56px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <DiagnosticTestView
          testData={testData}
          tokenId={tokenId}
          studentEmail={studentEmail}
          studentName={studentName}
          testVersionId={testVersionId ?? undefined}
          timeLimitMinutes={timeLimitMinutes}
        />
      </div>
    );
  }

  // Code entry phase (default)
  return (
    <div className="min-h-screen bg-[#000000] text-gray-100 font-sans">
      <header className="pt-28 pb-10 sm:pt-32 sm:pb-16 px-6 text-center">
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-4 bg-gradient-to-r from-[#6085FF] via-[#071be9] to-[#6085FF] bg-[length:200%_auto] bg-clip-text text-transparent">
          SAT 진단 테스트
        </h1>
        <p className="text-xl text-gray-400">진단테스트로 현재 실력을 확인해보세요.</p>
      </header>

      <div className="flex flex-col items-center px-4 pb-16">
      <div className="w-full max-w-md bg-[#09090b] rounded-2xl border border-white/5 shadow-2xl overflow-hidden">
        {/* Tab Navigation */}
        <div className="flex border-b border-white/5">
          <button
            onClick={() => setActiveTab('code')}
            className={`flex-1 py-4 text-sm font-semibold transition-colors ${
              activeTab === 'code'
                ? 'text-white border-b-2 border-[#071be9] bg-white/5'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            코드 있어요
          </button>
          <button
            onClick={() => setActiveTab('apply')}
            className={`flex-1 py-4 text-sm font-semibold transition-colors ${
              activeTab === 'apply'
                ? 'text-white border-b-2 border-[#071be9] bg-white/5'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            신청할게요
          </button>
        </div>

        <div className="p-6 md:p-8">
          {/* Code Entry Tab */}
          {activeTab === 'code' && (
            <>
              <h2 className="text-2xl font-bold text-center mb-2">접속 코드를 입력하세요</h2>
              <p className="text-gray-500 text-sm text-center mb-8">
                원장님께 받은 6자리 코드를 입력해주세요
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
                    className="w-12 h-14 md:w-14 md:h-16 text-center text-2xl font-bold bg-[#000000] border border-white/10 rounded-xl text-white outline-none transition-all focus:border-[#071be9] focus:ring-2 focus:ring-[#071be9]/20"
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
                className="w-full py-4 bg-[#071be9] hover:bg-[#1a31f0] rounded-xl font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed text-lg shadow-lg shadow-[#071be9]/20 mt-4"
              >
                {loading ? '확인 중...' : '확인'}
              </button>
            </>
          )}

          {/* Application Tab */}
          {activeTab === 'apply' && <ApplicationForm />}
        </div>
      </div>
      </div>
    </div>
  );
}
