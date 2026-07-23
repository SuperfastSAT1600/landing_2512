'use client';

import { useState, useEffect, useRef } from 'react';
import { Sparkles, Activity, Loader2, X, ArrowRight, Microscope } from 'lucide-react';
import { kstDateStr, type InsightBriefArea as BriefArea, type InsightBriefMode as Mode, type InsightPeriod } from '@/types/crm';
import { PeriodPicker, defaultPeriod, isDefaultPeriod } from './PeriodPicker';

interface Props {
  adminKey: string;
  // seed가 있으면 그 안건을 전략 에이전트에 이어서 넘긴다(없으면 일반 진입).
  onOpenStrategy: (period: InsightPeriod, seed?: string) => void;
}

// 전략 에이전트 사용 중단으로 '이어서 전략 짜기' CTA 숨김. true로 바꾸면 복구.
// 짝: StrategiesTab.tsx 의 동일 플래그(전략 에이전트 탭).
const STRATEGY_AGENT_ENABLED = false;

/** 선택한 진단 안건을 전략 에이전트 첫 사용자 메시지(시드)로 조합. */
function buildSeed(a: BriefArea): string {
  const lines = [
    `[선제 진단 안건] ${a.title}`,
    a.why ? `근거: ${a.why}` : '',
    a.evidence ? `데이터: ${a.evidence}` : '',
    a.question ? `던진 질문: ${a.question}` : '',
    a.suggestion ? `초기 제안: ${a.suggestion}` : '',
  ].filter(Boolean).join('\n');
  return `방금 선제 진단에서 아래 안건을 골랐어. 이걸 이어서 구체적인 세일즈 전략으로 발전시켜줘.\n\n${lines}\n\n이 안건 하나에만 집중해줘 — 다른 퍼널 영역으로 넓히지 말고, 이 전략을 깊게 파고들어줘. 우리 데이터·세계적 세일즈 기법·최신 사례를 활용해 실행 가능한 전략(가설→대상→실행→측정 지표)을 제시해줘.`;
}

const today = () => kstDateStr(Date.now());

const periodTag = (p: InsightPeriod) => `${p.from}_${p.to}`;
const scope = (m: Mode, p: InsightPeriod) => `${m}:${periodTag(p)}`;
// 캐시 키에 기간 포함 → 기간 전환 시 캐시 오염 방지. dismiss는 날짜 단위(기간 무관 하루 닫기).
const briefKey = (m: Mode, p: InsightPeriod) => `crm-insight-brief:${m}:${periodTag(p)}`;
const deepKey = (m: Mode, p: InsightPeriod) => `crm-insight-deep:${m}:${periodTag(p)}`;
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

// 노출할 인사이트 모드. 'weekly'(이번 주 방향 맞추기)는 일단 비활성 — 되살리려면 'weekly' 추가.
const AVAILABLE_MODES: Mode[] = ['diagnosis'];

const MODE_TITLE: Record<Mode, string> = {
  diagnosis: '우리가 지금 해야 할 부분은 여기야',
  weekly: '이번 주 방향 맞추기 — 꼭 짚을 것',
};
const MODE_LOADING: Record<Mode, string> = {
  diagnosis: '지표 점검 중…',
  weekly: '이번 주 방향 점검 중…',
};

