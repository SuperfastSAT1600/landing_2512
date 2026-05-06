import { TestQuestion } from '@/app/diagnosis/data/diagnostic-test-1';

export interface QuestionStat {
  questionId: string;
  questionNumber: number;
  section: string;
  domain: string;
  skill: string;
  difficulty: string;
  question: string;
  passage: string | null | undefined;
  options: { id: string; text: string; type: string }[];
  correctAnswer: string;
  totalAttempts: number;
  correctCount: number;
  accuracyRate: number;
  completionRate: number;
  avgConfidence: number;
  avgTimeSeconds: number;
  answerDistribution: Record<string, number>;
}

interface RawResult {
  answers: Record<string, string>;
  confidence_levels: Record<string, number>;
  question_times: Record<string, number>;
}

export function buildQuestionStats(
  results: RawResult[],
  questions: TestQuestion[]
): QuestionStat[] {
  return questions.map((q, index) => {
    const correctAnswer =
      q.type === 'multiple-choice'
        ? (q.options?.find((o) => o.type === 'correct')?.id ?? '')
        : (q.answers?.[0] ?? '');

    const answerDistribution: Record<string, number> = {};
    let correctCount = 0;
    let totalConfidence = 0;
    let confidenceCount = 0;
    let totalTime = 0;
    let timeCount = 0;
    let totalAttempts = 0;

    for (const result of results) {
      const studentAnswer = result.answers?.[q.id];
      if (studentAnswer === undefined) continue;

      totalAttempts++;
      answerDistribution[studentAnswer] = (answerDistribution[studentAnswer] ?? 0) + 1;

      const isCorrect =
        q.type === 'multiple-choice'
          ? studentAnswer === correctAnswer
          : studentAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
      if (isCorrect) correctCount++;

      const confidence = result.confidence_levels?.[q.id];
      if (confidence !== undefined) {
        totalConfidence += confidence;
        confidenceCount++;
      }

      const time = result.question_times?.[q.id];
      if (time !== undefined) {
        totalTime += time;
        timeCount++;
      }
    }

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
      correctAnswer,
      totalAttempts,
      correctCount,
      accuracyRate: totalAttempts > 0 ? correctCount / totalAttempts : 0,
      completionRate: results.length > 0 ? totalAttempts / results.length : 0,
      avgConfidence: confidenceCount > 0 ? totalConfidence / confidenceCount : 0,
      avgTimeSeconds: timeCount > 0 ? totalTime / timeCount : 0,
      answerDistribution,
    };
  });
}
