// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { ApiError, AuthError, NotFoundError, DatasetImportError } from '@intfunc/sdk';
import { describeSendFailure } from '@/lib/intfunc/send-failure';
import { MissingEnvError } from '@/lib/intfunc/client';

describe('전송 실패 해석 — REQ-208', () => {
  it('키가 거부되면 무엇을 고쳐야 하는지 말한다', () => {
    const failure = describeSendFailure(new AuthError('invalid api key'));
    expect(failure.status).toBe(502);
    expect(failure.code).toBe('intfunc.auth');
    expect(failure.message).toContain('INTFUNC_API_KEY');
  });

  it('404는 slug 문제로 안내한다 — 키가 다른 프로젝트면 존재 여부조차 알려주지 않는다', () => {
    const failure = describeSendFailure(new NotFoundError('no such dataset'));
    expect(failure.code).toBe('intfunc.not_found');
    expect(failure.message).toContain('INTFUNC_PROJECT_SLUG');
  });

  it('413은 나눠 보내라고 안내한다', () => {
    const failure = describeSendFailure(new ApiError(413, 'payload too large'));
    expect(failure.code).toBe('intfunc.too_large');
    expect(failure.message).toContain('나눠');
  });

  it('IF가 준 code를 그대로 달아준다 — 콘솔 로그와 대조할 수 있어야 한다', () => {
    const failure = describeSendFailure(
      new ApiError(400, 'row 3 is not an object', undefined, 'dataset.cast.not_an_object')
    );
    expect(failure.status).toBe(502);
    expect(failure.code).toBe('dataset.cast.not_an_object');
  });

  it('서버 문구를 그대로 옮기지 않는다 — 거절당한 값이 섞여 있을 수 있다', () => {
    const failure = describeSendFailure(
      new ApiError(400, 'rejected row: 상담사: 김민준 학생 어머니', undefined, 'dataset.cast.bad')
    );
    expect(failure.message).not.toContain('김민준');
  });

  it('보내기 전 거절은 400이고 어느 행인지 알려준다', () => {
    const failure = describeSendFailure(
      new DatasetImportError('2 rows are not rows', [
        { index: 3, message: 'not an object' },
        { index: 7, message: 'not an object' },
      ])
    );
    expect(failure.status).toBe(400);
    expect(failure.code).toBe('dataset.rows_invalid');
    expect(failure.rows).toEqual([3, 7]);
    expect(failure.message).toContain('2');
  });

  it('env가 비어 있으면 그 사실을 그대로 알린다 — 우리가 쓴 문장이다', () => {
    const failure = describeSendFailure(new MissingEnvError('INTFUNC_API_KEY'));
    expect(failure.status).toBe(500);
    expect(failure.code).toBe('config.missing_env');
    expect(failure.message).toContain('INTFUNC_API_KEY');
  });

  it('연결 자체가 안 되면 재시도를 권한다', () => {
    const failure = describeSendFailure(
      Object.assign(new TypeError('fetch failed'), { cause: { code: 'ECONNREFUSED' } })
    );
    expect(failure.code).toBe('intfunc.unreachable');
    expect(failure.message).toContain('다시');
  });

  it('알 수 없는 오류는 원인 문구를 삼킨다 — 어디서 왔는지 모르는 문장이다', () => {
    const failure = describeSendFailure(new Error('students 조회 실패: 상담사 김민준'));
    expect(failure.status).toBe(500);
    expect(failure.code).toBe('unknown');
    expect(failure.message).not.toContain('김민준');
  });
});
