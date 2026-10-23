import { describe, it, expect } from 'vitest';
import {
  normalizeFormatId,
  buildQuestionPool,
  gradeAnswer,
  extractAttempts,
  type RawResult,
} from '../diagnosis-attempts';
import type { TestQuestion } from '@/app/diagnosis/data/diagnostic-test-1';

const mc = (id: string, section: TestQuestion['section'], correct: string): TestQuestion => ({
  id,
  type: 'multiple-choice',
  section,
  domain: section === 'Math' ? 'Algebra' : 'Craft and Structure',
  skill: 'skill',
  difficulty: 'Medium',
  question: 'q',
  options: ['A', 'B', 'C', 'D'].map((o) => ({
    id: o,
    text: o,
    type: o === correct ? 'correct' : 'distractor',
  })),
});

const sa = (id: string, answer: string): TestQuestion => ({
  id,
  type: 'short-answer',
  section: 'Math',
  domain: 'Algebra',
  skill: 'skill',
  difficulty: 'Hard',
  question: 'q',
  answers: [answer],
});

const base = (over: Partial<RawResult>): RawResult => ({
  test_id: 'diagnostic-test-1',
  test_version_id: 'set-1',
  answers: {},
  confidence_levels: {},
  question_times: {},
  ...over,
});

describe('normalizeFormatId', () => {
  it('maps the legacy format id to diagnostic-test-1', () => {
    expect(normalizeFormatId('mgui9bty2zokyowawbl')).toBe('diagnostic-test-1');
  });
  it('keeps known ids and defaults null to diagnostic-test-1', () => {
    expect(normalizeFormatId('diagnostic-test-2')).toBe('diagnostic-test-2');
    expect(normalizeFormatId(null)).toBe('diagnostic-test-1');
  });
});

describe('gradeAnswer', () => {
  it('grades multiple choice by option id', () => {
    const q = mc('m1', 'Math', 'B');
    expect(gradeAnswer(q, 'B')).toBe(true);
    expect(gradeAnswer(q, 'C')).toBe(false);
  });
  it('grades short answers ignoring case and whitespace', () => {
    expect(gradeAnswer(sa('s1', '12'), ' 12 ')).toBe(true);
    expect(gradeAnswer(sa('s1', '12'), '13')).toBe(false);
  });
  it('treats non-string JSONB values safely', () => {
    expect(gradeAnswer(sa('s1', '12'), 12)).toBe(true);
    expect(gradeAnswer(sa('s1', '12'), undefined)).toBe(false);
  });
});

describe('extractAttempts', () => {
  const questions = [mc('r1', 'Reading and Writing', 'A'), mc('m1', 'Math', 'B'), sa('m2', '7')];
  const pool = buildQuestionPool([questions]);

  it('REQ-001: reads v1 flat answers and marks skipped questions unanswered', () => {
    const attempts = extractAttempts(
      base({
        answers: { r1: 'A', m1: 'C' },
        confidence_levels: { r1: 80, m1: 40 },
        question_times: { r1: 30, m1: 90, m2: 0 },
      }),
      questions,
      pool
    );
    expect(attempts).toEqual([
      { questionId: 'r1', answered: true, isCorrect: true, answer: 'A', confidence: 80, timeSeconds: 30 },
      { questionId: 'm1', answered: true, isCorrect: false, answer: 'C', confidence: 40, timeSeconds: 90 },
      { questionId: 'm2', answered: false, isCorrect: false, answer: null, confidence: null, timeSeconds: 0 },
    ]);
  });

  it('REQ-001: reads v2 nested answers and ignores the client isCorrect flag', () => {
    const attempts = extractAttempts(
      base({
        test_id: 'diagnostic-test-2',
        answers: {
          __v2__: true,
          vocab: [],
          rw: [
            { questionId: 'r1', firstYesOptionId: 'B', finalAnswer: 'B', optionsViewedCount: 2, confidence: 70, isCorrect: true },
          ],
          math: { m1: 'B', m2: '7' },
        },
        confidence_levels: { m1: 55 },
        question_times: { r1: 20, m1: 60, m2: 50 },
      }),
      questions,
      pool
    );
    const byId = Object.fromEntries(attempts.map((a) => [a.questionId, a]));
    expect(byId.r1).toMatchObject({ answered: true, isCorrect: false, confidence: 70, timeSeconds: 20 });
    expect(byId.m1).toMatchObject({ answered: true, isCorrect: true, confidence: 55 });
    expect(byId.m2).toMatchObject({ answered: true, isCorrect: true, timeSeconds: 50 });
  });

  it('REQ-001: recovers answers for question ids replaced in the set via the pool', () => {
    const oldQ = mc('old1', 'Math', 'C');
    const fullPool = buildQuestionPool([questions, [oldQ]]);
    const attempts = extractAttempts(
      base({
        answers: { r1: 'A', old1: 'C' },
        question_times: { r1: 10, old1: 40 },
      }),
      questions,
      fullPool
    );
    const ids = attempts.map((a) => a.questionId);
    expect(ids).toContain('old1');
    expect(attempts.find((a) => a.questionId === 'old1')).toMatchObject({ answered: true, isCorrect: true });
    // set questions the student never saw (no answer, no time key) are not counted as exposed
    expect(ids).not.toContain('m1');
    expect(ids).not.toContain('m2');
  });

  it('REQ-001: ignores answered ids found nowhere', () => {
    const attempts = extractAttempts(base({ answers: { ghost: 'A' } }), questions, pool);
    expect(attempts.map((a) => a.questionId)).toEqual(['r1', 'm1', 'm2']);
  });
});
