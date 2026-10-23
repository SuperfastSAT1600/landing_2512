import type { TestQuestion } from '@/app/diagnosis/data/diagnostic-test-1';

/** diagnostic_test_results 한 행에서 집계에 필요한 필드. */
export interface RawResult {
  test_id: string | null;
  test_version_id: string | null;
  answers: Record<string, unknown> | null;
  confidence_levels?: Record<string, number> | null;
  question_times?: Record<string, number> | null;
}

export interface QuestionAttempt {
  questionId: string;
  answered: boolean;
  isCorrect: boolean;
  /** 학생이 고른/입력한 답 (미응답이면 null) */
  answer: string | null;
  confidence: number | null;
  timeSeconds: number | null;
}

interface RwEntry {
  questionId: string;
  finalAnswer: string;
  confidence?: number;
}

const DEFAULT_FORMAT = 'diagnostic-test-1';
const KNOWN_FORMATS = new Set(['diagnostic-test-1', 'diagnostic-test-2']);

/** 레거시 형식 ID(문제 UUID 형태)와 null을 diagnostic-test-1로 모은다. */
export function normalizeFormatId(testId: string | null | undefined): string {
  return testId && KNOWN_FORMATS.has(testId) ? testId : DEFAULT_FORMAT;
}

export function buildQuestionPool(questionLists: TestQuestion[][]): Map<string, TestQuestion> {
  const pool = new Map<string, TestQuestion>();
  for (const list of questionLists) {
    for (const q of list) if (!pool.has(q.id)) pool.set(q.id, q);
  }
  return pool;
}

const asText = (v: unknown): string => (typeof v === 'string' ? v : v == null ? '' : String(v));

export function gradeAnswer(question: TestQuestion, answer: unknown): boolean {
  const given = asText(answer).trim();
  if (given === '') return false;
  if (question.type === 'multiple-choice') {
    return given === question.options?.find((o) => o.type === 'correct')?.id;
  }
  return (question.answers ?? []).some((a) => a.trim().toLowerCase() === given.toLowerCase());
}

/** v1 평면 answers / v2 중첩 answers를 { 문항ID: 답 }과 RW 확신도로 평탄화한다. */
function flattenAnswers(result: RawResult) {
  const raw = result.answers ?? {};
  if (raw.__v2__ !== true) {
    return { answerMap: raw as Record<string, unknown>, rwConfidence: {} as Record<string, number> };
  }
  const answerMap: Record<string, unknown> = { ...((raw.math as Record<string, unknown>) ?? {}) };
  const rwConfidence: Record<string, number> = {};
  for (const r of (raw.rw as RwEntry[]) ?? []) {
    answerMap[r.questionId] = r.finalAnswer;
    if (typeof r.confidence === 'number') rwConfidence[r.questionId] = r.confidence;
  }
  return { answerMap, rwConfidence };
}

/**
 * 한 제출을 문항별 시도 목록으로 정규화한다. 정오답은 클라이언트가 보낸 값이 아니라 문항 정답으로 다시 채점한다.
 * 세트에서 교체되어 사라진 ID는 pool에서 복구하고, 그 경우 학생이 보지 못한 세트 문항(응답·시간 기록 없음)은 제외한다.
 */
export function extractAttempts(
  result: RawResult,
  setQuestions: TestQuestion[],
  pool: Map<string, TestQuestion>
): QuestionAttempt[] {
  const { answerMap, rwConfidence } = flattenAnswers(result);
  const confidence = result.confidence_levels ?? {};
  const times = result.question_times ?? {};

  const inSet = new Set(setQuestions.map((q) => q.id));
  const recovered = Object.keys(answerMap)
    .filter((id) => !inSet.has(id) && pool.has(id))
    .map((id) => pool.get(id)!);
  const seen = (q: TestQuestion) => answerMap[q.id] !== undefined || times[q.id] !== undefined;
  const exposed = recovered.length > 0 ? setQuestions.filter(seen) : setQuestions;

  return [...exposed, ...recovered].map((q) => {
    const answered = answerMap[q.id] !== undefined;
    return {
      questionId: q.id,
      answered,
      isCorrect: answered && gradeAnswer(q, answerMap[q.id]),
      answer: answered ? asText(answerMap[q.id]) : null,
      confidence: rwConfidence[q.id] ?? confidence[q.id] ?? null,
      timeSeconds: times[q.id] ?? null,
    };
  });
}
