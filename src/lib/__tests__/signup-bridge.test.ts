import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { mapStudentToPrefill, buildSignupUrl, isBridgeAuthenticated } from '../signup-bridge';

describe('mapStudentToPrefill', () => {
  it('maps CRM student columns to the platform prefill shape', () => {
    const prefill = mapStudentToPrefill({
      name: '홍길동',
      parent_phone: '+82 10-1234-5678',
      parent_timezone: 'Asia/Seoul',
      previous_rw_score: 600,
      previous_math_score: 700,
      previous_test_date: '2025-12',
      target_test_date: '2026-05-03',
    });
    expect(prefill).toEqual({
      studentName: '홍길동',
      parentPhone: '+82 10-1234-5678',
      parentTimezone: 'Asia/Seoul',
      lastScoreRw: 600,
      lastScoreMath: 700,
      lastTestDate: '2025-12',
      targetTestDate: '2026-05-03',
    });
  });

  it('coerces missing/undefined columns to null', () => {
    const prefill = mapStudentToPrefill({ name: 'Jamie' });
    expect(prefill.studentName).toBe('Jamie');
    expect(prefill.parentPhone).toBeNull();
    expect(prefill.lastScoreRw).toBeNull();
    expect(prefill.targetTestDate).toBeNull();
  });
});

describe('buildSignupUrl', () => {
  it('builds the tutoring signup URL and encodes the token', () => {
    expect(buildSignupUrl('https://app.superfastsat.com', 'abc123')).toBe(
      'https://app.superfastsat.com/signup/tutoring?token=abc123',
    );
  });

  it('strips a trailing slash from the base', () => {
    expect(buildSignupUrl('https://app.superfastsat.com/', 'tok')).toBe(
      'https://app.superfastsat.com/signup/tutoring?token=tok',
    );
  });
});

describe('isBridgeAuthenticated', () => {
  beforeEach(() => {
    delete process.env.SIGNUP_BRIDGE_SECRET;
  });

  function req(secret?: string) {
    const headers: Record<string, string> = {};
    if (secret !== undefined) headers['x-signup-bridge-secret'] = secret;
    return new NextRequest('http://localhost/api/crm/signup/tok', { headers });
  }

  it('accepts a matching secret', () => {
    process.env.SIGNUP_BRIDGE_SECRET = 'shhh';
    expect(isBridgeAuthenticated(req('shhh'))).toBe(true);
  });

  it('rejects a wrong secret', () => {
    process.env.SIGNUP_BRIDGE_SECRET = 'shhh';
    expect(isBridgeAuthenticated(req('nope'))).toBe(false);
  });

  it('rejects a missing header', () => {
    process.env.SIGNUP_BRIDGE_SECRET = 'shhh';
    expect(isBridgeAuthenticated(req())).toBe(false);
  });

  it('fails closed when the secret is not configured', () => {
    expect(isBridgeAuthenticated(req('anything'))).toBe(false);
  });
});
