/**
 * AI 산출물 품질 게이트.
 *
 * 이 데모의 값은 "AI가 베테랑처럼 판단한다"는 것이다. 출력이 그럴듯한 일반론으로 퇴화하면
 * 데모 전체가 무의미해진다. 재생성할 때마다 사람이 눈으로 읽어 판단하면 반드시 놓치므로,
 * 일반론과 근거 있는 판단을 가르는 최소 조건을 테스트로 고정한다.
 */
import { describe, it, expect } from 'vitest';
import { DEMO_ADVISOR_PLAN } from '../fixtures/advisor-plan';
import { DEMO_ADVISOR_PLAN_KO } from '../fixtures/advisor-plan.ko';
import { DEMO_BRIEF } from '../fixtures/brief';
import { DEMO_BRIEF_KO } from '../fixtures/brief.ko';
import type { AdvisorPlan, AdvisorBrief } from '@/lib/newton-advisor';

/** 실행 주체가 판단을 대신 해야 하는 모호한 동사 — 신규 담당자에게 무용하다. */
const VAGUE = [
  'monitor',
  'keep an eye',
  'be aware',
  'facilitate',
  'as needed',
  'if necessary',
  '모니터링',
  '지켜본다',
  '유의한다',
  '필요시',
  '적절히',
];

// 근거 검출 — 프롬프트가 인정하는 근거는 "수치 또는 날짜 기준 전후 비교"다.
// 모델은 숫자를 자릿수로도("83→89"), 영어 단어로도("three weeks"), 날짜 시계열로도
// ("In November... in April... in August") 쓴다. 판정 의도가 "근거에 매여 있는가"이므로 셋 다 인정한다.
const NUMBER_WORDS =
  /\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fourteen|twenty|thirty|forty|fifty|dozen|half|once|twice|every|each|all|no)\b/i;
const KO_NUMBER_WORDS = /(하나|둘|셋|넷|다섯|여섯|일곱|여덟|아홉|열|한 번|두 번|세 번|절반|매주|매달|모든)/;
const MONTHS =
  /\b(january|february|march|april|may|june|july|august|september|october|november|december|autumn|spring|summer|winter|term)\b/i;
const KO_DATES = /(월|학기|가을|봄|여름|겨울|주차)/;

const hasNumber = (s: string) =>
  /\d/.test(s) || NUMBER_WORDS.test(s) || KO_NUMBER_WORDS.test(s) || MONTHS.test(s) || KO_DATES.test(s);
const wordCount = (s: string) => s.trim().split(/\s+/).length;

const plans: [string, AdvisorPlan][] = [
  ['EN', DEMO_ADVISOR_PLAN],
  ['KO', DEMO_ADVISOR_PLAN_KO],
];
const briefs: [string, AdvisorBrief][] = [
  ['EN', DEMO_BRIEF],
  ['KO', DEMO_BRIEF_KO],
];

describe.each(plans)('업무 목록 품질 — %s', (_lang, plan) => {
  const tasks = [...plan.thisWeek, ...plan.thisMonth, ...plan.thisQuarter];

  it('모호한 동사를 쓰지 않는다', () => {
    const offenders = tasks
      .filter(t => VAGUE.some(v => t.task.toLowerCase().includes(v)))
      .map(t => t.task);
    expect(offenders).toEqual([]);
  });

  it('업무가 짧게 유지된다 (한 줄로 읽혀야 한다)', () => {
    for (const t of tasks) expect(wordCount(t.task)).toBeLessThanOrEqual(20);
  });

  it('판단 근거(why)가 모든 업무에 있고 한 문장으로 유지된다', () => {
    for (const t of tasks) {
      expect(t.why.length).toBeGreaterThan(20);
      expect(wordCount(t.why)).toBeLessThanOrEqual(30);
    }
  });

  it('업무의 과반이 기록의 숫자를 근거로 든다 (일반론 방지)', () => {
    const grounded = tasks.filter(t => hasNumber(t.task) || hasNumber(t.why)).length;
    expect(grounded).toBeGreaterThan(tasks.length / 2);
  });

  it('같은 구간 안에서 업무가 중복되지 않는다', () => {
    for (const bucket of [plan.thisWeek, plan.thisMonth, plan.thisQuarter]) {
      expect(new Set(bucket.map(t => t.task)).size).toBe(bucket.length);
    }
  });

  it('모든 신호가 정량 근거를 포함한다', () => {
    for (const s of plan.signals) {
      expect(hasNumber(`${s.title} ${s.detail}`)).toBe(true);
    }
  });

  it('신호 제목이 짧고 서로 다르다', () => {
    expect(new Set(plan.signals.map(s => s.title)).size).toBe(plan.signals.length);
    for (const s of plan.signals) expect(wordCount(s.title)).toBeLessThanOrEqual(12);
  });

  it('요약이 한 문장 분량을 넘지 않는다', () => {
    expect(plan.summary.length).toBeGreaterThan(30);
    expect(wordCount(plan.summary)).toBeLessThanOrEqual(45);
  });

  it('리스크마다 첫 수가 붙어 있다', () => {
    for (const r of plan.risks) expect(r.firstMove.length).toBeGreaterThan(10);
  });

  it('화면에 들어갈 분량을 넘지 않는다 (구간별 최대 3건)', () => {
    for (const bucket of [plan.thisWeek, plan.thisMonth, plan.thisQuarter]) {
      expect(bucket.length).toBeGreaterThan(0);
      expect(bucket.length).toBeLessThanOrEqual(3);
    }
    expect(plan.signals.length).toBeLessThanOrEqual(3);
    expect(plan.risks.length).toBeLessThanOrEqual(3);
  });
});

describe.each(briefs)('현황 브리핑 품질 — %s', (_lang, brief) => {
  it('헤드라인이 있고 한 문장 분량이다', () => {
    expect(brief.headline.length).toBeGreaterThan(20);
    expect(wordCount(brief.headline)).toBeLessThanOrEqual(30);
  });

  it('각 목록이 3건 이하이고 항목이 짧다', () => {
    for (const list of [brief.strengths, brief.weaknesses, brief.risks]) {
      expect(list.length).toBeLessThanOrEqual(3);
      for (const item of list) expect(wordCount(item)).toBeLessThanOrEqual(22);
    }
  });

  it('강점·취약 항목이 서로 중복되지 않는다', () => {
    const all = [...brief.strengths, ...brief.weaknesses, ...brief.risks];
    expect(new Set(all).size).toBe(all.length);
  });

  it('과반의 항목이 기록의 숫자를 근거로 든다', () => {
    const all = [...brief.strengths, ...brief.weaknesses, ...brief.risks];
    expect(all.filter(hasNumber).length).toBeGreaterThan(all.length / 2);
  });

  it('추천이 한 줄로 존재한다', () => {
    expect(brief.recommendation.length).toBeGreaterThan(20);
    expect(wordCount(brief.recommendation)).toBeLessThanOrEqual(26);
  });
});
