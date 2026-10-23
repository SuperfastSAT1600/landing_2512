import type { TestQuestion } from '@/app/diagnosis/data/diagnostic-test-1';
import { aggregateKey, type QuestionAggregate } from './diagnosis-aggregate';

export interface QuestionStat {
  questionId: string;
  questionNumber: number;
  section: string;
  domain: string;
  skill: string;
  difficulty: string;
  question: string;
  passage: string | null | undefined;
  options: { id: string; text: string; type?: string }[];
  correctAnswer: string;
  /** 이 문항이 노출된 제출 수 (미응답 포함) */
  exposures: number;
  /** 응답한 제출 수 */
  totalAttempts: number;
  correctCount: number;
  /** 응답한 학생 기준 정답률 */
  accuracyRate: number;
  /** 미응답을 오답으로 본 정답률 */
  accuracyOverall: number;
  completionRate: number;
  avgConfidence: number;
  avgTimeSeconds: number;
  answerDistribution: Record<string, number>;
}

function correctAnswerOf(q: TestQuestion): string {
  return q.type === 'multiple-choice'
    ? (q.options?.find((o) => o.type === 'correct')?.id ?? '')
    : (q.answers?.[0] ?? '');
}

/**
 * 한 세트의 문항별 통계. 집계(aggs)는 같은 형식의 모든 세트를 합산한 값이라,
 * 여러 세트에서 반복 사용된 문항은 그 전체 표본으로 계산된다.
 */
export function buildQuestionStats(
  setQuestions: TestQuestion[],
  aggs: Map<string, QuestionAggregate>,
  format: string
): QuestionStat[] {
  return setQuestions.map((q, index) => {
    const agg = aggs.get(aggregateKey(format, q.id));
    return {
      questionId: q.id,
      questionNumber: index + 1,
      section: q.section,
      domain: q.domain,
      skill: q.skill,
      difficulty: q.difficulty,
      question: q.question,
      passage: q.passage,
      options: q.options ?? [],
      correctAnswer: correctAnswerOf(q),
      exposures: agg?.exposures ?? 0,
      totalAttempts: agg?.answeredCount ?? 0,
      correctCount: agg?.correctCount ?? 0,
      accuracyRate: agg?.accuracyAnswered ?? 0,
      accuracyOverall: agg?.accuracyOverall ?? 0,
      completionRate: agg?.completionRate ?? 0,
      avgConfidence: agg?.avgConfidence ?? 0,
      avgTimeSeconds: agg?.avgTimeSeconds ?? 0,
      answerDistribution: agg?.answerDistribution ?? {},
    };
  });
}
