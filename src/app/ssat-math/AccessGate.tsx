'use client';

import { useState } from 'react';

const STORAGE_KEY = 'ssat_math_access_v1';

export function AccessGate({ children }: { children: (studentId: string) => React.ReactNode }) {
  const stored = typeof window !== 'undefined' ? sessionStorage.getItem(STORAGE_KEY) : null;
  const [studentId, setStudentId] = useState<string | null>(stored);
  const [name, setName] = useState('');

  const handleStart = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    sessionStorage.setItem(STORAGE_KEY, trimmed);
    setStudentId(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleStart();
  };

  if (studentId) return <>{children(studentId)}</>;

  return (
    <div className="fixed inset-0 z-50 bg-[#000000] text-gray-100 font-sans flex flex-col items-center justify-center px-4">
      <header className="mb-10 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-3 text-white">
          SSAT Math Practice
        </h1>
        <p className="text-gray-400 text-lg">이름을 입력하고 시작하세요.</p>
      </header>

      <div className="w-full max-w-sm bg-[#09090b] rounded-2xl border border-white/5 shadow-2xl p-6 md:p-8">
        <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">
          이름
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="이름을 입력해주세요"
          autoComplete="off"
          autoFocus
          className="w-full px-4 py-3 bg-[#000000] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#071be9] focus:ring-2 focus:ring-[#071be9]/20 text-base mb-4"
        />
        <button
          onClick={handleStart}
          disabled={!name.trim()}
          className="w-full py-4 bg-[#071be9] hover:bg-[#1a31f0] rounded-xl font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed text-lg shadow-lg shadow-[#071be9]/20"
        >
          시작하기
        </button>
      </div>
    </div>
  );
}
