import { describe, it, expect } from 'vitest';
import { chunk } from '../chunk';

describe('chunk', () => {
  it('size 단위로 자르고 마지막 묶음은 남은 만큼', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  it('빈 배열은 빈 결과', () => {
    expect(chunk([], 3)).toEqual([]);
  });
});
