/**
 * 교차 상관/이상치 엔진 — 정량 KPI 단일 지표가 못 보는 "숨은 상관관계"를 결정론적으로 캔다.
 * 예: 메모 접촉 3회 초과 리드의 전환율, 첫응답 48h 초과 시 전환율, 단계 역행 리드의 이탈률.
 *
 * 핵심 원칙: 상관·이상치는 **코드가 결정론적으로 계산(검증 가능)**, 해석·반례·구루 렌즈는 LLM이.
 * surprise 랭킹으로 뻔한 KPI 재진술이 아니라 표본이 충분하면서 격차가 큰 패턴만 상위로 올린다.
 * 순수 함수만(I/O 없음). 라우트/빌더가 데이터를 투영해 넘긴다(strategy-health.ts와 동일 구조).
 */
import { FUNNEL_FLOW_ORDER } from '@/lib/funnel-stats';

// ── 임계값 ──────────────────────────────────────────────────────────────────
const MIN_N = 5; // 세그먼트별 최소 표본 (strategy-health.ts stageMinReached와 동일 관례)
const MIN_PP_GAP = 0.1; // 최소 절대 격차 10pp
const MIN_REL_LIFT = 1.5; // 또는 상대 배수 1.5배
const ADEQUACY_K = 8; // 소표본 수축 상수
const STAGE4_INDEX = FUNNEL_FLOW_ORDER.indexOf('4');
const STAGE_INDEX = new Map<string, number>(FUNNEL_FLOW_ORDER.map((s, i) => [s, i]));

/** 상관 계산에 필요한 학생 최소 형태 (빌더가 DB에서 투영). */
export interface CorrelationStudent {
  id: string;
  isPaid: boolean; // stats의 isPaid 조인 결과를 빌더가 주입
  lead_status: string;
  funnel_stage: string;
  stage_history?: { stage: string; entered_at: string }[] | null;
  consultation_timeline_len?: number;
  inquiry_date?: string | null;
  first_message_sent_at?: string | null;
  vocab_weakness_level?: 'none' | 'low' | 'medium' | 'high' | null;
}

/** 상관 계산용 파생 행(원시값 정규화). projectRow가 생성. */
export interface CorrelationRow {
  isPaid: boolean;
  isChurned: boolean;
  reachedStage4: boolean;
  memoCount: number;
  firstResponseHours: number | null;
  vocabWeak: boolean | null; // medium|high = true, none|low = false, 미상 = null
  backtracked: boolean; // stage_history상 더 낮은 단계로 역행한 적이 있는가
}

export interface Correlation {
  key: string;
  label: string;
  metric: 'conversion' | 'churn';
  segA: string;
  rateA: number; // 0..1
  nA: number;
  segB: string;
  rateB: number;
  nB: number;
  lift: number; // 상대 배수 (max/min)
  surprise: number;
}

const maxReachedIndex = (s: CorrelationStudent): number => {
  let max = STAGE_INDEX.get(s.funnel_stage) ?? -1;
  for (const e of s.stage_history ?? []) {
    const idx = STAGE_INDEX.get(e.stage);
    if (idx !== undefined && idx > max) max = idx;
  }
  return max;
};

/** stage_history를 시간순으로 보며, 이전 최고 단계보다 낮은 단계로 되돌아간 적이 있으면 true. */
function hasBacktracked(s: CorrelationStudent): boolean {
  const hist = (s.stage_history ?? [])
    .filter((e) => STAGE_INDEX.has(e.stage) && e.entered_at)
    .slice()
    .sort((a, b) => new Date(a.entered_at).getTime() - new Date(b.entered_at).getTime());
  let maxIdx = -1;
  for (const e of hist) {
    const idx = STAGE_INDEX.get(e.stage)!;
    if (idx < maxIdx) return true; // 최고 도달 단계보다 뒤로 감
    if (idx > maxIdx) maxIdx = idx;
  }
  return false;
}

function responseHours(s: CorrelationStudent): number | null {
  if (!s.inquiry_date || !s.first_message_sent_at) return null;
  const start = new Date(s.inquiry_date).getTime();
  const end = new Date(s.first_message_sent_at).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return null;
  return (end - start) / 3_600_000;
}

/** 원시 학생 행 → 상관 계산용 파생 행(순수). */
export function projectRow(s: CorrelationStudent): CorrelationRow {
  const vocab = s.vocab_weakness_level;
  return {
    isPaid: s.isPaid,
    isChurned: s.funnel_stage === 'churned' || s.lead_status === 'inactive',
    reachedStage4: maxReachedIndex(s) >= STAGE4_INDEX,
    memoCount: s.consultation_timeline_len ?? 0,
    firstResponseHours: responseHours(s),
    vocabWeak: vocab == null ? null : vocab === 'medium' || vocab === 'high',
    backtracked: hasBacktracked(s),
  };
}

export const projectRows = (students: CorrelationStudent[]): CorrelationRow[] => students.map(projectRow);

