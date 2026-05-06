'use client';

import { useState, useRef, useCallback } from 'react';
import { setPixelAdvancedMatching } from '@/lib/pixel-matching';
import { DiagnosticTestView } from './components/DiagnosticTestView';
import { ApplicationForm } from './components/ApplicationForm';
import type { DiagnosticTestData } from './data/diagnostic-test-1';

const CODE_LENGTH = 6;

type DiagnosisTab = 'code' | 'apply';
type Phase = 'code-entry' | 'student-confirm' | 'email-input' | 'previous-score-input' | 'test-loading' | 'test-active';
type PreviousScoreStatus = 'scored' | 'never_taken' | 'dont_remember';

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

function isValidScore(val: string): boolean {
  const n = parseInt(val, 10);
  return !isNaN(n) && n >= 200 && n <= 800;
}

const MONTHS = [
  { value: '01', label: 'January' }, { value: '02', label: 'February' },
  { value: '03', label: 'March' },   { value: '04', label: 'April' },
  { value: '05', label: 'May' },     { value: '06', label: 'June' },
  { value: '07', label: 'July' },    { value: '08', label: 'August' },
  { value: '09', label: 'September' }, { value: '10', label: 'October' },
  { value: '11', label: 'November' }, { value: '12', label: 'December' },
];

