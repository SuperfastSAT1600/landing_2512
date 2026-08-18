'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Loader2 } from 'lucide-react';
import { SectionCard } from './SectionCard';
import type { Student } from '@/types/crm';

interface Props {
  student: Student;
  adminKey: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export function SalesStrategySection({ student, adminKey }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages]);

  // 저장된 대화 불러오기 — 학생이 바뀌면(패널 재진입 포함) 이어서 진행
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/crm/sales-strategy?studentId=${student.id}`, {
      headers: { 'x-admin-key': adminKey },
    })
      .then((r) => (r.ok ? r.json() : { data: [] }))
      .then((j) => { if (!cancelled) setMessages(j.data ?? []); })
      .catch((err) => console.error('[SalesStrategySection] messages fetch failed:', err));
    return () => { cancelled = true; };
  }, [student.id, adminKey]);

  async function send() {
    const text = input.trim();
    if (!text || streaming) return;

    const next: ChatMessage[] = [...messages, { role: 'user', content: text }];
    setMessages([...next, { role: 'assistant', content: '' }]);
    setInput('');
    setError(null);
    setStreaming(true);

    try {
      const res = await fetch('/api/crm/sales-strategy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
        body: JSON.stringify({ studentId: student.id, messages: next }),
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
      // 빈 어시스턴트 자리 제거
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
    <SectionCard
      title="세일즈 전략 AI"
      defaultOpen={false}
      bodyClassName="px-4 py-3"
    >
      <div className="flex flex-col gap-3">
        {messages.length === 0 ? (
          <div className="flex items-start gap-2 rounded-lg bg-indigo-50/60 border border-indigo-100 px-3 py-2.5">
            <Sparkles size={16} className="text-indigo-500 mt-0.5 shrink-0" />
            <p className="text-sm leading-relaxed text-indigo-900/80">
              현재 학생 상황을 입력하면, 이전 상담·결제 전환·이탈 기록과 유사한 과거 사례를 바탕으로
              결제를 이끌어낼 세일즈 전략을 함께 논의합니다.
            </p>
          </div>
        ) : (
          <div ref={listRef} className="max-h-[360px] overflow-y-auto space-y-2.5 pr-1">
            {messages.map((m, i) => (
              <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                <div
                  className={`max-w-[88%] rounded-lg px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                    m.role === 'user'
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {m.content || (
                    <span className="inline-flex items-center gap-1 text-gray-400">
                      <Loader2 size={13} className="animate-spin" /> 분석 중…
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {error && <p className="text-xs text-red-500">{error}</p>}

        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
            placeholder="예: 학부모가 가격에 부담을 느끼고 경쟁 학원과 비교 중입니다. 어떻게 설득할까요?"
            className="flex-1 resize-none text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
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
    </SectionCard>
  );
}