interface CrossTabSpec {
  key: string;
  label: string;
  metric: 'conversion' | 'churn';
  base: (r: CorrelationRow) => boolean; // 모집단 필터
  inA: (r: CorrelationRow) => boolean;
  inB: (r: CorrelationRow) => boolean;
  segA: string;
  segB: string;
}

function crossTab(rows: CorrelationRow[], spec: CrossTabSpec): Correlation | null {
  const pop = rows.filter(spec.base);
  const a = pop.filter(spec.inA);
  const b = pop.filter(spec.inB);
  if (a.length < MIN_N || b.length < MIN_N) return null;
  const outcome = (r: CorrelationRow) => (spec.metric === 'conversion' ? r.isPaid : r.isChurned);
  const rateA = a.filter(outcome).length / a.length;
  const rateB = b.filter(outcome).length / b.length;
  const ppGap = Math.abs(rateA - rateB);
  const hi = Math.max(rateA, rateB);
  const lo = Math.min(rateA, rateB);
  const lift = (hi + 0.01) / (lo + 0.01);
  if (ppGap < MIN_PP_GAP && lift < MIN_REL_LIFT) return null; // 격차 약하면 드롭
  const minN = Math.min(a.length, b.length);
  const adequacy = minN / (minN + ADEQUACY_K);
  const surprise = ppGap * adequacy;
  return {
    key: spec.key,
    label: spec.label,
    metric: spec.metric,
    segA: spec.segA,
    rateA,
    nA: a.length,
    segB: spec.segB,
    rateB,
    nB: b.length,
    lift: Math.round(lift * 10) / 10,
    surprise,
  };
}

/** 고정 교차탭 집합을 계산해 게이트를 통과한 상관만 반환(순수). */
export function computeCorrelations(rows: CorrelationRow[]): Correlation[] {
  const specs: CrossTabSpec[] = [
    {
      key: 'memo_touch_x_conversion',
      label: '메모 접촉 횟수 → 전환 (4단계 이상 도달 리드)',
      metric: 'conversion',
      base: (r) => r.reachedStage4,
      inA: (r) => r.memoCount > 3,
      inB: (r) => r.memoCount <= 3,
      segA: '메모 4회+',
      segB: '메모 3회-',
    },
    {
      key: 'first_response_x_conversion',
      label: '첫 응답 지연 → 전환',
      metric: 'conversion',
      base: (r) => r.firstResponseHours != null,
      inA: (r) => (r.firstResponseHours ?? 0) > 48,
      inB: (r) => (r.firstResponseHours ?? 0) <= 48,
      segA: '첫응답 48h 초과',
      segB: '48h 이내',
    },
    {
      key: 'vocab_weak_x_churn',
      label: '진단 어휘 약점 → 이탈',
      metric: 'churn',
      base: (r) => r.vocabWeak != null,
      inA: (r) => r.vocabWeak === true,
      inB: (r) => r.vocabWeak === false,
      segA: '어휘 약점 중·상',
      segB: '어휘 약점 없음·하',
    },
    {
      key: 'backtrack_x_churn',
      label: '단계 역행 → 이탈',
      metric: 'churn',
      base: () => true,
      inA: (r) => r.backtracked,
      inB: (r) => !r.backtracked,
      segA: '단계 역행 경험',
      segB: '역행 없음',
    },
  ];
  return specs.map((s) => crossTab(rows, s)).filter((c): c is Correlation => c !== null);
}

/** surprise 내림차순 상위 N개(기본 3)만. */
export function rankCorrelations(correlations: Correlation[], topN = 3): Correlation[] {
  return [...correlations].sort((a, b) => b.surprise - a.surprise).slice(0, topN);
}

const pctf = (n: number) => `${(n * 100).toFixed(0)}%`;

/** 프롬프트 주입용 [교차 신호 후보 · 코드 산출] 블록. 빈 입력이면 ''. 순수. */
export function serializeCorrelations(top: Correlation[]): string {
  if (top.length === 0) return '';
  const word = (m: Correlation['metric']) => (m === 'conversion' ? '전환' : '이탈');
  const lines = top.map((c) => {
    const dir = c.rateA >= c.rateB ? '↑' : '↓';
    return `- ${c.label}: ${c.segA} ${word(c.metric)} ${pctf(c.rateA)}(n=${c.nA}) vs ${c.segB} ${pctf(c.rateB)}(n=${c.nB}) — ${c.lift}배 격차 ${dir}`;
  });
  return [
    '[교차 신호 후보 · 코드 산출] (코드가 계산한 상관관계 — 인과 아님. 구루 렌즈로 검증·해석·반례 제시는 너의 몫)',
    ...lines,
  ].join('\n');
}

/** 학생 행 → 상위 상관 블록까지 한 번에(순수). 빌더에서 사용. */
export function buildCorrelationBlock(students: CorrelationStudent[], topN = 3): string {
  return serializeCorrelations(rankCorrelations(computeCorrelations(projectRows(students)), topN));
}
