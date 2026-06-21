'use client';

import { useState, useEffect, useRef } from 'react';
import { Sparkles, Activity, Loader2, X, ArrowRight } from 'lucide-react';
import { kstDateStr } from '@/types/crm';

type Mode = 'diagnosis' | 'weekly';

interface BriefArea {
  title: string;
  severity: 'critical' | 'warn';
  why: string;
  suggestion: string;
  question?: string;
}

interface Props {
  adminKey: string;
  onOpenStrategy: () => void;
}

const today = () => kstDateStr(Date.now());
const briefKey = (m: Mode) => `crm-insight-brief:${m}:${today()}`;
const dismissKey = (m: Mode) => `crm-insight-dismissed:${m}:${today()}`;

function readBrief(m: Mode): BriefArea[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(briefKey(m));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed.areas) ? parsed.areas : null;
  } catch {
    return null;
  }
}
function writeBrief(m: Mode, areas: BriefArea[]) {
  try {
    localStorage.setItem(briefKey(m), JSON.stringify({ areas }));
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
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const fetchedRef = useRef<Set<Mode>>(new Set());

  useEffect(() => {
    if (!adminKey) return;
    if (isDismissed(mode)) {
      setDismissed(true);
      setAreas(null);
      return;
    }
    setDismissed(false);
    const cached = readBrief(mode);
    if (cached) {
      setAreas(cached);
      return;
    }
    if (fetchedRef.current.has(mode)) return;
    void load(mode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminKey, mode]);

  async function load(m: Mode) {
    fetchedRef.current.add(m);
    setLoading(true);
    try {
      const res = await fetch('/api/crm/insight-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
        body: JSON.stringify({ mode: m }),
      });
      if (!res.ok) {
        setAreas([]);
        return;
      }
      const json = await res.json();
      const a: BriefArea[] = Array.isArray(json.areas) ? json.areas : [];
      writeBrief(m, a);
      setAreas(a);
    } catch {
      setAreas([]);
    } finally {
      setLoading(false);
    }
  }

  function rescan() {
    try {
      localStorage.removeItem(briefKey(mode));
      localStorage.removeItem(dismissKey(mode));
    } catch {
      /* ignore */
    }
    fetchedRef.current.delete(mode);
    setDismissed(false);
    setAreas(null);
    void load(mode);
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
                  {a.title}
                  <span className="ml-1.5 font-normal text-gray-500">— {a.why}</span>
                </p>
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
