// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { middleware } from '../middleware';

function req(url: string, cookie?: string) {
  return new NextRequest(url, { headers: cookie ? { cookie } : {} });
}

describe('middleware — 종료된 수업권 V1·V2 (REQ-002)', () => {
  it('고객은 쿼리를 유지한 채 V3로 307', () => {
    const res = middleware(req('https://tutoring.superfastsat.com/enrollment2026/en?utm_source=kakao'));
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('https://tutoring.superfastsat.com/enrollment-v3/en?utm_source=kakao');
  });

  it('V1도 V3로', () => {
    const res = middleware(req('https://tutoring.superfastsat.com/enrollment'));
    expect(res.headers.get('location')).toBe('https://tutoring.superfastsat.com/enrollment-v3');
  });

  it('관리자 쿠키가 있으면 통과', () => {
    const res = middleware(req('https://tutoring.superfastsat.com/enrollment2026', 'admin_verified=1'));
    expect(res.headers.get('location')).toBeNull();
    expect(res.headers.get('x-middleware-next')).toBe('1');
  });

  it('V3와 정적 파일은 그대로', () => {
    for (const p of ['/enrollment-v3', '/enrollment/logo.png']) {
      expect(middleware(req(`https://tutoring.superfastsat.com${p}`)).headers.get('location')).toBeNull();
    }
  });
});
