import { describe, it, expect } from 'vitest';
import {
  appendStrategyHistoryEntry,
  buildStrategyHistoryEntry,
  hasAnyStrategy,
  isActiveInitialSalesLead,
} from '@/lib/strategy-history';
import type { StrategyHistoryEntry } from '@/types/crm';

const existing: StrategyHistoryEntry = {
  id: 'e-1',
  strategy_id: 's-0',
  strategy_name: '첫 컨택',
  memo: '',
  applied_at: '2026-08-01T00:00:00.000Z',
};

describe('buildStrategyHistoryEntry', () => {
  it('id·applied_at을 채우고 memo는 트림한다', () => {
    const entry = buildStrategyHistoryEntry({
      strategy_id: 's-1',
      strategy_name: '진단리포트 당일등록 할인',
      memo: '  당일 제안  ',
    });
    expect(entry.id).toMatch(/[0-9a-f-]{36}/);
    expect(entry.applied_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(entry.memo).toBe('당일 제안');
    expect(entry.strategy_id).toBe('s-1');
  });

  it('applied_at을 명시하면 그대로 쓴다 (과거 적용 소급 기록)', () => {
    const entry = buildStrategyHistoryEntry({
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
    const next = buildStrategyHistoryEntry({ strategy_id: 's-2', strategy_name: '재시도' });
    const result = appendStrategyHistoryEntry([existing], next);
    expect(result).toEqual([existing, next]);
  });

  it('원본 배열을 변형하지 않는다', () => {
    const history = [existing];
    const next = buildStrategyHistoryEntry({ strategy_id: 's-2', strategy_name: '재시도' });
    appendStrategyHistoryEntry(history, next);
    expect(history).toHaveLength(1);
  });

  it('이력이 null이어도 새 배열을 만든다', () => {
    const next = buildStrategyHistoryEntry({ strategy_id: 's-2', strategy_name: '재시도' });
    expect(appendStrategyHistoryEntry(null, next)).toEqual([next]);
  });
});

describe('hasAnyStrategy', () => {
  it('전략이 하나라도 적용됐으면 true — kind 구분 없이 적용 여부만 본다', () => {
    expect(hasAnyStrategy({ strategy_history: [existing] })).toBe(true);
  });

  it('strategy_history가 없거나 빈 배열이면 false', () => {
    expect(hasAnyStrategy({ strategy_history: [] })).toBe(false);
    expect(hasAnyStrategy({ strategy_history: null as unknown as StrategyHistoryEntry[] })).toBe(false);
  });

  it('재시도 트랙 구분은 retry_strategy_id 가 한다 — 여기서 걸러내지 않는다', () => {
    expect(hasAnyStrategy({ strategy_history: [existing] })).toBe(true);
    expect(isActiveInitialSalesLead({ lead_status: 'active', retry_strategy_id: 'rs-1' })).toBe(false);
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
