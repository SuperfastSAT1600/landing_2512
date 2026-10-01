import { describe, it, expect } from 'vitest';
import { resolveDefaultCategoryId } from '../resolveDefaultCategoryId';

describe('resolveDefaultCategoryId', () => {
  it('sort_order가 가장 낮은 카테고리를 고른다 (이름과 무관)', () => {
    const categories = [
      { id: 'c-2', name: '진단 Report 세일즈 전략', sort_order: 2 },
      { id: 'c-0', name: '컨택 전략', sort_order: 0 },
      { id: 'c-1', name: '첫 세일즈콜', sort_order: 1 },
    ];
    expect(resolveDefaultCategoryId(categories)).toBe('c-0');
  });

  it('카테고리가 하나도 없으면 null', () => {
    expect(resolveDefaultCategoryId([])).toBeNull();
  });

  it('이름이 특정 문자열과 일치하지 않아도(개명·삭제 이후) 정상 동작한다', () => {
    // 재시도 세일즈 전략 카테고리가 삭제되고 다른 이름의 카테고리만 남은 실제 프로덕션 상황 재현
    const categories = [{ id: 'c-x', name: '아무 이름', sort_order: 0 }];
    expect(resolveDefaultCategoryId(categories)).toBe('c-x');
  });
});
