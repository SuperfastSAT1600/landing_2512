'use client';

import { useState, useSyncExternalStore } from 'react';
import { Instagram, CheckCircle2, Search } from 'lucide-react';

const INSTAGRAM_URL = 'https://www.instagram.com/superfastsat.official/';
const STORAGE_KEY = 'vocab_search_unlocked';

function subscribe(callback: () => void) {
  window.addEventListener('storage', callback);
  return () => window.removeEventListener('storage', callback);
}

function getSnapshot() {
  return localStorage.getItem(STORAGE_KEY) === '1';
}

function getServerSnapshot() {
  return false;
}

export function InstagramGate({ children }: { children: React.ReactNode }) {
  const unlocked = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [visited, setVisited] = useState(false);

  const handleUnlock = () => {
    localStorage.setItem(STORAGE_KEY, '1');
    // localStorage's native 'storage' event only fires in *other* tabs, so
    // dispatch it manually to make useSyncExternalStore re-check this tab too.
    window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY }));
  };

  if (unlocked) return <>{children}</>;

  return (
    <div className="max-w-md mx-auto mt-10 rounded-2xl overflow-hidden shadow-sm border border-gray-200 bg-white">
      <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-100 bg-gray-50">
        <div className="w-9 h-9 rounded-full bg-primary-50 flex items-center justify-center flex-shrink-0">
          <Search size={16} className="text-primary-600" />
        </div>
        <div>
          <p className="text-gray-900 font-bold text-sm">SAT 단어 검색</p>
          <p className="text-gray-500 text-xs mt-0.5">팔로우하면 바로 이용할 수 있어요.</p>
        </div>
      </div>

      <div className="px-6 py-6 space-y-4">
        <a
          href={INSTAGRAM_URL}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => setVisited(true)}
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-primary-600 hover:bg-primary-500 text-white text-sm font-bold transition-colors"
        >
          <Instagram size={16} />
          @superfastsat.official 팔로우하러 가기
        </a>

        <button
          onClick={handleUnlock}
          disabled={!visited}
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-bold text-white
            bg-primary-600 hover:bg-primary-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <CheckCircle2 size={16} />
          팔로우 완료했어요
        </button>
      </div>
    </div>
  );
}
