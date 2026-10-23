import type { TestQuestion } from '@/app/diagnosis/data/diagnostic-test-1';
import type { QuestionAttempt } from './diagnosis-attempts';

/** 한 제출의 형식·세트와 정규화된 시도 목록. */
export interface ResultAttempts {
  format: string;
  versionId: string | null;
  attempts: QuestionAttempt[];
}

/** (형식, 문항) 단위 집계. 같은 문항이 여러 세트에 쓰이면 한 형식 안에서 합산된다. */
export interface QuestionAggregate {
  format: string;
  questionId: string;
  exposures: number;
  answeredCount: number;
  correctCount: number;
  accuracyAnswered: number;
  accuracyOverall: number;
  completionRate: number;
  avgTimeSeconds: number | null;
  avgConfidence: number | null;
  answerDistribution: Record<string, number>;
}

export interface RollupTier {
  questionCount: number;
  exposures: number;
  accuracy: number;
  accuracyAnswered: number;
  avgTimeSeconds: number | null;
  avgConfidence: number | null;
}

export interface ComboRollup {
  format: string;
  sections: Record<string, RollupTier>;
  domains: Record<string, RollupTier>;
}

export const aggregateKey = (format: string, questionId: string) => `${format}::${questionId}`;

export const mean = (values: number[]): number | null =>
  values.length > 0 ? values.reduce((s, v) => s + v, 0) / values.length : null;

const ratio = (n: number, d: number) => (d > 0 ? n / d : 0);

function countAnswers(attempts: QuestionAttempt[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const a of attempts) if (a.answer !== null) counts[a.answer] = (counts[a.answer] ?? 0) + 1;
  return counts;
}

export function aggregateByQuestion(items: ResultAttempts[]): Map<string, QuestionAggregate> {
  const buckets = new Map<string, { format: string; attempts: QuestionAttempt[] }>();
  for (const { format, attempts } of items) {
    for (const a of attempts) {
      const key = aggregateKey(format, a.questionId);
      const bucket = buckets.get(key) ?? { format, attempts: [] };
      bucket.attempts.push(a);
      buckets.set(key, bucket);
    }
  }

  const result = new Map<string, QuestionAggregate>();
  for (const [key, { format, attempts }] of buckets) {
    const answered = attempts.filter((a) => a.answered);
    const correctCount = attempts.filter((a) => a.isCorrect).length;
    result.set(key, {
      format,
      questionId: attempts[0].questionId,
      exposures: attempts.length,
      answeredCount: answered.length,
      correctCount,
      accuracyAnswered: ratio(correctCount, answered.length),
      accuracyOverall: ratio(correctCount, attempts.length),
      completionRate: ratio(answered.length, attempts.length),
      avgTimeSeconds: mean(answered.flatMap((a) => (a.timeSeconds == null ? [] : [a.timeSeconds]))),
      avgConfidence: mean(answered.flatMap((a) => (a.confidence == null ? [] : [a.confidence]))),
      answerDistribution: countAnswers(answered),
    });
  }
  return result;
}

function toTier(aggs: QuestionAggregate[]): RollupTier {
  const exposures = aggs.reduce((s, a) => s + a.exposures, 0);
  const answered = aggs.reduce((s, a) => s + a.answeredCount, 0);
  const correct = aggs.reduce((s, a) => s + a.correctCount, 0);
  const weighted = (pick: (a: QuestionAggregate) => number | null) => {
    const parts = aggs.flatMap((a) => (pick(a) == null ? [] : [{ v: pick(a)!, w: a.answeredCount }]));
    const w = parts.reduce((s, p) => s + p.w, 0);
    return w > 0 ? parts.reduce((s, p) => s + p.v * p.w, 0) / w : null;
  };
  return {
    questionCount: aggs.length,
    exposures,
    accuracy: ratio(correct, exposures),
    accuracyAnswered: ratio(correct, answered),
    avgTimeSeconds: weighted((a) => a.avgTimeSeconds),
    avgConfidence: weighted((a) => a.avgConfidence),
  };
}

/** 한 세트의 문항들을 섹션/도메인으로 묶어 같은 형식의 문항 집계를 롤업한다. */
export function rollupCombo(
  format: string,
  setQuestions: TestQuestion[],
  aggs: Map<string, QuestionAggregate>
): ComboRollup {
  const bySection: Record<string, QuestionAggregate[]> = {};
  const byDomain: Record<string, QuestionAggregate[]> = {};
  for (const q of setQuestions) {
    const agg = aggs.get(aggregateKey(format, q.id));
    if (!agg) continue;
    (bySection[q.section] ??= []).push(agg);
    (byDomain[q.domain] ??= []).push(agg);
  }
  const tiers = (groups: Record<string, QuestionAggregate[]>) =>
    Object.fromEntries(Object.entries(groups).map(([name, list]) => [name, toTier(list)]));
  return { format, sections: tiers(bySection), domains: tiers(byDomain) };
}
