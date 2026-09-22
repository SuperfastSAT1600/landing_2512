import { describe, it, expect } from 'vitest';
import { computeKindLabels } from '../useKindLabels';

const CATEGORIES = [
  { id: 'cat-1', name: '컨택 전략', sort_order: 0 },
  { id: 'cat-2', name: '첫 세일즈콜', sort_order: 1 },
  { id: 'cat-3', name: '진단 Report 세일즈 전략', sort_order: 2 },
];

describe('computeKindLabels', () => {
  it('kind에 속한 전략이 카테고리 1개에만 있으면 그 카테고리 이름을 쓴다', () => {
    const strategies = [{ kind: 'initial_contact' as const, category_id: 'cat-1' }];
    const labels = computeKindLabels(strategies, CATEGORIES);
    expect(labels.initial_contact).toBe('컨택 전략');
  });

  it('kind에 속한 전략이 여러 카테고리에 걸쳐 있으면 sort_order가 가장 작은 카테고리 이름만 쓴다(이어붙이지 않는다)', () => {
    const strategies = [
      { kind: 'initial_sales' as const, category_id: 'cat-3' },
      { kind: 'initial_sales' as const, category_id: 'cat-2' },
    ];
    const labels = computeKindLabels(strategies, CATEGORIES);
    expect(labels.initial_sales).toBe('첫 세일즈콜');
  });

  it('kind에 속한 전략이 하나도 없으면 고정 폴백 라벨을 쓴다', () => {
    const labels = computeKindLabels([], CATEGORIES);
    expect(labels.retry).toBe('재시도 세일즈 전략');
    expect(labels.initial_contact).toBe('최초 컨텍 전략');
    expect(labels.initial_sales).toBe('최초 세일즈 전략');
  });

  it('같은 카테고리에 여러 전략이 있어도 이름은 한 번만 나온다', () => {
    const strategies = [
      { kind: 'retry' as const, category_id: 'cat-1' },
      { kind: 'retry' as const, category_id: 'cat-1' },
    ];
    const labels = computeKindLabels(strategies, CATEGORIES);
    expect(labels.retry).toBe('컨택 전략');
  });
});
