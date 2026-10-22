import { describe, expect, it } from 'vitest';
import { clearLoginFailures, isLoginBlocked, recordLoginFailure } from '../login-rate-limit';

describe('login-rate-limit', () => {
  it('15분 안에 5회 실패하면 차단', () => {
    const now = 1_000_000;
    for (let i = 0; i < 4; i++) recordLoginFailure('k1', now + i);
    expect(isLoginBlocked('k1', now + 10)).toBe(false);
    recordLoginFailure('k1', now + 5);
    expect(isLoginBlocked('k1', now + 10)).toBe(true);
  });

  it('15분이 지나면 풀린다', () => {
    const now = 2_000_000;
    for (let i = 0; i < 5; i++) recordLoginFailure('k2', now);
    expect(isLoginBlocked('k2', now + 15 * 60 * 1000 + 1)).toBe(false);
  });

  it('키별로 따로 센다', () => {
    for (let i = 0; i < 5; i++) recordLoginFailure('k3', 3_000_000);
    expect(isLoginBlocked('k4', 3_000_001)).toBe(false);
  });

  it('성공하면 초기화', () => {
    for (let i = 0; i < 5; i++) recordLoginFailure('k5', 4_000_000);
    clearLoginFailures('k5');
    expect(isLoginBlocked('k5', 4_000_001)).toBe(false);
  });
});
