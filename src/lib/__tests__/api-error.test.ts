import { describe, it, expect } from 'vitest';
import { apiErrorMessage, apiErrorCode } from '../api-error';

describe('apiErrorMessage', () => {
  // REQ-007 (crm-quality-cleanup): 서버 형식이 섞여 있어도 같은 메시지를 꺼낸다
  it('표준 형식 { error: { code, message } }의 message', () => {
    expect(apiErrorMessage({ error: { code: 'X', message: '실패함' } }, '기본')).toBe('실패함');
  });

  it('구 형식 { error: "..." }의 문자열', () => {
    expect(apiErrorMessage({ error: '실패함' }, '기본')).toBe('실패함');
  });

  it('message 없는 { error: { code } }는 fallback', () => {
    expect(apiErrorMessage({ error: { code: 'UNAUTHORIZED' } }, '기본')).toBe('기본');
  });

  it('본문이 없거나 error가 없으면 fallback', () => {
    expect(apiErrorMessage(null, '기본')).toBe('기본');
    expect(apiErrorMessage(undefined, '기본')).toBe('기본');
    expect(apiErrorMessage({ data: 1 }, '기본')).toBe('기본');
    expect(apiErrorMessage({ error: '' }, '기본')).toBe('기본');
  });

  it('객체가 아닌 본문이나 문자열이 아닌 error는 fallback', () => {
    expect(apiErrorMessage('Internal Server Error', '기본')).toBe('기본');
    expect(apiErrorMessage({ error: 123 }, '기본')).toBe('기본');
    expect(apiErrorMessage({ error: { message: '' } }, '기본')).toBe('기본');
    expect(apiErrorMessage({ error: { message: 42 } }, '기본')).toBe('기본');
  });
});

describe('apiErrorCode', () => {
  it('error.code를 우선한다', () => {
    expect(apiErrorCode({ error: { code: 'ENROLL_FAILED', message: 'x' }, code: 'OTHER' })).toBe('ENROLL_FAILED');
  });

  it('구 형식의 최상위 code', () => {
    expect(apiErrorCode({ error: 'x', code: 'ENROLL_FAILED' })).toBe('ENROLL_FAILED');
  });

  it('문자열이 아닌 code는 무시한다', () => {
    expect(apiErrorCode({ error: { code: 7 } })).toBeNull();
  });

  it('코드가 없으면 null', () => {
    expect(apiErrorCode({ error: '문자열' })).toBeNull();
    expect(apiErrorCode(null)).toBeNull();
  });
});
