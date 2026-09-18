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
        setErrorMsg(json.error?.message ?? 'An error occurred. Please try again.');
        setStep('error');
        return;
      }

      if (json.data.verified) {
        onVerified(trimmed);
      } else {
        setStep('not_following');
      }
    } catch {
      setErrorMsg('Network error. Please try again.');
      setStep('error');
    }
  }

  return (
    <div className="bg-gray-50 rounded-2xl p-5">
      <p className="text-sm font-semibold text-gray-800 mb-1">Verify your Instagram follow</p>
      <p className="text-xs text-gray-400 mb-4">Follow @superfastsat.official and enter your username below</p>

      <input
        type="text"
        value={username}
        onChange={(e) => {
          setUsername(e.target.value);
          if (step !== 'input') setStep('input');
        }}
        placeholder="Instagram username (without @)"
        disabled={step === 'checking'}
        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-[#3182F6] mb-3 disabled:opacity-50"
      />

      {step === 'not_following' && (
        <div className="mb-3 p-3 bg-blue-50 border border-blue-100 rounded-xl">
          <p className="text-sm text-blue-700 font-medium mb-2">Follow not confirmed</p>
          <a
            href="https://www.instagram.com/superfastsat.official/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-2.5 bg-[#3182F6] hover:bg-[#1B6AE0] text-white text-sm font-semibold rounded-xl transition-colors mb-2"
          >
            Follow @superfastsat.official
          </a>
          <button
            onClick={() => setStep('input')}
            className="w-full py-2 text-sm text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors"
          >
            I&apos;ve followed — check again
          </button>
        </div>
      )}

      {step === 'error' && (
        <p className="text-sm text-red-500 mb-3">{errorMsg}</p>
      )}

      {(step === 'input' || step === 'error') && (
        <button
          onClick={handleCheck}
          disabled={!trimmed}
          className="w-full py-2.5 bg-[#3182F6] hover:bg-[#1B6AE0] text-white text-sm font-semibold rounded-xl disabled:opacity-40 transition-colors"
        >
          Verify Follow
        </button>
      )}

      {step === 'checking' && (
        <button disabled className="w-full py-2.5 bg-[#3182F6] text-white text-sm font-semibold rounded-xl opacity-70">
          Checking...
        </button>
      )}
    </div>
  );
}
