// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { apiError, unauthorized, codeForStatus } from '../api-response';

describe('apiError', () => {
  // REQ-006 (crm-quality-cleanup)
  it('표준 형식 { error: { code, message } }과 status를 만든다', async () => {
    const res = apiError('NOT_FOUND', '학생을 찾을 수 없습니다.', 404);
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: { code: 'NOT_FOUND', message: '학생을 찾을 수 없습니다.' } });
  });

  it('extra 필드를 본문 최상위에 함께 싣는다', async () => {
    const res = apiError('ENROLL_FAILED', '전환 실패', 500, { data: { payment: { id: 'p1' } } });
    expect(await res.json()).toEqual({
      error: { code: 'ENROLL_FAILED', message: '전환 실패' },
      data: { payment: { id: 'p1' } },
    });
  });
});

describe('unauthorized', () => {
  it('401 UNAUTHORIZED', async () => {
    const res = unauthorized();
    expect(res.status).toBe(401);
    expect((await res.json()).error.code).toBe('UNAUTHORIZED');
  });
});

describe('codeForStatus', () => {
  it('상태 코드별 기본 에러 코드', () => {
    expect(codeForStatus(400)).toBe('BAD_REQUEST');
    expect(codeForStatus(404)).toBe('NOT_FOUND');
    expect(codeForStatus(409)).toBe('CONFLICT');
    expect(codeForStatus(500)).toBe('INTERNAL_ERROR');
    expect(codeForStatus(502)).toBe('UPSTREAM_ERROR');
    expect(codeForStatus(418)).toBe('ERROR');
  });
});