export function CrmInsightBanner({ adminKey, onOpenStrategy }: Props) {
  const [mode, setMode] = useState<Mode>('diagnosis');
  const [period, setPeriod] = useState<InsightPeriod>(defaultPeriod);
  const [areas, setAreas] = useState<BriefArea[] | null>(null);
  const [loading, setLoading] = useState(true); // 첫 결과(빠른/심화) 도착 전 — 마운트 시 즉시 로딩 표시
  const [deepPending, setDeepPending] = useState(false); // 심화 분석 진행 중
  const [isDeep, setIsDeep] = useState(false); // 현재 표시 중인 게 심화본인지
  const [dismissed, setDismissed] = useState(false);
  const [picking, setPicking] = useState(false); // '이어서 전략 짜기' 안건 선택 모드
  const fetchedRef = useRef<Set<string>>(new Set()); // 이미 로드한 scope(mode+기간)
  const deepAppliedRef = useRef(false); // 심화본이 적용되면 빠른 응답이 덮어쓰지 못하게
  const latestScopeRef = useRef(''); // 진행 중 로드가 최신 scope인지 — 기간 전환 시 stale 응답 무시

  useEffect(() => {
    if (!adminKey) return;
    setPicking(false); // 기간/모드 전환 시 열려 있던 안건 선택 닫기
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

  const hasAreas = !!areas && areas.length > 0;

  return (
    <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50/70 px-4 py-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles size={16} className="text-blue-500 shrink-0" />
          <p className="text-sm font-semibold text-blue-900 truncate">{MODE_TITLE[mode]}</p>
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
            className="flex items-center gap-1 text-[11px] font-medium text-blue-500 hover:text-blue-700 disabled:opacity-40"
            title="지표 다시 점검"
          >
            <Activity size={12} />다시 점검
          </button>
          <button onClick={dismiss} className="text-blue-300 hover:text-blue-500" title="오늘 닫기">
            <X size={15} />
          </button>
        </div>
      </div>

      {AVAILABLE_MODES.length > 1 && (
        <div className="mt-2 inline-flex rounded-lg bg-white/70 border border-blue-200 p-0.5">
          {AVAILABLE_MODES.map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              disabled={loading}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors disabled:opacity-50 ${
                mode === m ? 'bg-blue-600 text-white' : 'text-blue-600 hover:bg-blue-100'
              }`}
            >
              {m === 'diagnosis' ? '선제 진단' : '이번 주 방향 맞추기'}
            </button>
          ))}
        </div>
      )}

      {/* 분석 기간 선택 — 프리셋 + 직접 입력 */}
      <div className="mt-2">
        <PeriodPicker period={period} onApply={setPeriod} disabled={loading} />
      </div>

      {loading ? (
        <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-blue-400">
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
                    {a.title}
                    <span className="ml-1.5 font-normal text-gray-500">— {a.why}</span>
                  </p>
                  {a.evidence && <p className="text-[11px] text-violet-500 mt-0.5">근거: {a.evidence}</p>}
                  {mode === 'weekly' ? (
                    a.question && (
                      <p className="text-[13px] text-blue-700 mt-0.5">
                        <span className="font-medium">날카로운 질문:</span> {a.question}
                      </p>
                    )
                  ) : (
                    <p className="text-[13px] text-blue-700 mt-0.5">
                      <span className="font-medium">이렇게 해보자:</span> {a.suggestion}
                    </p>
                  )}
                </div>
              </div>
            ))
          ) : (
            <p className="text-xs text-blue-400">이 기간에는 눈에 띄는 약점·정체 신호가 없습니다.</p>
          )}

          {STRATEGY_AGENT_ENABLED && (!picking ? (
            <button
              onClick={() => (hasAreas ? setPicking(true) : onOpenStrategy(period))}
              className="mt-1 inline-flex items-center gap-1 text-xs font-semibold bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors"
            >
              이어서 전략 짜기 <ArrowRight size={13} />
            </button>
          ) : (
            <div className="mt-1 rounded-lg border border-blue-200 bg-white/80 p-2">
              <p className="px-1 pb-1 text-[11px] font-semibold text-blue-700">
                어떤 안건으로 전략을 이어서 짤까요?
              </p>
              <div className="space-y-0.5">
                {areas!.map((a, i) => (
                  <button
                    key={i}
                    onClick={() => { onOpenStrategy(period, buildSeed(a)); setPicking(false); }}
                    className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-xs hover:bg-blue-50 transition-colors"
                  >
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${SEV_DOT[a.severity] ?? 'bg-amber-500'}`} />
                    <span className="font-medium text-blue-700">{a.title}</span>
                    <span className="truncate text-gray-400">— {a.why}</span>
                  </button>
                ))}
              </div>
              <button
                onClick={() => setPicking(false)}
                className="px-1 pt-1 text-[11px] text-gray-400 hover:text-gray-600"
              >
                취소
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
