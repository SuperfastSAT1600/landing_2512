import { describe, it, expect } from 'vitest';
import { resolveDefaultKind } from '../resolveDefaultKind';

describe('resolveDefaultKind', () => {
  it('카테고리가 비어 있으면 최초 세일즈용을 기본값으로 쓴다', () => {
    expect(resolveDefaultKind([])).toBe('initial_sales');
  });

  it('가장 많은 kind를 기본값으로 쓴다', () => {
    const strategies = [
      { kind: 'initial_contact' as const },
      { kind: 'initial_contact' as const },
      { kind: 'retry' as const },
    ];
    expect(resolveDefaultKind(strategies)).toBe('initial_contact');
  });

  it('전부 같은 kind면 그 kind를 쓴다', () => {
    const strategies = [{ kind: 'retry' as const }, { kind: 'retry' as const }];
    expect(resolveDefaultKind(strategies)).toBe('retry');
  });
});
