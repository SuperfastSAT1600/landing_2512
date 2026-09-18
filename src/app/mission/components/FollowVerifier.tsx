'use client';

import { useState } from 'react';

interface Props {
  onVerified: (username: string) => void;
}

type Step = 'input' | 'checking' | 'not_following' | 'error';

export default function FollowVerifier({ onVerified }: Props) {
  const [username, setUsername] = useState('');
  const [step, setStep] = useState<Step>('input');
  const [errorMsg, setErrorMsg] = useState('');

  const trimmed = username.trim().replace(/^@/, '');

  async function handleCheck() {
    if (!trimmed) return;
    setStep('checking');
    setErrorMsg('');

    try {
      const res = await fetch(`/api/mission/verify-follow?username=${encodeURIComponent(trimmed)}`);
      const json = await res.json();

      if (!res.ok) {
        setErrorMsg(json.error?.message ?? '오류가 발생했어요. 다시 시도해주세요.');
        setStep('error');
        return;
      }

      if (json.data.verified) {
        onVerified(trimmed);
      } else {
        setStep('not_following');
      }
    } catch {
      setErrorMsg('네트워크 오류가 발생했어요. 다시 시도해주세요.');
      setStep('error');
    }
  }

  function handleRetry() {
    setStep('input');
  }

  return (
    <div className="bg-gray-50 rounded-2xl p-5">
      <p className="text-sm font-semibold text-gray-800 mb-1">인스타그램 팔로우를 인증하세요</p>
      <p className="text-xs text-gray-400 mb-4">@superfastsat.official 팔로우 후 아이디를 입력해주세요</p>

      <input
        type="text"
        value={username}
        onChange={(e) => {
          setUsername(e.target.value);
          if (step !== 'input') setStep('input');
        }}
        placeholder="인스타 아이디 (@ 없이)"
        disabled={step === 'checking'}
        className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 disabled:opacity-50 mb-3"
      />

      {step === 'not_following' && (
        <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
          <p className="text-sm text-amber-700 font-medium mb-2">팔로우가 확인되지 않았어요</p>
          <a
            href="https://www.instagram.com/superfastsat.official/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-2.5 bg-gradient-to-r from-orange-400 to-pink-500 text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity mb-2"
          >
            @superfastsat.official 팔로우 하러가기
          </a>
          <button
            onClick={handleRetry}
            className="w-full py-2 text-sm text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors"
          >
            팔로우 후 다시 확인하기
          </button>
        </div>
      )}

      {(step === 'error') && (
        <p className="text-sm text-red-500 mb-3">{errorMsg}</p>
      )}

      {(step === 'input' || step === 'error') && (
        <button
          onClick={handleCheck}
          disabled={!trimmed}
          className="w-full py-2.5 bg-orange-500 text-white text-sm font-semibold rounded-xl hover:bg-orange-600 disabled:opacity-40 transition-colors"
        >
          팔로우 확인하기
        </button>
      )}

      {step === 'checking' && (
        <button disabled className="w-full py-2.5 bg-orange-400 text-white text-sm font-semibold rounded-xl opacity-70">
          확인 중...
        </button>
      )}
    </div>
  );
}
