'use client';

import { useState } from 'react';

interface Props {
  onLogin: (username: string) => void;
}

export function LoginScreen({ onLogin }: Props) {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = value.trim().replace(/^@/, '');
    if (!trimmed) { setError('인스타그램 아이디를 입력해주세요.'); return; }
    if (!/^[\w.][\w.]{0,29}$/.test(trimmed)) { setError('올바른 인스타그램 아이디 형식이 아닙니다.'); return; }
    onLogin(trimmed);
  }

  return (
    <div className="min-h-screen bg-[#0f1117] text-white flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* 로고 */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="2" width="20" height="20" rx="5" />
              <circle cx="12" cy="12" r="5" />
              <circle cx="17.5" cy="6.5" r="1.5" fill="white" stroke="none" />
            </svg>
          </div>
          <h1 className="text-xl font-bold">10월 SAT 수학 체크</h1>
          <p className="text-gray-400 text-sm mt-1">인스타그램 아이디로 참여하세요</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">@</span>
            <input
              type="text"
              value={value}
              onChange={e => { setValue(e.target.value); setError(''); }}
              placeholder="instagram_id"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-8 pr-4 py-3 text-sm text-white placeholder-gray-600 outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-3 text-sm font-semibold transition-colors"
          >
            참여하기
          </button>
        </form>

        <p className="text-center text-xs text-gray-600 mt-6">
          아이디는 응답 집계용으로만 사용되며 공개되지 않습니다.
        </p>
      </div>
    </div>
  );
}
