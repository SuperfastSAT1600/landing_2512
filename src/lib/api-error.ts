// API 에러 응답 본문 읽기.
// 서버 에러 형식이 문자열(`{ error: '...' }`)에서 표준(`{ error: { code, message } }`)으로
// 옮겨가는 중이라, 클라이언트는 두 형식을 모두 이 함수로 읽는다.

type ErrorBody = { error?: unknown; code?: unknown } | null | undefined;

function asBody(body: unknown): ErrorBody {
  return typeof body === 'object' && body !== null ? (body as ErrorBody) : null;
}

/** 사용자에게 보여줄 에러 메시지. 읽을 수 없으면 fallback. */
export function apiErrorMessage(body: unknown, fallback: string): string {
  const err = asBody(body)?.error;
  if (typeof err === 'string') return err || fallback;
  const message = typeof err === 'object' && err !== null ? (err as { message?: unknown }).message : undefined;
  return typeof message === 'string' && message ? message : fallback;
}

/** 분기용 에러 코드(`error.code`, 구 형식은 최상위 `code`). 없으면 null. */
export function apiErrorCode(body: unknown): string | null {
  const b = asBody(body);
  const nested = typeof b?.error === 'object' && b.error !== null ? (b.error as { code?: unknown }).code : undefined;
  const code = nested ?? b?.code;
  return typeof code === 'string' ? code : null;
}
