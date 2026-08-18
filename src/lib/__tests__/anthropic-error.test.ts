import { describe, it, expect } from 'vitest';
import { anthropicErrorMessage } from '@/lib/anthropic-error';

describe('anthropicErrorMessage', () => {
  it('크레딧 부족 → 크레딧 안내', () => {
    const err = new Error(
      '400 {"type":"error","error":{"type":"invalid_request_error","message":"Your credit balance is too low to access the Anthropic API. Please go to Plans & Billing to upgrade or purchase credits."}}'
    );
    expect(anthropicErrorMessage(err)).toContain('크레딧 잔액이 부족');
  });

  it('401 인증 실패 → 인증 안내', () => {
    const err = Object.assign(new Error('401 authentication_error: invalid x-api-key'), {
      status: 401,
    });
    expect(anthropicErrorMessage(err)).toContain('인증에 실패');
  });

  it('429 rate limit → 잠시 후 재시도 안내', () => {
    const err = Object.assign(new Error('429 rate_limit_error'), { status: 429 });
    expect(anthropicErrorMessage(err)).toContain('잠시 후');
  });

  it('overloaded → 잠시 후 재시도 안내', () => {
    const err = new Error('529 {"error":{"type":"overloaded_error"}}');
    expect(anthropicErrorMessage(err)).toContain('잠시 후');
  });

  it('web_search 관련 → 웹 검색 안내', () => {
    const err = new Error('400 invalid_request_error: web_search tool is not enabled');
    expect(anthropicErrorMessage(err)).toContain('웹 검색');
  });

  it('미분류 → 일반 메시지', () => {
    const err = new Error('something unexpected');
    const msg = anthropicErrorMessage(err);
    expect(msg).toContain('AI 응답 생성에 실패');
    expect(msg).not.toContain('웹 검색'); // 더 이상 고정 web-search 문구가 아니다
  });

  it('모든 메시지는 [오류] 접두사로 시작', () => {
    expect(anthropicErrorMessage(new Error('x'))).toMatch(/^\[오류\]/);
  });

  it('null/undefined도 안전하게 일반 메시지', () => {
    expect(anthropicErrorMessage(null)).toContain('AI 응답 생성에 실패');
  });
});
