import { describe, it, expect } from 'vitest';
import {
  aggregateByQuestion,
  aggregateKey,
  rollupCombo,
  type ResultAttempts,
} from '../diagnosis-aggregate';
import { buildComboBenchmarks, MIN_BENCHMARK_SAMPLE } from '../diagnosis-benchmarks';
import type { QuestionAttempt } from '../diagnosis-attempts';
import type { TestQuestion } from '@/app/diagnosis/data/diagnostic-test-1';

const q = (id: string, section: TestQuestion['section'], domain: TestQuestion['domain']): TestQuestion => ({
  id,
  type: 'multiple-choice',
  section,
  domain,
  skill: 's',
  difficulty: 'Medium',
  question: 'q',
});

const att = (
  questionId: string,
  isCorrect: boolean,
  over: Partial<QuestionAttempt> = {}
): QuestionAttempt => ({
  questionId,
  answered: true,
  isCorrect,
  answer: isCorrect ? 'A' : 'B',
  confidence: 50,
  timeSeconds: 60,
  ...over,
});

const item = (format: string, versionId: string, attempts: QuestionAttempt[]): ResultAttempts => ({
  format,
  versionId,
  attempts,
});

const questions = [
  q('r1', 'Reading and Writing', 'Craft and Structure'),
  q('m1', 'Math', 'Algebra'),
  q('m2', 'Math', 'Advanced Math'),
];
const pool = new Map(questions.map((x) => [x.id, x]));

describe('aggregateByQuestion', () => {
  it('REQ-002: pools the same question across sets of one format', () => {
    const aggs = aggregateByQuestion([
      item('diagnostic-test-1', 'set-1', [att('m1', true, { timeSeconds: 40 })]),
      item('diagnostic-test-1', 'set-2', [att('m1', false, { timeSeconds: 80 })]),
    ]);
    const a = aggs.get(aggregateKey('diagnostic-test-1', 'm1'))!;
    expect(a.exposures).toBe(2);
    expect(a.correctCount).toBe(1);
    expect(a.avgTimeSeconds).toBe(60);
  });

  it('REQ-002: keeps different formats separate', () => {
    const aggs = aggregateByQuestion([
      item('diagnostic-test-1', 'set-1', [att('m1', true)]),
      item('diagnostic-test-2', 'set-2', [att('m1', false)]),
    ]);
    expect(aggs.get(aggregateKey('diagnostic-test-1', 'm1'))!.accuracyOverall).toBe(1);
    expect(aggs.get(aggregateKey('diagnostic-test-2', 'm1'))!.accuracyOverall).toBe(0);
  });

  it('REQ-002: reports answered-only and overall accuracy, and completion rate', () => {
    const aggs = aggregateByQuestion([
      item('diagnostic-test-1', 's', [att('m1', true)]),
      item('diagnostic-test-1', 's', [att('m1', false, { answered: false, confidence: null, timeSeconds: null })]),
      item('diagnostic-test-1', 's', [att('m1', false)]),
      item('diagnostic-test-1', 's', [att('m1', false, { answered: false, confidence: null, timeSeconds: null })]),
    ]);
    const a = aggs.get(aggregateKey('diagnostic-test-1', 'm1'))!;
    expect(a.exposures).toBe(4);
    expect(a.answeredCount).toBe(2);
    expect(a.accuracyAnswered).toBe(0.5);
    expect(a.accuracyOverall).toBe(0.25);
    expect(a.completionRate).toBe(0.5);
  });

  it('REQ-002: counts chosen answers for the distribution', () => {
    const aggs = aggregateByQuestion([
      item('diagnostic-test-1', 's', [att('m1', true)]),
      item('diagnostic-test-1', 's', [att('m1', true)]),
      item('diagnostic-test-1', 's', [att('m1', false)]),
    ]);
    expect(aggs.get(aggregateKey('diagnostic-test-1', 'm1'))!.answerDistribution).toEqual({ A: 2, B: 1 });
  });
});

