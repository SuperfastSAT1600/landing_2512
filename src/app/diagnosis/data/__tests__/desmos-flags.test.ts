import { describe, it, expect } from 'vitest';
import diagnosticTest2 from '../diagnostic-test-2';

const DESMOS_QUESTION_NUMBERS = [14, 17, 18, 19, 21, 22];

describe('diagnostic-test-2 desmosRecommended', () => {
  it('Desmos 추천은 Q14, Q17, Q18, Q19, Q21, Q22 여섯 문항뿐이다', () => {
    const numbers = diagnosticTest2.questions
      .map((q, i) => (q.desmosRecommended === true ? i + 1 : null))
      .filter((n) => n !== null);
    expect(numbers).toEqual(DESMOS_QUESTION_NUMBERS);
  });

  it('추천 문항은 모두 Math 섹션이다', () => {
    const flagged = diagnosticTest2.questions.filter((q) => q.desmosRecommended === true);
    expect(flagged.every((q) => q.section === 'Math')).toBe(true);
  });
});
