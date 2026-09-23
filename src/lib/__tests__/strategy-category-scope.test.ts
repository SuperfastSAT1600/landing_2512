import { describe, it, expect } from 'vitest';
import { resolveCategoryId } from '@/lib/strategy-category-scope';

const CATS = [
  { id: 'c2', sort_order: 1 },
  { id: 'c1', sort_order: 0 },
  { id: 'c3', sort_order: 2 },
];

describe('resolveCategoryId', () => {
  it('요청에 category_id가 있으면 그대로 쓴다', () => {
    expect(resolveCategoryId('c3', CATS)).toBe('c3');
  });

  it('없으면 sort_order가 가장 낮은 카테고리로 떨어진다 — 배포 직후 옛 번들이 보내는 요청 구제', () => {
    expect(resolveCategoryId(null, CATS)).toBe('c1');
  });

  it('요청 값이 빈 문자열이어도 폴백한다', () => {
    expect(resolveCategoryId('', CATS)).toBe('c1');
  });

  it('카테고리가 하나도 없으면 null — 호출부가 400으로 알린다', () => {
    expect(resolveCategoryId(null, [])).toBeNull();
  });

  it('요청 값이 실재하지 않는 id여도 그대로 쓴다 — 빈 집계가 정답이지 남의 카테고리로 바꿔치면 안 된다', () => {
    expect(resolveCategoryId('없는id', CATS)).toBe('없는id');
  });
});
