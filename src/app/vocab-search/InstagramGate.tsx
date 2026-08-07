'use client';

import { useState, useSyncExternalStore } from 'react';
import { Search, Loader2 } from 'lucide-react';

const STORAGE_KEY = 'vocab_search_v2';

function subscribe(callback: () => void) {
  window.addEventListener('storage', callback);
  return () => window.removeEventListener('storage', callback);
}

function getSnapshot() {
  return localStorage.getItem(STORAGE_KEY) ?? null;
}

function getServerSnapshot() {
  return null;
}

export function InstagramGate({ children }: { children: React.ReactNode }) {
  const stored = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [instagramId, setInstagramId] = useState('');
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  if (stored) return <>{children}</>;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!instagramId.trim() || !code.trim()) return;
    setStatus('loading');
    setErrorMsg('');

    try {
      const res = await fetch('/api/vocab-access/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instagram_id: instagramId.trim(), code: code.trim() }),
      });
      const json = await res.json();

      if (!res.ok) {
        setErrorMsg(json.error?.message ?? '코드가 올바르지 않아요.');
        setStatus('error');
        return;
      }

      localStorage.setItem(STORAGE_KEY, json.data.instagram_id);
      window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY }));
    } catch {
      setErrorMsg('네트워크 오류가 발생했어요. 다시 시도해주세요.');
      setStatus('error');
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 rounded-2xl overflow-hidden shadow-sm border border-gray-200 bg-white">
      <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-100 bg-gray-50">
        <div className="w-9 h-9 rounded-full bg-primary-50 flex items-center justify-center flex-shrink-0">
          <Search size={16} className="text-primary-600" />
        </div>
        <div>
          <p className="text-gray-900 font-bold text-sm">SAT 단어 검색</p>
          <p className="text-gray-500 text-xs mt-0.5">발급받은 코드를 입력하면 바로 이용할 수 있어요.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="px-6 py-6 space-y-3">
        <input
          value={instagramId}
          onChange={(e) => setInstagramId(e.target.value)}
          placeholder="인스타그램 ID (@ 제외)"
          autoComplete="off"
          className="w-full px-4 py-2.5 rounded-xl border border-gray-300 bg-white text-gray-900 text-sm outline-none focus:border-primary-500 transition-colors"
        />
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="6자리 코드"
          inputMode="numeric"
          maxLength={6}
          autoComplete="off"
          className="w-full px-4 py-2.5 rounded-xl border border-gray-300 bg-white text-gray-900 text-sm outline-none focus:border-primary-500 transition-colors tracking-widest font-mono"
        />

        {status === 'error' && (
          <p className="text-red-500 text-xs">{errorMsg}</p>
        )}

        <button
          type="submit"
          disabled={status === 'loading' || !instagramId.trim() || code.length !== 6}
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-primary-600 hover:bg-primary-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold transition-colors"
        >
          {status === 'loading' ? <Loader2 size={14} className="animate-spin" /> : null}
          입력 완료
        </button>
      </form>
    </div>
  );
}
