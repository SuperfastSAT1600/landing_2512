import { describe, it, expect } from 'vitest';
import { ssatMathQuestions } from '../ssat-math-questions';
import { MAX_SSAT_SET, QUESTIONS_PER_SET } from '@/lib/ssat-math-config';

describe('ssat-math-questions', () => {
  it('has every set 1..MAX_SSAT_SET with all question numbers once', () => {
    for (let s = 1; s <= MAX_SSAT_SET; s++) {
      const nums = ssatMathQuestions
        .filter(q => q.set_number === s)
        .map(q => q.question_number)
        .sort((a, b) => a - b);
      expect(nums, `set ${s}`).toEqual(Array.from({ length: QUESTIONS_PER_SET }, (_, i) => i + 1));
    }
  });

  it('has no sets beyond MAX_SSAT_SET', () => {
    expect(ssatMathQuestions.every(q => q.set_number >= 1 && q.set_number <= MAX_SSAT_SET)).toBe(true);
  });

  it('has 5 distinct non-empty choices and a valid answer for every question', () => {
    for (const q of ssatMathQuestions) {
      const choices = [q.choice_a, q.choice_b, q.choice_c, q.choice_d, q.choice_e];
      const id = `set ${q.set_number} q${q.question_number}`;
      expect(choices.every(c => c.trim() !== ''), id).toBe(true);
      expect(new Set(choices).size, id).toBe(5);
      expect(['A', 'B', 'C', 'D', 'E']).toContain(q.correct_answer);
    }
  });

  it('has no duplicate question text', () => {
    const texts = ssatMathQuestions.map(q => q.question_text);
    expect(new Set(texts).size).toBe(texts.length);
  });
});
