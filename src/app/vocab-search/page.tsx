'use client';

import { useState, useCallback } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { InstagramGate } from './InstagramGate';
import { ResultList } from './ResultList';

export interface VocabSearchExample {
  question_id: string;
  skill: string;
  difficulty: string;
  domain: string;
  sentence: string;
  surfaces: string[];
}

export interface VocabSearchResult {
  query: string;
  lemma: string;
  count: number;
  surface_forms: Record<string, number>;
  examples: VocabSearchExample[];
  truncated: boolean;
}

type Status = 'idle' | 'loading' | 'done' | 'error';

export default function VocabSearchPage() {
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [result, setResult] = useState<VocabSearchResult | null>(null);

  const runSearch = useCallback(async (word: string) => {
    const trimmed = word.trim();
    if (!trimmed) return;
    setStatus('loading');
    try {
      const res = await fetch(`/api/vocab-search?word=${encodeURIComponent(trimmed)}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? '검색에 실패했습니다.');
      setResult(json.data as VocabSearchResult);
      setStatus('done');
    } catch {
      setResult(null);
      setStatus('error');
    }
  }, []);

  return (
    <main className="min-h-screen bg-[#fafaf9] px-4 pt-28 pb-16 sm:pt-32">
      <div className="max-w-2xl mx-auto text-center mb-10">
        <h1 className="text-2xl font-bold text-gray-900">SAT 단어 검색</h1>
        <p className="text-gray-500 text-sm mt-2">
          단어를 입력하면 SuperfastSAT이 보유한 SAT Reading &amp; Writing 지문에서
          몇 번 등장했는지, 실제로 어떤 문장에 쓰였는지 보여드려요.
        </p>
      </div>

      <InstagramGate>
        <div className="max-w-2xl mx-auto">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              runSearch(input);
            }}
            className="flex gap-2 mb-8"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="예: abrupt"
              className="flex-1 px-4 py-3 rounded-xl border border-gray-300 bg-white text-gray-900 outline-none focus:border-primary-500 transition-colors"
              autoComplete="off"
            />
            <button
              type="submit"
              disabled={status === 'loading' || !input.trim()}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-primary-600 hover:bg-primary-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold transition-colors"
            >
              {status === 'loading' ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              검색
            </button>
          </form>

          {status === 'error' && (
            <p className="text-center text-red-500 text-sm">검색 중 오류가 발생했어요. 다시 시도해주세요.</p>
          )}

          {status === 'done' && result && <ResultList result={result} />}
        </div>
      </InstagramGate>
    </main>
  );
}
