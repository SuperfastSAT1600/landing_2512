import { describe, it, expect } from 'vitest';
import { buildQuestionStats } from '../diagnosis-analysis';
import { aggregateByQuestion } from '../diagnosis-aggregate';
import type { TestQuestion } from '@/app/diagnosis/data/diagnostic-test-1';

const q: TestQuestion = {
  id: 'm1',
  type: 'multiple-choice',
  section: 'Math',
  domain: 'Algebra',
  skill: 's',
  difficulty: 'Easy',
  question: 'q',
  options: [{ id: 'A', text: 'a', type: 'correct' }, { id: 'B', text: 'b', type: 'distractor' }],
};

const attempt = (isCorrect: boolean, answered = true) => ({
  questionId: 'm1',
  answered,
  isCorrect,
  answer: answered ? (isCorrect ? 'A' : 'B') : null,
  confidence: answered ? 60 : null,
  timeSeconds: answered ? 50 : null,
});

describe('buildQuestionStats', () => {
  it('REQ-005: builds the per-question table from v1 and v2 results of the same format', () => {
    const aggs = aggregateByQuestion([
      { format: 'diagnostic-test-2', versionId: 'set-2', attempts: [attempt(true)] },
      { format: 'diagnostic-test-2', versionId: 'set-3', attempts: [attempt(false)] },
      { format: 'diagnostic-test-2', versionId: 'set-3', attempts: [attempt(false, false)] },
    ]);
    const [stat] = buildQuestionStats([q], aggs, 'diagnostic-test-2');
    expect(stat.exposures).toBe(3);
    expect(stat.totalAttempts).toBe(2);
    expect(stat.accuracyRate).toBe(0.5);
    expect(stat.accuracyOverall).toBeCloseTo(1 / 3);
    expect(stat.correctAnswer).toBe('A');
    expect(stat.answerDistribution).toEqual({ A: 1, B: 1 });
  });

  it('REQ-005: ignores other formats and returns zeros for unseen questions', () => {
    const aggs = aggregateByQuestion([{ format: 'diagnostic-test-1', versionId: 's', attempts: [attempt(true)] }]);
    const [stat] = buildQuestionStats([q], aggs, 'diagnostic-test-2');
    expect(stat).toMatchObject({ exposures: 0, totalAttempts: 0, accuracyRate: 0 });
  });
});
