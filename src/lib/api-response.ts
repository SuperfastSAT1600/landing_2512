// API 에러 응답 헬퍼 — 표준 형식 { error: { code, message } }.
// 클라이언트는 @/lib/api-error 의 apiErrorMessage/apiErrorCode로 읽는다.
import { NextResponse } from 'next/server';

const STATUS_CODES: Record<number, string> = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  413: 'PAYLOAD_TOO_LARGE',
  402: 'QUOTA_EXHAUSTED',
  422: 'UNPROCESSABLE',
  429: 'RATE_LIMITED',
  500: 'INTERNAL_ERROR',
  502: 'UPSTREAM_ERROR',
  503: 'SERVICE_UNAVAILABLE',
  504: 'TIMEOUT',
};

/** 분기할 필요가 없는 에러에 쓰는 상태별 기본 코드. */
export function codeForStatus(status: number): string {
  return STATUS_CODES[status] ?? 'ERROR';
}

/** 표준 에러 응답. extra는 본문 최상위에 함께 싣는다(예: 부분 성공 시 data). */
export function apiError(
  code: string,
  message: string,
  status: number,
  extra?: Record<string, unknown>
): NextResponse {
  return NextResponse.json({ error: { code, message }, ...extra }, { status });
}

/** 관리자 키 인증 실패(401). */
export function unauthorized(): NextResponse {
  return apiError('UNAUTHORIZED', '인증이 필요합니다.', 401);
}
