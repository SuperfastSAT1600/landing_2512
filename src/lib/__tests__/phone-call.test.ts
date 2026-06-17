import { describe, it, expect } from 'vitest';
import { createHmac } from 'crypto';
import {
  computeExpiresAt,
  isExpired,
  verifyWebhookSignature,
  generatePublicToken,
  RECORDING_RETENTION_DAYS,
} from '../phone-call';

describe('phone-call retention', () => {
  it('computeExpiresAt는 기준 시각 + 보관일수', () => {
    const now = Date.UTC(2026, 0, 1);
    const exp = new Date(computeExpiresAt(now)).getTime();
    expect(exp - now).toBe(RECORDING_RETENTION_DAYS * 86400000);
  });

  it('isExpired는 만료 시각이 과거면 true', () => {
    const now = Date.UTC(2026, 0, 1);
    expect(isExpired(new Date(now - 1000).toISOString(), now)).toBe(true);
    expect(isExpired(new Date(now + 1000).toISOString(), now)).toBe(false);
  });

  it('isExpired는 잘못된 날짜 문자열이면 false', () => {
    expect(isExpired('not-a-date', Date.now())).toBe(false);
  });
});

describe('generatePublicToken', () => {
  it('URL-safe 난수를 매번 다르게 생성', () => {
    const a = generatePublicToken();
    const b = generatePublicToken();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(a.length).toBeGreaterThanOrEqual(24);
  });
});

describe('verifyWebhookSignature', () => {
  const secret = Buffer.from('super-secret-key').toString('base64');
  const rawBody = '{"type":"recording.ready-to-download"}';
  const timestamp = '1700000000';

  function sign(ts: string, body: string, key: string): string {
    return createHmac('sha256', Buffer.from(key, 'base64')).update(`${ts}.${body}`).digest('base64');
  }

  it('올바른 서명은 통과', () => {
    const signature = sign(timestamp, rawBody, secret);
    expect(verifyWebhookSignature({ rawBody, timestamp, signature, secret })).toBe(true);
  });

  it('변조된 바디는 거부', () => {
    const signature = sign(timestamp, rawBody, secret);
    expect(
      verifyWebhookSignature({ rawBody: rawBody + 'x', timestamp, signature, secret })
    ).toBe(false);
  });

  it('타임스탬프 누락은 거부', () => {
    const signature = sign(timestamp, rawBody, secret);
    expect(verifyWebhookSignature({ rawBody, timestamp: null, signature, secret })).toBe(false);
  });

  it('서명 누락은 거부', () => {
    expect(verifyWebhookSignature({ rawBody, timestamp, signature: null, secret })).toBe(false);
  });

  it('다른 시크릿으로 만든 서명은 거부', () => {
    const signature = sign(timestamp, rawBody, Buffer.from('other').toString('base64'));
    expect(verifyWebhookSignature({ rawBody, timestamp, signature, secret })).toBe(false);
  });
});
