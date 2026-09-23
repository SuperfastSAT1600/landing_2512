import { describe, it, expect } from 'vitest';
import { resolveTargetCategoryId } from '../useStrategyLibraryDnd';
import type { RetryStrategy, StrategyCategory } from '@/types/crm';

const categories: StrategyCategory[] = [
  { id: 'cat-1', segment: 'b2c', name: '최초 컨텍 전략', sort_order: 0, created_at: 'x', updated_at: 'x' },
  { id: 'cat-2', segment: 'b2c', name: '커스텀', sort_order: 1, created_at: 'x', updated_at: 'x' },
];

const strategies: RetryStrategy[] = [
  { id: 's-1', name: '전략1', description: null, category_id: 'cat-1', segment: 'b2c', created_at: 'x' },
  { id: 's-2', name: '전략2', description: null, category_id: 'cat-2', segment: 'b2c', created_at: 'x' },
];

describe('resolveTargetCategoryId', () => {
  it('드롭 대상이 카테고리 id면 그대로 사용', () => {
    expect(resolveTargetCategoryId('cat-2', strategies, categories)).toBe('cat-2');
  });

  it('드롭 대상이 다른 카드 id면 그 카드가 속한 카테고리로 해석', () => {
    expect(resolveTargetCategoryId('s-2', strategies, categories)).toBe('cat-2');
  });

  it('알 수 없는 id면 null', () => {
    expect(resolveTargetCategoryId('unknown', strategies, categories)).toBeNull();
  });
});
