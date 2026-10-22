import type { TestQuestion } from '@/app/diagnosis/data/diagnostic-test-1';
import type { VocabQuestion } from '@/app/diagnosis/data/diagnostic-test-2-vocab';
import type {
  RWSequentialAnswer,
  SubmittedRWAnswer,
  SubmittedVocabAnswer,
  VocabAnswer,
} from '@/types/diagnosis';
import { gradeAnswer } from './diagnosis-attempts';

/** 학생에게 내려가는 문항에서 정답 정보(보기 type, 단답 answers)를 제거한다. */
export function sanitizeQuestionsForClient(questions: TestQuestion[]): TestQuestion[] {
  return questions.map(({ answers: _answers, options, ...rest }) => ({
    ...rest,
    ...(options && { options: options.map(({ id, text }) => ({ id, text })) }),
  }));
}

export function sanitizeVocabForClient(vocab: VocabQuestion[]): VocabQuestion[] {
  return vocab.map((v) => ({
    id: v.id,
    word: v.word,
    options: v.options.map(({ id, text }) => ({ id, text })),
  }));
}

interface V2Submission {
  rw: SubmittedRWAnswer[];
  vocab: SubmittedVocabAnswer[];
}

/** 클라이언트가 보낸 isCorrect는 버리고 서버가 가진 정답으로 다시 채점한다. */
export function gradeV2Submission(
  submission: V2Submission,
  questions: TestQuestion[],
  vocabBank: VocabQuestion[]
): { rw: RWSequentialAnswer[]; vocab: VocabAnswer[] } {
  const questionById = new Map(questions.map((q) => [q.id, q]));
  const wordById = new Map(vocabBank.map((v) => [v.id, v]));

  const rw = submission.rw.map((r) => {
    const q = questionById.get(r.questionId);
    return { ...r, isCorrect: q ? gradeAnswer(q, r.finalAnswer) : false };
  });

  const vocab = submission.vocab.map((v) => {
    const correctId = wordById.get(v.wordId)?.options.find((o) => o.type === 'correct')?.id;
    return { ...v, isCorrect: v.selectedOptionId !== null && v.selectedOptionId === correctId };
  });

  return { rw, vocab };
}
