import { describe, it, expect } from 'vitest';
import {
  computeExpiresAt,
  isExpired,
  RECORDING_RETENTION_DAYS,
  ALLOWED_AUDIO_MIME,
  MAX_AUDIO_BYTES,
} from '@/lib/call-recording';

const NOW = Date.parse('2026-06-10T00:00:00Z');

describe('computeExpiresAt', () => {
  it('보관일수(30일) 뒤 시각을 반환', () => {
    const exp = computeExpiresAt(NOW);
    expect(exp).toBe(new Date(NOW + RECORDING_RETENTION_DAYS * 86400000).toISOString());
  });
});

describe('isExpired', () => {
  it('만료 시각이 과거면 true', () => {
    expect(isExpired('2026-06-09T00:00:00Z', NOW)).toBe(true);
  });
  it('만료 시각이 미래면 false', () => {
    expect(isExpired('2026-07-10T00:00:00Z', NOW)).toBe(false);
  });
  it('정확히 같은 시각이면 만료로 본다', () => {
    expect(isExpired(new Date(NOW).toISOString(), NOW)).toBe(true);
  });
  it('잘못된 값은 false', () => {
    expect(isExpired('nope', NOW)).toBe(false);
  });
});

describe('업로드 제약', () => {
  it('주요 브라우저 녹음 MIME을 허용', () => {
    expect(ALLOWED_AUDIO_MIME.has('audio/webm')).toBe(true);
    expect(ALLOWED_AUDIO_MIME.has('audio/mp4')).toBe(true);
    expect(ALLOWED_AUDIO_MIME.has('audio/ogg')).toBe(true);
  });
  it('이미지 등은 불허', () => {
    expect(ALLOWED_AUDIO_MIME.has('image/png')).toBe(false);
  });
  it('세그먼트 용량 캡은 24MB (OpenAI 25MB 한도 아래)', () => {
    expect(MAX_AUDIO_BYTES).toBe(24 * 1024 * 1024);
  });
});
