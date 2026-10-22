import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createStaffSessionToken, isStaffRole, verifyStaffSessionToken, STAFF_SESSION_TTL_SECONDS } from '../staff-session';

const user = { id: 'u1', name: '신명경', role: 'staff' as const };

describe('staff-session', () => {
  beforeEach(() => {
    process.env.STAFF_SESSION_SECRET = 'test-secret';
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-22T00:00:00Z'));
  });
  afterEach(() => vi.useRealTimers());

  it('발급한 토큰은 검증되어 같은 직원 정보를 돌려준다', () => {
    expect(verifyStaffSessionToken(createStaffSessionToken(user))).toEqual(user);
  });

  it('만료 시각이 지나면 거부', () => {
    const token = createStaffSessionToken(user);
    vi.setSystemTime(new Date(Date.now() + (STAFF_SESSION_TTL_SECONDS + 1) * 1000));
    expect(verifyStaffSessionToken(token)).toBeNull();
  });

  it('본문을 바꾸면 서명이 맞지 않아 거부', () => {
    const [, sig] = createStaffSessionToken(user).split('.');
    const forged = Buffer.from(JSON.stringify({ ...user, role: 'admin', exp: 9999999999 })).toString('base64url');
    expect(verifyStaffSessionToken(`${forged}.${sig}`)).toBeNull();
  });

  it('다른 비밀키로 서명된 토큰은 거부', () => {
    const token = createStaffSessionToken(user);
    process.env.STAFF_SESSION_SECRET = 'other-secret';
    expect(verifyStaffSessionToken(token)).toBeNull();
  });

  it('형식이 깨진 값과 빈 값은 거부', () => {
    expect(verifyStaffSessionToken('garbage')).toBeNull();
    expect(verifyStaffSessionToken(undefined)).toBeNull();
  });

  it('비밀키가 없으면 발급 시 오류', () => {
    delete process.env.STAFF_SESSION_SECRET;
    delete process.env.ADMIN_SECRET_KEY;
    expect(() => createStaffSessionToken(user)).toThrow();
  });

  it('staff와 admin만 직원 역할', () => {
    expect(isStaffRole('staff')).toBe(true);
    expect(isStaffRole('admin')).toBe(true);
    expect(isStaffRole('student')).toBe(false);
    expect(isStaffRole('teacher')).toBe(false);
    expect(isStaffRole(null)).toBe(false);
  });
});
