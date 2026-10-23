import { describe, it, expect } from 'vitest';
import {
  sanitizeQuestionsForClient,
  sanitizeVocabForClient,
  gradeV2Submission,
} from '../diagnosis-grading';
import type { TestQuestion } from '@/app/diagnosis/data/diagnostic-test-1';
import type { VocabQuestion } from '@/app/diagnosis/data/diagnostic-test-2-vocab';

const mcq: TestQuestion = {
  id: 'r1',
  type: 'multiple-choice',
  section: 'Reading and Writing',
  domain: 'Craft and Structure',
  skill: 's',
  difficulty: 'Easy',
  question: 'q',
  options: [
    { id: 'A', text: 'a', type: 'distractor' },
    { id: 'B', text: 'b', type: 'correct' },
  ],
};
const shortQ: TestQuestion = {
  id: 'm1',
  type: 'short-answer',
  section: 'Math',
  domain: 'Algebra',
  skill: 's',
  difficulty: 'Hard',
  question: 'q',
  answers: ['42'],
};
const vocab: VocabQuestion[] = [
  {
    id: 'v1',
    word: 'pertinent',
    options: [
      { id: 'A', text: 'rude', type: 'distractor' },
      { id: 'B', text: 'relevant', type: 'correct' },
    ],
  },
];

describe('sanitizeQuestionsForClient', () => {
  it('REQ-007: removes the answer key from multiple-choice and short-answer questions', () => {
    const json = JSON.stringify(sanitizeQuestionsForClient([mcq, shortQ]));
    expect(json).not.toContain('"correct"');
    expect(json).not.toContain('"distractor"');
    expect(json).not.toContain('"answers"');
    expect(json).not.toContain('42');
  });

  it('REQ-007: keeps everything the test screen needs', () => {
    const [out] = sanitizeQuestionsForClient([mcq]);
    expect(out).toMatchObject({ id: 'r1', question: 'q', section: 'Reading and Writing' });
    expect(out.options).toEqual([
      { id: 'A', text: 'a' },
      { id: 'B', text: 'b' },
    ]);
  });

  it('REQ-007: does not mutate the source questions', () => {
    sanitizeQuestionsForClient([mcq, shortQ]);
    expect(mcq.options![1].type).toBe('correct');
    expect(shortQ.answers).toEqual(['42']);
  });
});

describe('sanitizeVocabForClient', () => {
  it('REQ-007: strips option types from vocab questions', () => {
    const out = sanitizeVocabForClient(vocab);
    expect(JSON.stringify(out)).not.toContain('correct');
    expect(out[0]).toEqual({
      id: 'v1',
      word: 'pertinent',
      options: [
        { id: 'A', text: 'rude' },
        { id: 'B', text: 'relevant' },
      ],
    });
  });
});

describe('gradeV2Submission', () => {
  it('REQ-008: overwrites client isCorrect for rw answers using the question key', () => {
    const { rw } = gradeV2Submission(
      {
        rw: [
          { questionId: 'r1', firstYesOptionId: 'A', optionsViewedCount: 1, finalAnswer: 'A', confidence: 90, isCorrect: true } as never,
        ],
        vocab: [],
      },
      [mcq],
      vocab
    );
    expect(rw[0].isCorrect).toBe(false);
  });

  it('REQ-008: grades correct rw answers as correct even when the client sent false', () => {
    const { rw } = gradeV2Submission(
      { rw: [{ questionId: 'r1', firstYesOptionId: 'B', optionsViewedCount: 2, finalAnswer: 'B', confidence: 50, isCorrect: false } as never], vocab: [] },
      [mcq],
      vocab
    );
    expect(rw[0].isCorrect).toBe(true);
  });

  it('REQ-008: grades vocab answers from the vocab bank; skipped (null) is wrong', () => {
    const { vocab: graded } = gradeV2Submission(
      {
        rw: [],
        vocab: [
          { wordId: 'v1', selectedOptionId: 'B', timeTaken: 3, isCorrect: false } as never,
          { wordId: 'v1', selectedOptionId: null, timeTaken: 10, isCorrect: true } as never,
        ],
      },
      [],
      vocab
    );
    expect(graded.map((v) => v.isCorrect)).toEqual([true, false]);
  });

  it('REQ-008: unknown question or word ids are graded wrong', () => {
    const { rw, vocab: graded } = gradeV2Submission(
      {
        rw: [{ questionId: 'nope', firstYesOptionId: 'A', optionsViewedCount: 1, finalAnswer: 'A', confidence: 1, isCorrect: true } as never],
        vocab: [{ wordId: 'nope', selectedOptionId: 'B', timeTaken: 1, isCorrect: true } as never],
      },
      [mcq],
      vocab
    );
    expect(rw[0].isCorrect).toBe(false);
    expect(graded[0].isCorrect).toBe(false);
  });
});
