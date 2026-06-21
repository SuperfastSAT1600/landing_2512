'use client';

import { useState, useEffect, useRef } from 'react';
import { Sparkles, Activity, Loader2, X, ArrowRight, Microscope } from 'lucide-react';
import { kstDateStr, type InsightBriefArea as BriefArea, type InsightBriefMode as Mode } from '@/types/crm';

interface Props {
  adminKey: string;
  onOpenStrategy: () => void;
}

const today = () => kstDateStr(Date.now());
const briefKey = (m: Mode) => `crm-insight-brief:${m}:${today()}`;
const deepKey = (m: Mode) => `crm-insight-deep:${m}:${today()}`;
const dismissKey = (m: Mode) => `crm-insight-dismissed:${m}:${today()}`;

function readCache(key: string): BriefArea[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed.areas) ? parsed.areas : null;
  } catch {
    return null;
  }
}
function writeCache(key: string, areas: BriefArea[]) {
  try {
    localStorage.setItem(key, JSON.stringify({ areas }));
  } catch {
    /* ignore */
  }
}
function isDismissed(m: Mode): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(dismissKey(m)) === '1';
  } catch {
    return false;
  }
}

const SEV_DOT: Record<string, string> = {
  critical: 'bg-red-500',
  warn: 'bg-amber-500',
};

const MODE_TITLE: Record<Mode, string> = {
  diagnosis: '지금 체크할 부분은 여기야',
  weekly: '이번 주 방향 맞추기 — 꼭 짚을 것',
};
const MODE_LOADING: Record<Mode, string> = {
  diagnosis: '지표 점검 중…',
  weekly: '이번 주 방향 점검 중…',
};

