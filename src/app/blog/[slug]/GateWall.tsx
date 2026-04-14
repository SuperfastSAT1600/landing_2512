'use client';

import { useEffect, useRef, useState } from 'react';
import { Lock, Instagram, CheckCircle, Circle } from 'lucide-react';

const INSTAGRAM_URL = 'https://www.instagram.com/superfastsat.official/';

interface GateWallProps {
  slug: string;
  preview: string; // plain text preview (first ~200 chars)
  onUnlock: (contentHtml: string) => void;
}

export function GateWall({ slug, preview, onUnlock }: GateWallProps) {
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Check sessionStorage on mount
  useEffect(() => {
    const cached = sessionStorage.getItem(`gated_post_${slug}`);
    if (cached) verifyCode(cached);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const verifyCode = async (code: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/posts/${slug}/verify-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (res.ok && data.content) {
        sessionStorage.setItem(`gated_post_${slug}`, code);
        onUnlock(data.content);
      } else {
        setError(data.error || '코드가 올바르지 않습니다.');
        setDigits(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    } catch {
      setError('오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  const handleDigitChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[index] = digit;
    setDigits(next);
    setError('');

    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    if (digit && index === 5) {
      const code = [...next.slice(0, 5), digit].join('');
      if (code.length === 6) verifyCode(code);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'Enter') {
      const code = digits.join('');
      if (code.length === 6) verifyCode(code);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setDigits(pasted.split(''));
      verifyCode(pasted);
    }
  };

  const handleSubmit = () => {
    const code = digits.join('');
    if (code.length === 6) verifyCode(code);
  };

  const steps = [
    { label: '@superfastsat.official 팔로우', done: false },
    { label: '최신 게시물에 댓글 "코드 주세요" 달기', done: false },
    { label: 'DM으로 받은 6자리 코드 입력', done: false },
  ];

  return (
    <div className="relative">
      {/* Preview text with fade */}
      <div className="relative mb-0">
        <p className="text-gray-300 text-base leading-relaxed line-clamp-3">
          {preview}
        </p>
        <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-[#151719] to-transparent" />
      </div>

      {/* Gate panel */}
      <div className="mt-6 rounded-2xl border border-white/10 bg-[#1a1d20] overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-white/10 bg-white/[0.02]">
          <div className="w-9 h-9 rounded-full bg-blue-600/20 flex items-center justify-center flex-shrink-0">
            <Lock size={16} className="text-blue-400" />
          </div>
          <div>
            <p className="text-white font-bold text-sm">SuperfastSAT 팔로워 전용 콘텐츠</p>
            <p className="text-gray-500 text-xs mt-0.5">인스타그램 팔로워에게만 공개되는 글입니다.</p>
          </div>
        </div>

        {/* Steps */}
        <div className="px-6 py-5 space-y-3">
          {steps.map((step, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="mt-0.5 flex-shrink-0">
                {step.done
                  ? <CheckCircle size={16} className="text-green-400" />
                  : <Circle size={16} className="text-gray-600" />
                }
              </div>
              <span className="text-sm text-gray-400">
                <span className="text-gray-600 mr-1.5">STEP {i + 1}</span>
                {step.label}
              </span>
            </div>
          ))}
        </div>

        {/* Instagram button */}
        <div className="px-6 pb-5">
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-sm font-bold transition-all"
          >
            <Instagram size={16} />
            인스타그램 바로가기
          </a>
        </div>

        {/* Divider */}
        <div className="mx-6 border-t border-white/10" />

        {/* Code input */}
        <div className="px-6 py-5">
          <p className="text-xs text-gray-500 mb-4 text-center">DM으로 받은 6자리 코드를 입력하세요</p>

          <div className="flex gap-2 justify-center mb-4" onPaste={handlePaste}>
            {digits.map((d, i) => (
              <input
                key={i}
                ref={el => { inputRefs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={d}
                onChange={e => handleDigitChange(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
                className={`w-11 h-13 text-center text-xl font-bold rounded-lg border bg-[#0f1013] text-white outline-none transition-colors
                  ${error ? 'border-red-500/60' : d ? 'border-blue-500' : 'border-white/10'}
                  focus:border-blue-500`}
                style={{ height: '3.25rem' }}
                disabled={loading}
                autoComplete="off"
              />
            ))}
          </div>

          {error && (
            <p className="text-red-400 text-xs text-center mb-3">{error}</p>
          )}

          <button
            onClick={handleSubmit}
            disabled={digits.join('').length < 6 || loading}
            className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold transition-colors"
          >
            {loading ? '확인 중...' : '잠금 해제'}
          </button>
        </div>
      </div>
    </div>
  );
}
