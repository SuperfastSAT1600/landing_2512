/**
 * 윈백 규칙 스코어링 — "이 상품을 지금 제안할 만한 이탈 리드인가"를 결정론적으로 점수화한다.
 * 순수 함수(I/O 없음). LLM·임베딩이 죽어도 이 점수만으로 추천이 degrade 동작해야 한다.
 *
 * ⚠️ `desired_subjects`는 의도적으로 사용하지 않는다. 자동 유입 경로가 기본값 'Both'를 강제로
 *    채워 정보량이 없고(sheets-sync-utils), 오히려 SAT/AP 판정을 오염시킨다.
 *    과목 의도는 `campaign_tags`와 상담 메모 문구로만 판단한다.
 */
import type { WinbackSignal } from '@/types/crm';
import { classifyChurnTag } from '@/lib/churn-breakdown';
import { effectiveChurnStage, FUNNEL_FLOW_ORDER } from '@/lib/funnel-stats';
import type { ParsedBrief } from '@/lib/winback/brief';

export interface WinbackScoreStudent {
  id: string;
  name: string;
  grade?: string | null; // '10th'
  school_type?: string | null; // '한국 학제' | 'AP' | 'IB'
  campaign_tags?: string[] | null;
  desired_subjects?: string | null; // 스코어에 쓰지 않음(오염 필드) — 프로필 표시용으로만 존재
  churn_type?: string | null;
  churn_tag?: string | null;
  churn_stage_manual?: string | null;
  stage_history?: { stage: string }[] | null;
  target_test_date?: string | null;
  last_contacted_at?: string | null;
  /** lead_status 변경 시 갱신되므로 이탈 시점 proxy로 쓴다(별도 inactive_at 컬럼이 없음). */
  updated_at: string;
  consultation_timeline?: Array<{ raw_memo?: string; ai_purified?: string; created_at?: string }> | null;
  reactivation_log?: Array<{ outcome?: string }> | null;
  /** 과거 결제 상품 카테고리(payments에서 주입). 재구매·업셀 신호. */
  paid_categories?: string[];
}

export interface WinbackScoreContext {
  similarity: number | null;
  now: number;
  weights?: Partial<Record<string, number>>;
}

export interface WinbackScoreResult {
  score: number;
  /** 임베딩 유사도를 제외한 점수 — degrade 시 비교 기준. */
  rule_score: number;
  /**
   * 클램프 전 원점수. 표시는 0~100으로 자르지만, 상한에 닿은 후보끼리 순위를 가리려면
   * 자르기 전 값이 필요하다(안 그러면 상위권이 전부 100점 동점이 된다).
   */
  raw_score: number;
  signals: WinbackSignal[];
}

/**
 * 중립 출발점. 신호가 하나도 없으면 이 값이 그대로 점수가 된다.
 * 25로 낮게 잡은 이유: 40이었을 때 흔한 신호 3~4개만으로 상한(100)에 닿아
 * 상위권이 전부 동점이 됐다(실측). 낮은 base + 작은 가중치가 순위를 갈라준다.
 */
const BASE_SCORE = 25;
const DAY_MS = 24 * 60 * 60 * 1000;

const RECENCY_SWEET_MIN = 30;
const RECENCY_SWEET_MAX = 180;
const RECENCY_STALE_DAYS = 365;
const FATIGUE_CONTACT_DAYS = 14;
const NO_RESPONSE_THRESHOLD = 2;
const DEEP_STAGE_INDEX = FUNNEL_FLOW_ORDER.indexOf('3a');
// 실측 분포(이탈풀 1,242명 대상 SAT 브리프)에서 상위권 유사도가 0.55~0.68에 몰려 있었다.
// 상한을 0.6으로 두면 상위 후보 전원이 만점이 되어 변별이 사라진다 → 실제 분포에 맞춰 넓힌다.
const SIMILARITY_FLOOR = 0.35;
const SIMILARITY_CEIL = 0.75;
const EXAM_MONTH_TOLERANCE = 2;

export const DEFAULT_WINBACK_WEIGHTS: Record<string, number> = {
  campaign_tag_intent: 22,
  campaign_tag_subject: 14,
  memo_subject_mention: 16,
  grade_exact: 12,
  grade_adjacent: 6,
  school_type_fit: 8,
  exam_timing: 14,
  churn_unpaid: 10,
  churn_deferred: 12,
  churn_noshow: 6,
  churn_no_response: 4,
  churn_refunded: -10,
  churn_stage_deep: 12,
  churn_stage_shallow: -8,
  recency_sweet: 10,
  recency_stale: -10,
  fatigue_recent_contact: -20,
  fatigue_no_response: -15,
  prior_reactivated: 7,
  repeat_buyer: 8,
  embedding_similarity: 25,
};

