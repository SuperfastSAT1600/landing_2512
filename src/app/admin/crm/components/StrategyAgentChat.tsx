'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Loader2, Globe, RotateCcw, Activity } from 'lucide-react';
import type { InsightPeriod } from '@/types/crm';
import { PeriodPicker, defaultPeriod } from './PeriodPicker';

interface Props {
  adminKey: string;
  period?: InsightPeriod; // 배너에서 넘어온 초기 분석 기간 — 없으면 기본(최근 30일)
  // 배너 '이어서 전략 짜기'에서 고른 안건 시드. key가 바뀌면 그 안건으로 새 스레드 시작.
  seed?: { key: number; text: string; period: InsightPeriod };
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

export function StrategyAgentChat({ adminKey, period: initialPeriod, seed }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>(loadChat);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [loadingLabel, setLoadingLabel] = useState('분석·검색 중…');
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<InsightPeriod>(initialPeriod ?? defaultPeriod());
  const listRef = useRef<HTMLDivElement>(null);
  const proactiveRanRef = useRef(false);
  const seedKeyRef = useRef<number | undefined>(undefined); // 이미 처리한 시드 key

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages]);

  // 배너에서 새 기간으로 다시 진입하면 내부 기간 동기화
  useEffect(() => {
    if (initialPeriod) setPeriod(initialPeriod);
  }, [initialPeriod?.from, initialPeriod?.to]); // eslint-disable-line react-hooks/exhaustive-deps

  // 마운트 시 1회: 저장된 대화가 없으면 지표를 자동 점검해 선제 진단으로 연다.
  // 단, 배너에서 시드(안건)를 들고 진입했으면 자동 점검 대신 시드 스레드로 시작(아래 효과가 처리).
  // ref 가드로 StrictMode 더블 마운트·탭 재진입 시 중복 호출을 막는다.
  useEffect(() => {
    if (proactiveRanRef.current) return;
    if (seed) { proactiveRanRef.current = true; return; }
    proactiveRanRef.current = true;
    if (messages.length === 0) runProactive();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 배너 '이어서 전략 짜기'에서 고른 안건 시드 → 그 안건을 첫 사용자 메시지로 새 스레드 시작.
  useEffect(() => {
    if (!seed || seedKeyRef.current === seed.key || streaming) return;
    seedKeyRef.current = seed.key;
    proactiveRanRef.current = true;
    setPeriod(seed.period);
    const first: ChatMessage[] = [{ role: 'user', content: seed.text }];
    streamFrom({ messages: first }, first, '분석·검색 중…', seed.period);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed?.key]);

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

  // send()와 runProactive() 공유 스트림 로직. base = 화면에 표시할 메시지(assistant placeholder는 여기서 추가).
  async function streamFrom(
    requestBody: { messages: ChatMessage[] } | { mode: 'proactive' },
    base: ChatMessage[],
    label: string,
    usePeriod: InsightPeriod = period
  ) {
    if (streaming) return;
    setMessages([...base, { role: 'assistant', content: '' }]);
    setError(null);
    setLoadingLabel(label);
    setStreaming(true);

    try {
      const res = await fetch('/api/crm/strategy-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
        body: JSON.stringify({ ...requestBody, from: usePeriod.from, to: usePeriod.to }),
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

  function send() {
    const text = input.trim();
    if (!text || streaming) return;
    const next: ChatMessage[] = [...messages, { role: 'user', content: text }];
    setInput('');
    streamFrom({ messages: next }, next, '분석·검색 중…');
  }

  // 지표를 스캔해 선제 진단을 연다(서버가 seed user turn 합성, 화면엔 assistant만).
  function runProactive(usePeriod: InsightPeriod = period) {
    streamFrom({ mode: 'proactive' }, [], '지표 점검 중…', usePeriod);
  }

  // 기간 변경 → 그 기간 기준으로 선제 진단을 새로 연다(대화 있으면 확인 후 초기화).
  function applyPeriod(p: InsightPeriod) {
    if (streaming) return;
    if (messages.length > 0 && !confirm('분석 기간을 바꾸면 현재 대화를 지우고 새 기간으로 다시 점검합니다. 계속할까요?')) return;
    setPeriod(p);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    runProactive(p); // setPeriod 반영 지연 회피 위해 명시 전달
  }

  function rescan() {
    if (streaming) return;
    if (messages.length > 0 && !confirm('현재 대화를 지우고 지표를 다시 점검할까요?')) return;
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    runProactive();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className="border border-indigo-200 rounded-xl overflow-hidden bg-white">
      <div className="px-4 py-3 border-b border-indigo-100 bg-indigo-50/60 space-y-2">
        <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles size={17} className="text-indigo-500 shrink-0" />
          <div>
            <h3 className="text-lg font-bold text-gray-800">전략 에이전트</h3>
            <p className="text-sm text-gray-500 flex items-center gap-1">
              <Globe size={11} className="text-indigo-400" />
              세계적 세일즈 기법 · 웹 검색 · 우리 상담 기록을 바탕으로 새 전략 설계
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={rescan}
            disabled={streaming}
            className="flex items-center gap-1 text-xs font-medium text-indigo-500 hover:text-indigo-700 disabled:opacity-40"
            title="지표를 다시 점검해 선제 진단 받기"
          >
            <Activity size={13} />다시 점검
          </button>
          {messages.length > 0 && (
            <button
              onClick={resetChat}
              disabled={streaming}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 disabled:opacity-40"
              title="새 대화 시작"
            >
              <RotateCcw size={13} />새 대화
            </button>
          )}
        </div>
        </div>
        <PeriodPicker period={period} onApply={applyPeriod} disabled={streaming} />
      </div>

      <div className="px-4 py-3">
        {messages.length === 0 ? (
          <div className="flex items-start gap-2 rounded-lg bg-indigo-50/60 border border-indigo-100 px-3 py-2.5">
            <Sparkles size={16} className="text-indigo-500 mt-0.5 shrink-0" />
            <div className="text-base leading-relaxed text-indigo-900/80">
              <p className="mb-1">
                결제 전환율을 높일 새로운 세일즈 전략을 함께 설계합니다. 전 세계 비즈니스·세일즈
                대가들의 프레임워크와 인터넷 최신 사례, 그리고 우리 실제 상담·전환·이탈 기록을 함께
                참고합니다.
              </p>
              <p className="text-indigo-900/60 mb-2">
                예: &ldquo;가격 부담으로 이탈하는 리드를 줄일 오퍼 구조를 설계해줘&rdquo; ·
                &ldquo;세일즈 콜 전환율을 높이는 최신 기법을 우리 데이터에 맞게 적용해줘&rdquo;
              </p>
              <button
                onClick={() => runProactive()}
                disabled={streaming}
                className="inline-flex items-center gap-1.5 text-xs font-semibold bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 disabled:opacity-40 transition-colors"
              >
                <Activity size={13} />지금 지표 점검 받기
              </button>
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
                  className={`max-w-[88%] rounded-lg px-3.5 py-2.5 text-base leading-relaxed whitespace-pre-wrap ${
                    m.role === 'user' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {m.content || (
                    <span className="inline-flex items-center gap-1 text-gray-400">
                      <Loader2 size={13} className="animate-spin" /> {loadingLabel}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {error && <p className="mt-2 text-xs text-red-500">{error}</p>}

        <div className="flex items-end gap-2 mt-3">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
            placeholder="설계하고 싶은 전략이나 풀고 싶은 문제를 입력하세요…"
            className="flex-1 resize-none text-base border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
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
