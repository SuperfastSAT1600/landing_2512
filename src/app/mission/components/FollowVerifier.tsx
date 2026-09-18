'use client';

import { useState } from 'react';

interface Props {
  onVerified: (username: string) => void;
}

type Status = 'idle' | 'loading' | 'verified' | 'not_follower' | 'error';

export default function FollowVerifier({ onVerified }: Props) {
  const [username, setUsername] = useState('');
  const [status, setStatus] = useState<Status>('idle');

  async function handleVerify() {
    const trimmed = username.trim().replace(/^@/, '');
    if (!trimmed) return;

    setStatus('loading');
    try {
      const res = await fetch(`/api/mission/verify-follow?username=${encodeURIComponent(trimmed)}`);
      const json = await res.json();

      if (!res.ok) {
        setStatus('error');
        return;
      }

      if (json.data.verified) {
        setStatus('verified');
        onVerified(trimmed);
      } else {
        setStatus('not_follower');
      }
    } catch {
      setStatus('error');
    }
  }

  return (
    <div className="bg-gray-50 rounded-2xl p-5 mb-6">
      <p className="text-sm font-semibold text-gray-800 mb-3">
        Step 1. 인스타그램 팔로우 인증
      </p>
      <div className="flex gap-2">
        <input
          type="text"
          value={username}
          onChange={(e) => { setUsername(e.target.value); setStatus('idle'); }}
          onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
          placeholder="인스타 아이디 (@ 없이)"
          disabled={status === 'verified'}
          className="flex-1 border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 disabled:bg-gray-100"
        />
        {status !== 'verified' && (
          <button
            onClick={handleVerify}
            disabled={status === 'loading' || !username.trim()}
            className="px-4 py-2.5 bg-orange-500 text-white text-sm font-semibold rounded-xl hover:bg-orange-600 disabled:opacity-50 transition-colors whitespace-nowrap"
          >
            {status === 'loading' ? '확인 중...' : '팔로우 확인'}
          </button>
        )}
      </div>

      {status === 'verified' && (
        <p className="mt-2 text-sm text-green-600 font-medium">
          팔로우 확인됐어요! 아래에서 인증을 제출해주세요.
        </p>
      )}
      {status === 'not_follower' && (
        <p className="mt-2 text-sm text-red-500">
          팔로우가 확인되지 않았어요.{' '}
          <a
            href="https://instagram.com/superfastsat.official"
            target="_blank"
            rel="noopener noreferrer"
            className="underline font-semibold"
          >
            팔로우하러 가기
          </a>{' '}
          후 다시 확인해주세요.
        </p>
      )}
      {status === 'error' && (
        <p className="mt-2 text-sm text-red-500">오류가 발생했어요. 잠시 후 다시 시도해주세요.</p>
      )}
    </div>
  );
}
