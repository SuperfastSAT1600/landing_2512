'use client';

import { useState } from 'react';

interface Props {
  onVerified: (username: string) => void;
}

export default function FollowVerifier({ onVerified }: Props) {
  const [username, setUsername] = useState('');

  const trimmed = username.trim().replace(/^@/, '');

  return (
    <div className="bg-gray-50 rounded-2xl p-5">
      <p className="text-sm font-semibold text-gray-800 mb-1">Step 1. Enter your Instagram username</p>
      <p className="text-xs text-gray-400 mb-4">
        Please follow{' '}
        <a
          href="https://www.instagram.com/superfastsat.official/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#3182F6] underline"
        >
          @superfastsat.official
        </a>{' '}
        before submitting
      </p>

      <input
        type="text"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="Instagram username (without @)"
        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-[#3182F6] mb-3"
      />

      <button
        onClick={() => onVerified(trimmed)}
        disabled={!trimmed}
        className="w-full py-2.5 bg-[#3182F6] hover:bg-[#1B6AE0] text-white text-sm font-semibold rounded-xl disabled:opacity-40 transition-colors"
      >
        Continue
      </button>
    </div>
  );
}