describe('rollupCombo', () => {
  it('REQ-003: rolls question aggregates into section and domain stats for one combo', () => {
    const aggs = aggregateByQuestion([
      item('diagnostic-test-1', 's', [att('r1', true), att('m1', true), att('m2', false)]),
      item('diagnostic-test-1', 's', [att('r1', false), att('m1', true), att('m2', false)]),
    ]);
    const roll = rollupCombo('diagnostic-test-1', questions, aggs);
    expect(roll.sections['Math'].accuracy).toBe(0.5);
    expect(roll.sections['Reading and Writing'].accuracy).toBe(0.5);
    expect(roll.domains['Algebra'].accuracy).toBe(1);
    expect(roll.domains['Advanced Math'].accuracy).toBe(0);
  });

  it('REQ-003: ignores aggregates from another format', () => {
    const aggs = aggregateByQuestion([
      item('diagnostic-test-2', 's', [att('m1', false)]),
      item('diagnostic-test-1', 's', [att('m1', true)]),
    ]);
    expect(rollupCombo('diagnostic-test-1', questions, aggs).domains['Algebra'].accuracy).toBe(1);
  });
});

describe('buildComboBenchmarks', () => {
  const students = (n: number, scoreOf: (i: number) => boolean): ResultAttempts[] =>
    Array.from({ length: n }, (_, i) =>
      item('diagnostic-test-2', 'set-2', [att('m1', scoreOf(i)), att('m2', scoreOf(i)), att('r1', scoreOf(i))])
    );

  it('REQ-003: computes top-10% thresholds from the combo students when the sample is large enough', () => {
    const items = students(MIN_BENCHMARK_SAMPLE, (i) => i < 4);
    const b = buildComboBenchmarks({ format: 'diagnostic-test-2', setNumber: 2, items, pool });
    expect(b.source).toBe('computed');
    expect(b.sampleSize).toBe(MIN_BENCHMARK_SAMPLE);
    expect(b.sections['Math'].top10.accuracy).toBe(1);
    expect(b.domains['Algebra'].top10).toBe(1);
    expect(b.sections['Diagnostic'].top10.avgTimeSeconds).toBe(60);
  });

  it('REQ-003: students who took another set still count for the questions this set shares', () => {
    const otherSet = students(MIN_BENCHMARK_SAMPLE, () => true).map((x) => ({
      ...x,
      versionId: 'set-1',
      attempts: [...x.attempts, att('other-only', false)],
    }));
    const b = buildComboBenchmarks({
      format: 'diagnostic-test-2',
      setNumber: 3,
      items: otherSet,
      pool,
      setQuestionIds: new Set(['r1', 'm1', 'm2']),
    });
    expect(b.source).toBe('computed');
    expect(b.sampleSize).toBe(MIN_BENCHMARK_SAMPLE);
  });

  it('REQ-003: students who barely overlap with the set are excluded', () => {
    const items = students(MIN_BENCHMARK_SAMPLE, () => true).map((x) => ({ ...x, attempts: x.attempts.slice(0, 1) }));
    const b = buildComboBenchmarks({
      format: 'diagnostic-test-2',
      setNumber: 3,
      items,
      pool,
      setQuestionIds: new Set(['r1', 'm1', 'm2']),
    });
    expect(b.source).toBe('insufficient');
  });

  it('REQ-003: legacy static benchmarks only for format 1 + set 1 when the sample is small', () => {
    const items = students(3, () => true).map((x) => ({ ...x, format: 'diagnostic-test-1' }));
    const legacy = buildComboBenchmarks({ format: 'diagnostic-test-1', setNumber: 1, items, pool });
    expect(legacy.source).toBe('legacy');
    expect(legacy.sections['Math'].top10.accuracy).toBe(0.78);
  });

  it('REQ-003: other small combos get no benchmark instead of borrowing format-1 numbers', () => {
    const b = buildComboBenchmarks({ format: 'diagnostic-test-2', setNumber: 2, items: students(3, () => true), pool });
    expect(b.source).toBe('insufficient');
    expect(b.sections).toEqual({});
    expect(b.domains).toEqual({});
    expect(b.sampleSize).toBe(3);
  });
});
