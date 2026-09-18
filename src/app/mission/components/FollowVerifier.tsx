'use client';

import { useState } from 'react';

interface Props {
  onVerified: (username: string) => void;
}

export default function FollowVerifier({ onVerified }: Props) {
  const [username, setUsername] = useState('');
  const [followed, setFollowed] = useState(false);

  const trimmed = username.trim().replace(/^@/, '');
  const canSubmit = trimmed && followed;

  function handleConfirm() {
    if (!canSubmit) return;
    onVerified(trimmed);
  }

  return (
    <div className="bg-gray-50 rounded-2xl p-5 mb-6">
      <p className="text-sm font-semibold text-gray-800 mb-3">
        Step 1. 인스타그램 팔로우 인증
      </p>

      <div className="space-y-3">
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="인스타 아이디 (@ 없이)"
          className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-orange-400"
        />

        <a
          href="https://instagram.com/superfastsat.official"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-2.5 border-2 border-orange-500 text-orange-600 text-sm font-semibold rounded-xl hover:bg-orange-50 transition-colors"
        >
          @superfastsat.official 팔로우하러 가기
        </a>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={followed}
            onChange={(e) => setFollowed(e.target.checked)}
            className="w-4 h-4 accent-orange-500"
          />
          <span className="text-sm text-gray-700">팔로우 완료했어요</span>
        </label>

        <button
          onClick={handleConfirm}
          disabled={!canSubmit}
          className="w-full py-2.5 bg-orange-500 text-white text-sm font-semibold rounded-xl hover:bg-orange-600 disabled:opacity-40 transition-colors"
        >
          인증 제출하기
        </button>
      </div>
    </div>
  );
}
