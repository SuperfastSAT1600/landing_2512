'use client';

import { useState, useEffect, useRef } from 'react';
import { Sparkles, Activity, Loader2, X, ArrowRight, Microscope, CalendarRange } from 'lucide-react';
import { format, parseISO, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { kstDateStr, type InsightBriefArea as BriefArea, type InsightBriefMode as Mode, type InsightPeriod } from '@/types/crm';

interface Props {
  adminKey: string;
  onOpenStrategy: (period: InsightPeriod) => void;
}

const today = () => kstDateStr(Date.now());

/** 기본 분석 기간 = 이번 달 1일 ~ 오늘(KST). */
function defaultPeriod(): InsightPeriod {
  const t = today();
  return { from: `${t.slice(0, 7)}-01`, to: t };
}
const isDefaultPeriod = (p: InsightPeriod) => {
  const d = defaultPeriod();
  return p.from === d.from && p.to === d.to;
};

const periodTag = (p: InsightPeriod) => `${p.from}_${p.to}`;
const scope = (m: Mode, p: InsightPeriod) => `${m}:${periodTag(p)}`;
// 캐시 키에 기간 포함 → 기간 전환 시 캐시 오염 방지. dismiss는 날짜 단위(기간 무관 하루 닫기).
const briefKey = (m: Mode, p: InsightPeriod) => `crm-insight-brief:${m}:${periodTag(p)}`;
const deepKey = (m: Mode, p: InsightPeriod) => `crm-insight-deep:${m}:${periodTag(p)}`;
const dismissKey = (m: Mode) => `crm-insight-dismissed:${m}:${today()}`;

interface Preset {
  id: string;
  label: string;
  range: () => InsightPeriod;
}
const PRESETS: Preset[] = [
  { id: '7d', label: '최근 7일', range: () => ({ from: format(subDays(parseISO(today()), 6), 'yyyy-MM-dd'), to: today() }) },
  { id: '30d', label: '최근 30일', range: () => ({ from: format(subDays(parseISO(today()), 29), 'yyyy-MM-dd'), to: today() }) },
  { id: 'month', label: '이번 달', range: () => defaultPeriod() },
  {
    id: 'prevMonth',
    label: '지난 달',
    range: () => {
      const pm = subMonths(parseISO(today()), 1);
      return { from: format(startOfMonth(pm), 'yyyy-MM-dd'), to: format(endOfMonth(pm), 'yyyy-MM-dd') };
    },
  },
];
function matchPreset(p: InsightPeriod): string {
  const hit = PRESETS.find((ps) => {
    const r = ps.range();
    return r.from === p.from && r.to === p.to;
  });
  return hit?.id ?? 'custom';
}

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
  const [period, setPeriod] = useState<InsightPeriod>(defaultPeriod);
  const [draftFrom, setDraftFrom] = useState(period.from);
  const [draftTo, setDraftTo] = useState(period.to);
  const [areas, setAreas] = useState<BriefArea[] | null>(null);
  const [loading, setLoading] = useState(true); // 첫 결과(빠른/심화) 도착 전 — 마운트 시 즉시 로딩 표시
  const [deepPending, setDeepPending] = useState(false); // 심화 분석 진행 중
  const [isDeep, setIsDeep] = useState(false); // 현재 표시 중인 게 심화본인지
  const [dismissed, setDismissed] = useState(false);
  const fetchedRef = useRef<Set<string>>(new Set()); // 이미 로드한 scope(mode+기간)
  const deepAppliedRef = useRef(false); // 심화본이 적용되면 빠른 응답이 덮어쓰지 못하게
  const latestScopeRef = useRef(''); // 진행 중 로드가 최신 scope인지 — 기간 전환 시 stale 응답 무시

  useEffect(() => {
    if (!adminKey) return;
    if (isDismissed(mode)) {
      setDismissed(true);
      setAreas(null);
      return;
    }
    setDismissed(false);

    // 심화 캐시가 있으면 바로 심화본 표시 (해당 기간 이미 생성됨)
    const deepCached = readCache(deepKey(mode, period));
    if (deepCached) {
      setAreas(deepCached);
      setIsDeep(true);
      setLoading(false);
      setDeepPending(false);
      fetchedRef.current.add(scope(mode, period));
      return;
    }
    const fastCached = readCache(briefKey(mode, period));
    setAreas(fastCached); // 없으면 null → 로딩 표시
    setIsDeep(false);

    if (fetchedRef.current.has(scope(mode, period))) return;
    void load(mode, period, { force: false, haveFast: !!fastCached });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminKey, mode, period.from, period.to]);

  async function fetchAreas(m: Mode, deep: boolean, force: boolean, p: InsightPeriod): Promise<BriefArea[] | null> {
    try {
      const url = deep ? `/api/crm/insight-brief/deep${force ? '?force=1' : ''}` : '/api/crm/insight-brief';
      // 기본(이번 달) 기간은 from/to 생략 → 서버 일 1회 캐시 활용. 커스텀 기간만 명시 전달.
      const body: { mode: Mode; from?: string; to?: string } = { mode: m };
      if (!isDefaultPeriod(p)) {
        body.from = p.from;
        body.to = p.to;
      }
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
        body: JSON.stringify(body),
      });
      if (!res.ok) return null;
      const json = await res.json();
      return Array.isArray(json.areas) ? json.areas : [];
    } catch {
      return null;
    }
  }

  async function load(m: Mode, p: InsightPeriod, opts: { force: boolean; haveFast: boolean }) {
    const sc = scope(m, p);
    fetchedRef.current.add(sc);
    latestScopeRef.current = sc;
    deepAppliedRef.current = false;
    setIsDeep(false);
    setDeepPending(true);
    if (!opts.haveFast) setLoading(true);

    // Stage 1: 빠른 정량 인사이트 (즉시 표시) — 캐시로 이미 떠 있으면 갱신만
    const fastP = fetchAreas(m, false, false, p).then((a) => {
      if (latestScopeRef.current !== sc) return; // 기간 전환됨 → stale 무시
      if (a) {
        writeCache(briefKey(m, p), a);
        if (!deepAppliedRef.current) setAreas(a);
      }
      setLoading(false);
    });

    // Stage 2: 메모+구루+웹 심화 인사이트 (준비되면 교체)
    const deepP = fetchAreas(m, true, opts.force, p).then((a) => {
      if (latestScopeRef.current !== sc) return; // 기간 전환됨 → stale 무시
      if (a && a.length > 0) {
        deepAppliedRef.current = true;
        writeCache(deepKey(m, p), a);
        setAreas(a);
        setIsDeep(true);
      }
      setDeepPending(false);
      setLoading(false);
    });

    await Promise.allSettled([fastP, deepP]);
  }

  function applyPeriod(p: InsightPeriod) {
    setDraftFrom(p.from);
    setDraftTo(p.to);
    setPeriod(p); // effect가 로드 트리거
  }
  function applyCustom() {
    if (!draftFrom || !draftTo || draftFrom > draftTo) return;
    const t = today();
    const to = draftTo > t ? t : draftTo; // 미래 종료일 클램프
    applyPeriod({ from: draftFrom, to });
  }

  function rescan() {
    try {
      localStorage.removeItem(briefKey(mode, period));
      localStorage.removeItem(deepKey(mode, period));
      localStorage.removeItem(dismissKey(mode));
    } catch {
      /* ignore */
    }
    fetchedRef.current.delete(scope(mode, period));
    setDismissed(false);
    setAreas(null);
    void load(mode, period, { force: true, haveFast: false });
  }

  function dismiss() {
    try {
      localStorage.setItem(dismissKey(mode), '1');
    } catch {
      /* ignore */
    }
    setDismissed(true);
  }

  if (!adminKey) return null;
  if (dismissed) return null;
  // 배너는 이제 기간 선택형 분석 도구 — 신호가 없어도 피커와 함께 항상 노출한다(오늘 닫기로 숨김 가능).

  const activePreset = matchPreset(period);
  const hasAreas = !!areas && areas.length > 0;

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

      {/* 분석 기간 선택 — 프리셋 + 직접 입력 */}
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {PRESETS.map((ps) => (
          <button
            key={ps.id}
            onClick={() => applyPeriod(ps.range())}
            disabled={loading}
            className={`px-2 py-1 text-[11px] font-medium rounded-md border transition-colors disabled:opacity-50 ${
              activePreset === ps.id
                ? 'border-indigo-500 bg-indigo-100 text-indigo-700'
                : 'border-indigo-200 text-indigo-500 hover:bg-indigo-100/50'
            }`}
          >
            {ps.label}
          </button>
        ))}
        <span className="mx-0.5 h-4 w-px bg-indigo-200" />
        <input
          type="date"
          value={draftFrom}
          max={today()}
          onChange={(e) => setDraftFrom(e.target.value)}
          disabled={loading}
          className="text-[11px] border border-indigo-200 rounded-md px-2 py-1 bg-white focus:outline-none disabled:opacity-50"
        />
        <span className="text-[11px] text-indigo-400">~</span>
        <input
          type="date"
          value={draftTo}
          max={today()}
          onChange={(e) => setDraftTo(e.target.value)}
          disabled={loading}
          className="text-[11px] border border-indigo-200 rounded-md px-2 py-1 bg-white focus:outline-none disabled:opacity-50"
        />
        <button
          onClick={applyCustom}
          disabled={loading || !draftFrom || !draftTo || draftFrom > draftTo}
          className="px-2.5 py-1 text-[11px] font-semibold rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40"
        >
          조회
        </button>
      </div>
      <p className="mt-1.5 flex items-center gap-1 text-[11px] text-indigo-400">
        <CalendarRange size={11} /> 분석 기간 {period.from} ~ {period.to}
      </p>

      {loading ? (
        <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-indigo-400">
          <Loader2 size={13} className="animate-spin" /> {MODE_LOADING[mode]}
        </p>
      ) : (
        <div className="mt-2.5 space-y-2">
          {hasAreas ? (
            areas!.map((a, i) => (
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
                  {a.evidence && <p className="text-[11px] text-violet-500 mt-0.5">근거: {a.evidence}</p>}
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
            ))
          ) : (
            <p className="text-xs text-indigo-400">이 기간에는 눈에 띄는 약점·정체 신호가 없습니다.</p>
          )}

          <button
            onClick={() => onOpenStrategy(period)}
            className="mt-1 inline-flex items-center gap-1 text-xs font-bold bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            이어서 전략 짜기 <ArrowRight size={13} />
          </button>
        </div>
      )}
    </div>
  );
}
