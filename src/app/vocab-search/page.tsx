'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { ArrowUp, Loader2 } from 'lucide-react';
import { InstagramGate } from './InstagramGate';
import { AIResponse } from './ResultList';

export interface VocabSearchExample {
  question_id: string;
  skill: string;
  difficulty: string;
  domain: string;
  sentence: string;
  surfaces: string[];
}

export interface VocabSearchVerdict {
  tier: 1 | 2 | 3 | 4;
  text: string;
}

export interface VocabSearchResult {
  query: string;
  lemma: string;
  count: number;
  surface_forms: Record<string, number>;
  examples: VocabSearchExample[];
  truncated: boolean;
  verdict: VocabSearchVerdict | null;
}

type ChatMessage =
  | { id: string; type: 'user'; query: string }
  | { id: string; type: 'loading' }
  | { id: string; type: 'ai'; result: VocabSearchResult }
  | { id: string; type: 'error' };

const SUGGESTIONS = ['significant', 'corroborate', 'nuanced'];

function Avatar() {
  return (
    <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gray-900 flex items-center justify-center mt-0.5">
      <span className="text-white text-[11px] font-bold tracking-tight">S</span>
    </div>
  );
}

export default function VocabSearchPage() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const runSearch = useCallback(async (word: string) => {
    const trimmed = word.trim();
    if (!trimmed || isLoading) return;

    const userId = crypto.randomUUID();
    const aiId = crypto.randomUUID();

    setMessages(prev => [
      ...prev,
      { id: userId, type: 'user', query: trimmed },
      { id: aiId, type: 'loading' },
    ]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch(`/api/vocab-search?word=${encodeURIComponent(trimmed)}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message);
      setMessages(prev => prev.map(m =>
        m.id === aiId ? { id: aiId, type: 'ai' as const, result: json.data } : m
      ));
    } catch {
      setMessages(prev => prev.map(m =>
        m.id === aiId ? { id: aiId, type: 'error' as const } : m
      ));
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isLoading]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const hasMessages = messages.length > 0;

  return (
    <InstagramGate>
      {/* ── Thread ── */}
      <div className="fixed inset-0 z-10 bg-white overflow-y-auto pt-24 pb-52">
        {!hasMessages ? (
          <div className="flex flex-col items-center px-4 pt-20">
              <h1 className="text-2xl font-semibold text-gray-900 mb-2 text-center">
                어떤 단어가 궁금하세요?
              </h1>
              <p className="text-gray-400 text-sm text-center mb-8">
                QB 지문 1,839개에서 실제 쓰임을 알려드려요
              </p>
              <div className="flex flex-wrap justify-center gap-2 max-w-sm">
                {SUGGESTIONS.map((w) => (
                  <button
                    key={w}
                    onClick={() => runSearch(w)}
                    className="text-sm text-gray-500 border border-gray-200 rounded-full px-4 py-1.5 hover:bg-gray-50 hover:border-gray-300 transition-colors cursor-pointer"
                  >
                    {w}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto w-full px-4 py-6 space-y-1">
              {messages.map((msg) => {
                if (msg.type === 'user') {
                  return (
                    <div key={msg.id} className="flex justify-end py-1">
                      <div className="bg-gray-100 rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-[70%]">
                        <p className="text-gray-800 text-sm font-medium">{msg.query}</p>
                      </div>
                    </div>
                  );
                }
                if (msg.type === 'loading') {
                  return (
                    <div key={msg.id} className="flex gap-3 py-2 items-start">
                      <Avatar />
                      <div className="flex items-center gap-1 h-8">
                        {[0, 150, 300].map((delay) => (
                          <span
                            key={delay}
                            className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-bounce"
                            style={{ animationDelay: `${delay}ms` }}
                          />
                        ))}
                      </div>
                    </div>
                  );
                }
                if (msg.type === 'error') {
                  return (
                    <div key={msg.id} className="flex gap-3 py-2 items-start">
                      <Avatar />
                      <p className="text-red-400 text-sm pt-1.5">검색 중 오류가 발생했어요.</p>
                    </div>
                  );
                }
                if (msg.type === 'ai') {
                  return (
                    <div key={msg.id} className="flex gap-3 py-2 items-start">
                      <Avatar />
                      <div className="flex-1 min-w-0 pb-4">
                        <AIResponse result={msg.result} />
                      </div>
                    </div>
                  );
                }
                return null;
              })}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

      {/* ── Input bar — FloatingCTA(~82px) 위에 독립 고정 ── */}
      <div className="fixed left-0 right-0 z-20 bg-white/95 backdrop-blur-sm border-t border-gray-100 px-4 pt-3 pb-3 bottom-24">
        <form
          onSubmit={(e) => { e.preventDefault(); runSearch(input); }}
          className="max-w-2xl mx-auto"
        >
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 focus-within:border-gray-300 focus-within:bg-white focus-within:shadow-md transition-all duration-150">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="단어를 입력하세요…"
              disabled={isLoading}
              className="flex-1 bg-transparent text-gray-900 text-sm outline-none placeholder:text-gray-400 disabled:opacity-50"
              autoComplete="off"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-xl bg-gray-900 hover:bg-gray-700 disabled:opacity-20 disabled:cursor-not-allowed text-white transition-colors"
              aria-label="검색"
            >
              {isLoading
                ? <Loader2 size={14} className="animate-spin" />
                : <ArrowUp size={14} />}
            </button>
          </div>
          <p className="text-[11px] text-gray-300 text-center mt-2">
            단어를 계속 추가해서 비교할 수 있어요
          </p>
        </form>
      </div>
    </InstagramGate>
  );
}