const SIGNAL_LABELS: Record<string, string> = {
  campaign_tag_intent: '과목 문의 이력',
  campaign_tag_subject: '동일 과목 태그',
  memo_subject_mention: '상담에서 과목 언급',
  grade_exact: '대상 학년 일치',
  grade_adjacent: '인접 학년',
  school_type_fit: '학제 적합',
  exam_timing: '시험 시기 부합',
  churn_unpaid: '미결제 이탈',
  churn_deferred: '보류·미응시 이탈',
  churn_noshow: '노쇼 이탈',
  churn_no_response: '회신 없음 이탈',
  churn_refunded: '환불 이력',
  churn_stage_deep: '상담 진행 경험',
  churn_stage_shallow: '첫 컨택에서 이탈',
  recency_sweet: '이탈 경과 적정',
  recency_stale: '이탈 1년 초과',
  fatigue_recent_contact: '최근 컨택함',
  fatigue_no_response: '무응답 누적',
  prior_reactivated: '과거 재활성화 성공',
  repeat_buyer: '동일 계열 결제 이력',
  embedding_similarity: '프로필 유사도',
};

const CHURN_CATEGORY_SIGNAL: Record<string, string> = {
  미결제: 'churn_unpaid',
  미응시: 'churn_deferred',
  노쇼: 'churn_noshow',
  '회신 없음': 'churn_no_response',
  환불: 'churn_refunded',
};

/** 소문자 텍스트에 토큰이 단어 단위로 등장하는지. (부분 문자열 오탐 방지) */
function hasToken(text: string, token: string): boolean {
  return new RegExp(`\\b${token}\\b`).test(text);
}

function gradeNumber(grade?: string | null): number | null {
  const m = grade?.match(/(\d{1,2})/);
  return m ? Number(m[1]) : null;
}

function monthDistance(a: number, b: number): number {
  const diff = Math.abs(a - b);
  return Math.min(diff, 12 - diff);
}

function memoText(student: WinbackScoreStudent): string {
  return (student.consultation_timeline ?? [])
    .map((e) => `${e.ai_purified ?? ''} ${e.raw_memo ?? ''}`)
    .join(' ')
    .toLowerCase();
}

/** 신호 규칙. 배열 순서가 곧 signals 순서(결정론적). scale=null이면 미해당. */
interface Rule {
  key: string;
  scale: (s: WinbackScoreStudent, b: ParsedBrief, ctx: WinbackScoreContext) => number | null;
}