export function CrmInsightBanner({ adminKey, onOpenStrategy }: Props) {
  const [mode, setMode] = useState<Mode>('diagnosis');
  const [areas, setAreas] = useState<BriefArea[] | null>(null);
  const [loading, setLoading] = useState(false); // 첫 결과(빠른/심화) 도착 전
  const [deepPending, setDeepPending] = useState(false); // 심화 분석 진행 중
  const [isDeep, setIsDeep] = useState(false); // 현재 표시 중인 게 심화본인지
  const [dismissed, setDismissed] = useState(false);
  const fetchedRef = useRef<Set<Mode>>(new Set());
  const deepAppliedRef = useRef(false); // 심화본이 적용되면 빠른 응답이 덮어쓰지 못하게

  useEffect(() => {
    if (!adminKey) return;
    if (isDismissed(mode)) {
      setDismissed(true);
      setAreas(null);
      return;
    }
    setDismissed(false);
    // 심화 캐시가 있으면 바로 심화본 표시 (오늘 이미 생성됨)
    const deepCached = readCache(deepKey(mode));
    if (deepCached) {
      setAreas(deepCached);
      setIsDeep(true);
      return;
    }
    const fastCached = readCache(briefKey(mode));
    if (fastCached) {
      setAreas(fastCached);
      setIsDeep(false);
    }
    if (fetchedRef.current.has(mode)) return;
    void load(mode, { force: false, haveFast: !!fastCached });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminKey, mode]);

  async function fetchAreas(m: Mode, deep: boolean, force: boolean): Promise<BriefArea[] | null> {
    try {
      const url = deep ? `/api/crm/insight-brief/deep${force ? '?force=1' : ''}` : '/api/crm/insight-brief';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
        body: JSON.stringify({ mode: m }),
      });
      if (!res.ok) return null;
      const json = await res.json();
      return Array.isArray(json.areas) ? json.areas : [];
    } catch {
      return null;
    }
  }

  async function load(m: Mode, opts: { force: boolean; haveFast: boolean }) {
    fetchedRef.current.add(m);
    deepAppliedRef.current = false;
    setIsDeep(false);
    setDeepPending(true);
    if (!opts.haveFast) setLoading(true);

    // Stage 1: 빠른 정량 인사이트 (즉시 표시) — 캐시로 이미 떠 있으면 갱신만
    const fastP = fetchAreas(m, false, false).then((a) => {
      if (a) {
        writeCache(briefKey(m), a);
        if (!deepAppliedRef.current) setAreas(a);
      }
      setLoading(false);
    });

    // Stage 2: 메모+구루+웹 심화 인사이트 (준비되면 교체)
    const deepP = fetchAreas(m, true, opts.force).then((a) => {
      if (a && a.length > 0) {
        deepAppliedRef.current = true;
        writeCache(deepKey(m), a);
        setAreas(a);
        setIsDeep(true);
      }
      setDeepPending(false);
      setLoading(false);
    });

    await Promise.allSettled([fastP, deepP]);
  }

  function rescan() {
    try {
      localStorage.removeItem(briefKey(mode));
      localStorage.removeItem(deepKey(mode));
      localStorage.removeItem(dismissKey(mode));
    } catch {
      /* ignore */
    }
    fetchedRef.current.delete(mode);
    setDismissed(false);
    setAreas(null);
    void load(mode, { force: true, haveFast: false });
  }

  function dismiss() {
    try {
      localStorage.setItem(dismissKey(mode), '1');
    } catch {
      /* ignore */
    }
    setDismissed(true);
  }

  if (dismissed) return null;
  // 로딩도 아니고, 약점도 없으면(건강) 숨김
  if (!loading && (areas === null || areas.length === 0)) return null;

  return (
    <div className="mb-4 rounded-xl border border-indigo-200 bg-indigo-50/70 px-4 py-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles size={16} className="text-indigo-500 shrink-0" />
          <p className="text-sm font-bold text-indigo-900 truncate">{MODE_TITLE[mode]}</p>
          {deepPending ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-700 shrink-0">
              <Loader2 size={10} className="animate-spin" /> 심화 분석 중…
            </span>
          ) : isDeep ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-700 shrink-0">
              <Microscope size={10} /> 심화
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={rescan}
            disabled={loading}
            className="flex items-center gap-1 text-[11px] font-medium text-indigo-500 hover:text-indigo-700 disabled:opacity-40"
            title="지표 다시 점검"
          >
            <Activity size={12} />다시 점검
          </button>
          <button onClick={dismiss} className="text-indigo-300 hover:text-indigo-500" title="오늘 닫기">
            <X size={15} />
          </button>
        </div>
      </div>

      <div className="mt-2 inline-flex rounded-lg bg-white/70 border border-indigo-200 p-0.5">
        {(['diagnosis', 'weekly'] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            disabled={loading}
            className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors disabled:opacity-50 ${
              mode === m ? 'bg-indigo-600 text-white' : 'text-indigo-600 hover:bg-indigo-100'
            }`}
          >
            {m === 'diagnosis' ? '선제 진단' : '이번 주 방향 맞추기'}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-indigo-400">
          <Loader2 size={13} className="animate-spin" /> {MODE_LOADING[mode]}
        </p>
      ) : (
        <div className="mt-2.5 space-y-2">
          {(areas ?? []).map((a, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${SEV_DOT[a.severity] ?? 'bg-amber-500'}`} />
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-gray-900">
                  {a.lens && (
                    <span className="mr-1.5 inline-block rounded bg-violet-600/10 px-1.5 py-0.5 text-[10px] font-bold align-middle text-violet-700">
                      {a.lens}
                    </span>
                  )}
                  {a.title}
                  <span className="ml-1.5 font-normal text-gray-500">— {a.why}</span>
                </p>
                {a.evidence && (
                  <p className="text-[11px] text-violet-500 mt-0.5">근거: {a.evidence}</p>
                )}
                {mode === 'weekly' ? (
                  a.question && (
                    <p className="text-[13px] text-indigo-700 mt-0.5">
                      <span className="font-medium">날카로운 질문:</span> {a.question}
                    </p>
                  )
                ) : (
                  <p className="text-[13px] text-indigo-700 mt-0.5">
                    <span className="font-medium">이렇게 해보자:</span> {a.suggestion}
                  </p>
                )}
              </div>
            </div>
          ))}

          <button
            onClick={onOpenStrategy}
            className="mt-1 inline-flex items-center gap-1 text-xs font-bold bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            이어서 전략 짜기 <ArrowRight size={13} />
          </button>
        </div>
      )}
    </div>
  );
}
