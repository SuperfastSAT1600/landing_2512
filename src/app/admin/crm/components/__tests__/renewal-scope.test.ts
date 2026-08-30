import { describe, it, expect } from 'vitest';
import { defaultRenewalScope } from '../use-renewal-board';

describe('defaultRenewalScope', () => {
  it('오늘이 속한 주차로 시작한다 — 첫 화면에서 5단계·전환율이 바로 보이게', () => {
    expect(defaultRenewalScope(new Date('2026-08-20T05:00:00Z'))).toEqual({
      kind: 'week',
      weekStart: '2026-08-17',
    });
  });

  it('주차 경계는 한국 시간 기준 — 월요일 아침에 지난 주차로 떨어지지 않는다', () => {
    // 2026-08-16T23:00Z = 08-17(월) 08:00 KST
    expect(defaultRenewalScope(new Date('2026-08-16T23:00:00Z'))).toEqual({
      kind: 'week',
      weekStart: '2026-08-17',
    });
  });

  it('정의된 주차 범위 밖이면 진행 중 전체로 폴백한다', () => {
    expect(defaultRenewalScope(new Date('2030-01-01T00:00:00Z'))).toEqual({ kind: 'open' });
  });
});
