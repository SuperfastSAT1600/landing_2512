'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Loader2, Globe, RotateCcw } from 'lucide-react';

interface Props {
  adminKey: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// 대화를 브라우저에 보존 — 탭을 옮기거나 새로고침해도 이어서 진행 (학생에 묶이지 않는 단일 작업 대화)
const STORAGE_KEY = 'crm-strategy-agent-chat';

function loadChat(): ChatMessage[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ChatMessage[]) : [];
  } catch {
    return [];
  }
}

export function StrategyAgentChat({ adminKey }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>(loadChat);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages]);

  // 스트리밍이 끝난 시점의 최종 대화를 보존 (스트리밍 중 매 델타 저장은 생략)
  useEffect(() => {
    if (!streaming) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
      } catch {
        /* quota/unavailable */
      }
    }
  }, [messages, streaming]);

  function resetChat() {
    if (streaming) return;
    if (messages.length > 0 && !confirm('현재 전략 대화를 모두 지우고 새로 시작할까요?')) return;
    setMessages([]);
    setError(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }

  async function send() {
    const text = input.trim();
    if (!text || streaming) return;

    const next: ChatMessage[] = [...messages, { role: 'user', content: text }];
    setMessages([...next, { role: 'assistant', content: '' }]);
    setInput('');
    setError(null);
    setStreaming(true);

    try {
      const res = await fetch('/api/crm/strategy-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
        body: JSON.stringify({ messages: next }),
      });

      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error?.message ?? 'AI 응답을 받지 못했습니다.');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = '';
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = { role: 'assistant', content: acc };
          return copy;
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '오류가 발생했습니다.');
      setMessages((prev) => (prev[prev.length - 1]?.content === '' ? prev.slice(0, -1) : prev));
    } finally {
      setStreaming(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className="border border-indigo-200 rounded-xl overflow-hidden bg-white">
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-indigo-100 bg-indigo-50/60">
        <div className="flex items-center gap-2">
          <Sparkles size={15} className="text-indigo-500 shrink-0" />
          <div>
            <h3 className="text-sm font-bold text-gray-800">전략 설계 AI</h3>
            <p className="text-[11px] text-gray-500 flex items-center gap-1">
              <Globe size={10} className="text-indigo-400" />
              세계적 세일즈 기법 · 웹 검색 · 우리 상담 기록을 바탕으로 새 전략 설계
            </p>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            onClick={resetChat}
            disabled={streaming}
            className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-600 disabled:opacity-40 shrink-0"
            title="새 대화 시작"
          >
            <RotateCcw size={12} />새 대화
          </button>
        )}
      </div>

      <div className="px-4 py-3">
        {messages.length === 0 ? (
          <div className="flex items-start gap-2 rounded-lg bg-indigo-50/60 border border-indigo-100 px-3 py-2.5">
            <Sparkles size={14} className="text-indigo-500 mt-0.5 shrink-0" />
            <div className="text-[12px] leading-relaxed text-indigo-900/80">
              <p className="mb-1">
                결제 전환율을 높일 새로운 세일즈 전략을 함께 설계합니다. 전 세계 비즈니스·세일즈
                대가들의 프레임워크와 인터넷 최신 사례, 그리고 우리 실제 상담·전환·이탈 기록을 함께
                참고합니다.
              </p>
              <p className="text-indigo-900/60">
                예: &ldquo;가격 부담으로 이탈하는 리드를 줄일 오퍼 구조를 설계해줘&rdquo; ·
                &ldquo;세일즈 콜 전환율을 높이는 최신 기법을 우리 데이터에 맞게 적용해줘&rdquo;
              </p>
            </div>
          </div>
        ) : (
          <div ref={listRef} className="max-h-[480px] overflow-y-auto space-y-2.5 pr-1">
            {messages.map((m, i) => (
              <div
                key={i}
                className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}
              >
                <div
                  className={`max-w-[88%] rounded-lg px-3 py-2 text-[12px] leading-relaxed whitespace-pre-wrap ${
                    m.role === 'user' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {m.content || (
                    <span className="inline-flex items-center gap-1 text-gray-400">
                      <Loader2 size={12} className="animate-spin" /> 분석·검색 중…
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {error && <p className="mt-2 text-[11px] text-red-500">{error}</p>}

        <div className="flex items-end gap-2 mt-3">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
            placeholder="설계하고 싶은 전략이나 풀고 싶은 문제를 입력하세요…"
            className="flex-1 resize-none text-[12px] border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
          <button
            onClick={send}
            disabled={streaming || !input.trim()}
            className="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-lg bg-indigo-600 text-white disabled:opacity-40 hover:bg-indigo-700 transition-colors"
            aria-label="전송"
          >
            {streaming ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
          </button>
        </div>
      </div>
    </div>
  );
}