const RULES: Rule[] = [
  {
    key: 'campaign_tag_intent',
    scale: (s, b) => {
      if (b.subjectKind === '기타') return null;
      const kind = b.subjectKind.toLowerCase();
      return (s.campaign_tags ?? []).some((t) => hasToken(t.toLowerCase(), kind)) ? 1 : null;
    },
  },
  {
    key: 'campaign_tag_subject',
    scale: (s, b) => {
      const tags = (s.campaign_tags ?? []).map((t) => t.toLowerCase());
      return b.subjectTokens.some((tok) => tags.some((t) => t.includes(tok))) ? 1 : null;
    },
  },
  {
    key: 'memo_subject_mention',
    scale: (s, b) => {
      if (b.subjectTokens.length === 0) return null;
      const text = memoText(s);
      return b.subjectTokens.some((tok) => hasToken(text, tok)) ? 1 : null;
    },
  },
  {
    key: 'grade_exact',
    scale: (s, b) => {
      const g = gradeNumber(s.grade);
      return g != null && b.grades.includes(g) ? 1 : null;
    },
  },
  {
    key: 'grade_adjacent',
    scale: (s, b) => {
      const g = gradeNumber(s.grade);
      if (g == null || b.grades.includes(g)) return null;
      return b.grades.some((target) => Math.abs(target - g) === 1) ? 1 : null;
    },
  },
  {
    key: 'school_type_fit',
    scale: (s, b) => {
      if (!s.school_type) return null;
      if (b.subjectKind === 'AP') return ['AP', 'IB'].includes(s.school_type) ? 1 : null;
      if (b.subjectKind === 'SAT') return s.school_type === '한국 학제' ? 1 : null;
      return null;
    },
  },
  {
    key: 'exam_timing',
    scale: (s, b) => {
      if (!b.examMonth || !s.target_test_date) return null;
      const month = Number(s.target_test_date.slice(5, 7));
      if (!month) return null;
      return monthDistance(month, b.examMonth) <= EXAM_MONTH_TOLERANCE ? 1 : null;
    },
  },
  ...Object.values(CHURN_CATEGORY_SIGNAL).map((signalKey) => ({
    key: signalKey,
    scale: (s: WinbackScoreStudent) => {
      const tag = s.churn_tag?.trim();
      if (!tag) return null;
      const { category } = classifyChurnTag(tag);
      return CHURN_CATEGORY_SIGNAL[category] === signalKey ? 1 : null;
    },
  })),
  {
    key: 'churn_stage_deep',
    scale: (s) => {
      const stage = effectiveChurnStage(s);
      if (!stage) return null;
      return FUNNEL_FLOW_ORDER.indexOf(stage) >= DEEP_STAGE_INDEX ? 1 : null;
    },
  },
  {
    key: 'churn_stage_shallow',
    scale: (s) => {
      const stage = effectiveChurnStage(s);
      if (!stage) return null;
      return FUNNEL_FLOW_ORDER.indexOf(stage) <= 1 ? 1 : null;
    },
  },
  {
    key: 'recency_sweet',
    scale: (s, _b, ctx) => {
      const days = (ctx.now - new Date(s.updated_at).getTime()) / DAY_MS;
      return days >= RECENCY_SWEET_MIN && days <= RECENCY_SWEET_MAX ? 1 : null;
    },
  },
  {
    key: 'recency_stale',
    scale: (s, _b, ctx) => {
      const days = (ctx.now - new Date(s.updated_at).getTime()) / DAY_MS;
      return days > RECENCY_STALE_DAYS ? 1 : null;
    },
  },
  {
    key: 'fatigue_recent_contact',
    scale: (s, _b, ctx) => {
      if (!s.last_contacted_at) return null;
      const days = (ctx.now - new Date(s.last_contacted_at).getTime()) / DAY_MS;
      return days <= FATIGUE_CONTACT_DAYS ? 1 : null;
    },
  },
  {
    key: 'fatigue_no_response',
    scale: (s) => {
      const count = (s.reactivation_log ?? []).filter((r) => r.outcome === 'no_response').length;
      return count >= NO_RESPONSE_THRESHOLD ? 1 : null;
    },
  },
  {
    key: 'prior_reactivated',
    scale: (s) => ((s.reactivation_log ?? []).some((r) => r.outcome === 'reactivated') ? 1 : null),
  },
  {
    key: 'repeat_buyer',
    scale: (s, b) => {
      if (b.subjectKind === '기타' || !s.paid_categories?.length) return null;
      const kind = b.subjectKind.toLowerCase();
      return s.paid_categories.some((c) => hasToken(c.toLowerCase(), kind)) ? 1 : null;
    },
  },
  {
    key: 'embedding_similarity',
    scale: (_s, _b, ctx) => {
      if (ctx.similarity == null) return null;
      const norm = (ctx.similarity - SIMILARITY_FLOOR) / (SIMILARITY_CEIL - SIMILARITY_FLOOR);
      const clamped = Math.min(1, Math.max(0, norm));
      return clamped > 0 ? clamped : null;
    },
  },
];

const clamp100 = (n: number) => Math.min(100, Math.max(0, Math.round(n)));

export function scoreWinbackCandidate(
  student: WinbackScoreStudent,
  brief: ParsedBrief,
  ctx: WinbackScoreContext
): WinbackScoreResult {
  const signals: WinbackSignal[] = [];
  let ruleSum = 0;
  let embeddingDelta = 0;

  for (const rule of RULES) {
    const scale = rule.scale(student, brief, ctx);
    if (scale === null) continue;

    const weight = ctx.weights?.[rule.key] ?? DEFAULT_WINBACK_WEIGHTS[rule.key] ?? 0;
    const delta = Math.round(weight * scale);
    if (delta === 0) continue;

    signals.push({ key: rule.key, label: SIGNAL_LABELS[rule.key] ?? rule.key, delta });
    if (rule.key === 'embedding_similarity') embeddingDelta = delta;
    else ruleSum += delta;
  }

  return {
    score: clamp100(BASE_SCORE + ruleSum + embeddingDelta),
    rule_score: clamp100(BASE_SCORE + ruleSum),
    raw_score: BASE_SCORE + ruleSum + embeddingDelta,
    signals,
  };
}