function getYearOptions(): number[] {
  const current = new Date().getFullYear();
  const years: number[] = [];
  for (let y = current; y >= 2016; y--) years.push(y);
  return years;
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

  const [previousScoreStatus, setPreviousScoreStatus] = useState<PreviousScoreStatus | null>(null);
  const [previousTestYear, setPreviousTestYear] = useState('');
  const [previousTestMonth, setPreviousTestMonth] = useState('');
  const [previousRwScore, setPreviousRwScore] = useState('');
  const [previousMathScore, setPreviousMathScore] = useState('');
  const [scoreErrors, setScoreErrors] = useState({ date: '', rw: '', math: '' });

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

  const loadTestContentInBackground = useCallback(async () => {
    try {
      const url = testVersionId
        ? `/api/diagnosis/test-content?versionId=${testVersionId}`
        : '/api/diagnosis/test-content';
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to load test');
      const data = await res.json();
      setTestData(data);
      setPhase(prev => prev === 'test-loading' ? 'test-active' : prev);
    } catch {
      setEmailError('Failed to load test. Please try again.');
      setPhase('email-input');
    }
  }, [testVersionId]);

  const handleEmailSubmit = () => {
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
    setStudentEmail(trimmedEmail);
    setPixelAdvancedMatching({ em: trimmedEmail }).catch(() => {});
    window.fbq?.('track', 'Lead', { content_name: 'diagnosis_email', currency: 'KRW', value: 0 });
    fetch('/api/diagnosis/track-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: trimmedEmail }),
    }).catch(() => {});
    loadTestContentInBackground();
    setPhase('previous-score-input');
  };

  const handlePreviousScoreDone = useCallback((status: PreviousScoreStatus) => {
    setPreviousScoreStatus(status);
    setPhase(testData ? 'test-active' : 'test-loading');
  }, [testData]);

  const handleScoreSubmit = () => {
    const errors = { date: '', rw: '', math: '' };
    if (!previousTestYear || !previousTestMonth) {
      errors.date = 'Please select the month and year of your most recent test.';
    }
    if (!isValidScore(previousRwScore)) {
      errors.rw = 'Enter a score between 200–800, in multiples of 10.';
    }
    if (!isValidScore(previousMathScore)) {
      errors.math = 'Enter a score between 200–800, in multiples of 10.';
    }
    setScoreErrors(errors);
    if (errors.date || errors.rw || errors.math) return;
    handlePreviousScoreDone('scored');
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

  // Previous score input phase
  if (phase === 'previous-score-input') {
    const scoreIsValid =
      !!previousTestYear && !!previousTestMonth &&
      isValidScore(previousRwScore) &&
      isValidScore(previousMathScore);
    return (
      <div className="min-h-screen bg-[#000000] text-gray-100 flex flex-col items-center justify-center p-4 font-sans">
        <div className="w-full max-w-md bg-[#09090b] rounded-2xl border border-white/5 p-6 md:p-8 shadow-2xl">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-2">What was your most recent SAT score?</h2>
            <p className="text-gray-500 text-sm">This helps us better understand your starting point</p>
          </div>

          <div className="space-y-5 mb-6">
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Test Date</label>
              <div className="flex gap-2">
                <select
                  value={previousTestMonth}
                  onChange={e => { setPreviousTestMonth(e.target.value); setScoreErrors(prev => ({ ...prev, date: '' })); }}
                  className="flex-1 px-4 py-3 bg-[#000000] border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#071be9] focus:ring-2 focus:ring-[#071be9]/20 appearance-none"
                >
                  <option value="">Month</option>
                  {MONTHS.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
                <select
                  value={previousTestYear}
                  onChange={e => { setPreviousTestYear(e.target.value); setScoreErrors(prev => ({ ...prev, date: '' })); }}
                  className="w-28 px-4 py-3 bg-[#000000] border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#071be9] focus:ring-2 focus:ring-[#071be9]/20 appearance-none"
                >
                  <option value="">Year</option>
                  {getYearOptions().map(y => (
                    <option key={y} value={String(y)}>{y}</option>
                  ))}
                </select>
              </div>
              {scoreErrors.date && <p className="text-red-400 text-xs mt-1">{scoreErrors.date}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Reading &amp; Writing Score</label>
              <input
                type="number"
                value={previousRwScore}
                min={200}
                max={800}
                step={10}
                placeholder="e.g. 680"
                onChange={e => { setPreviousRwScore(e.target.value); setScoreErrors(prev => ({ ...prev, rw: '' })); }}
                className="w-full px-4 py-3 bg-[#000000] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#071be9] focus:ring-2 focus:ring-[#071be9]/20"
              />
              {scoreErrors.rw && <p className="text-red-400 text-xs mt-1">{scoreErrors.rw}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Math Score</label>
              <input
                type="number"
                value={previousMathScore}
                min={200}
                max={800}
                step={10}
                placeholder="e.g. 720"
                onChange={e => { setPreviousMathScore(e.target.value); setScoreErrors(prev => ({ ...prev, math: '' })); }}
                className="w-full px-4 py-3 bg-[#000000] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#071be9] focus:ring-2 focus:ring-[#071be9]/20"
              />
              {scoreErrors.math && <p className="text-red-400 text-xs mt-1">{scoreErrors.math}</p>}
            </div>
          </div>

          <button
            onClick={handleScoreSubmit}
            disabled={!scoreIsValid}
            className="w-full py-4 bg-[#071be9] hover:bg-[#1a31f0] rounded-xl font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed text-lg shadow-lg shadow-[#071be9]/20 mb-4"
          >
            Continue →
          </button>

          <div className="flex flex-col gap-2">
            <button
              onClick={() => handlePreviousScoreDone('never_taken')}
              className="w-full py-3 text-gray-400 hover:text-gray-200 text-sm border border-white/5 rounded-xl hover:border-white/10 transition-all"
            >
              I&apos;ve never taken the SAT
            </button>
            <button
              onClick={() => handlePreviousScoreDone('dont_remember')}
              className="w-full py-3 text-gray-400 hover:text-gray-200 text-sm border border-white/5 rounded-xl hover:border-white/10 transition-all"
            >
              I don&apos;t remember my score
            </button>
          </div>
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
          previousScoreStatus={previousScoreStatus ?? undefined}
          previousTestDate={previousTestYear && previousTestMonth ? `${previousTestYear}-${previousTestMonth}-01` : undefined}
          previousRwScore={previousRwScore ? parseInt(previousRwScore, 10) : undefined}
          previousMathScore={previousMathScore ? parseInt(previousMathScore, 10) : undefined}
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
