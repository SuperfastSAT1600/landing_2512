import { describe, it, expect } from 'vitest';
import {
  appendStrategyHistoryEntry,
  buildStrategyHistoryEntry,
  hasInitialFunnelStrategy,
  isActiveInitialSalesLead,
} from '@/lib/strategy-history';
import type { StrategyHistoryEntry } from '@/types/crm';

const existing: StrategyHistoryEntry = {
  id: 'e-1',
  type: 'initial_contact',
  strategy_id: 's-0',
  strategy_name: '첫 컨택',
  memo: '',
  applied_at: '2026-08-01T00:00:00.000Z',
};

describe('buildStrategyHistoryEntry', () => {
  it('id·applied_at을 채우고 memo는 트림한다', () => {
    const entry = buildStrategyHistoryEntry({
      type: 'initial_sales',
      strategy_id: 's-1',
      strategy_name: '진단리포트 당일등록 할인',
      memo: '  당일 제안  ',
    });
    expect(entry.id).toMatch(/[0-9a-f-]{36}/);
    expect(entry.applied_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(entry.memo).toBe('당일 제안');
    expect(entry.type).toBe('initial_sales');
    expect(entry.strategy_id).toBe('s-1');
  });

  it('applied_at을 명시하면 그대로 쓴다 (과거 적용 소급 기록)', () => {
    const entry = buildStrategyHistoryEntry({
      type: 'retry',
      strategy_id: 's-2',
      strategy_name: '인스타 재신청',
      applied_at: '2026-08-18T10:00:00.000Z',
    });
    expect(entry.applied_at).toBe('2026-08-18T10:00:00.000Z');
    expect(entry.memo).toBe('');
  });
});

describe('appendStrategyHistoryEntry', () => {
  it('기존 이력을 보존하며 뒤에 붙인다', () => {
    const next = buildStrategyHistoryEntry({ type: 'retry', strategy_id: 's-2', strategy_name: '재시도' });
    const result = appendStrategyHistoryEntry([existing], next);
    expect(result).toEqual([existing, next]);
  });

  it('원본 배열을 변형하지 않는다', () => {
    const history = [existing];
    const next = buildStrategyHistoryEntry({ type: 'retry', strategy_id: 's-2', strategy_name: '재시도' });
    appendStrategyHistoryEntry(history, next);
    expect(history).toHaveLength(1);
  });

  it('이력이 null이어도 새 배열을 만든다', () => {
    const next = buildStrategyHistoryEntry({ type: 'retry', strategy_id: 's-2', strategy_name: '재시도' });
    expect(appendStrategyHistoryEntry(null, next)).toEqual([next]);
  });
});

describe('hasInitialFunnelStrategy', () => {
  it('컨택 전략(initial_contact)만 있어도 true — 첫 컨택도 정당한 전략 적용이다', () => {
    expect(hasInitialFunnelStrategy({ strategy_history: [existing] })).toBe(true);
  });

  it('세일즈 전략(initial_sales)만 있어도 true', () => {
    expect(hasInitialFunnelStrategy({ strategy_history: [{ ...existing, type: 'initial_sales' }] })).toBe(true);
  });

  it('재시도 전략(retry)만 있으면 false — 별도 트랙이라 제외', () => {
    expect(hasInitialFunnelStrategy({ strategy_history: [{ ...existing, type: 'retry' }] })).toBe(false);
  });

  it('strategy_history가 없거나 빈 배열이면 false', () => {
    expect(hasInitialFunnelStrategy({ strategy_history: [] })).toBe(false);
    expect(hasInitialFunnelStrategy({ strategy_history: null as unknown as StrategyHistoryEntry[] })).toBe(false);
  });
});

describe('isActiveInitialSalesLead', () => {
  it('활성 + 재시도 트랙 아님 → true', () => {
    expect(isActiveInitialSalesLead({ lead_status: 'active', retry_strategy_id: null })).toBe(true);
  });

  it('재시도 트랙(retry_strategy_id 있음) → false', () => {
    expect(isActiveInitialSalesLead({ lead_status: 'active', retry_strategy_id: 'rs-1' })).toBe(false);
  });

  it('활성 상태가 아니면 → false', () => {
    expect(isActiveInitialSalesLead({ lead_status: 'inactive', retry_strategy_id: null })).toBe(false);
  });
});
