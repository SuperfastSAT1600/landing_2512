/**
 * 전송이 실패한 이유를 관리자가 읽을 문장으로 바꾼다 (REQ-208).
 *
 * 두 가지를 지킨다.
 *
 * 1. **서버 문구를 옮기지 않는다.** `ApiError.message`는 거절당한 값을 인용할 수 있고,
 *    그 값은 상담 원문이다. 대신 안정 식별자인 `code`와 우리가 쓴 문장을 내보낸다 —
 *    SDK 자신이 "prose는 다시 쓰일 수 있으니 code로 분기하라"고 말한다.
 * 2. **고칠 것을 말한다.** 401은 키, 404는 slug, 413은 묶음 크기다. "전송에 실패했습니다"
 *    한 줄로 뭉뚱그리면 관리자가 서버 로그를 열지 않고는 아무것도 못 한다.
 */
import { ApiError, AuthError, DatasetImportError, NotFoundError } from '@intfunc/sdk';
import { MissingEnvError } from './client';

export interface SendFailure {
  /** 라우트가 돌려줄 HTTP 상태. IF 쪽 실패는 우리 쪽 502다. */
  status: number;
  /** 화면에 그대로 뜨고 서버 로그와 대조되는 식별자. */
  code: string;
  message: string;
  /** 보내기 전에 거절된 행의 위치. 화면이 어느 행인지 짚을 수 있게. */
  rows?: number[];
}

/** 화면에 나열할 행 번호의 상한. 전부 깨진 경우까지 다 찍을 이유는 없다. */
const MAX_ROWS_SHOWN = 20;

function fromApiError(e: ApiError): SendFailure {
  if (e instanceof AuthError) {
    return {
      status: 502,
      code: 'intfunc.auth',
      message: 'IF가 API 키를 거부했습니다 (401). INTFUNC_API_KEY를 확인하세요.',
    };
  }
  if (e instanceof NotFoundError) {
    return {
      status: 502,
      code: 'intfunc.not_found',
      message:
        'IF에서 프로젝트나 데이터셋을 찾지 못했습니다 (404). ' +
        'API 키는 프로젝트 하나에 묶이므로 INTFUNC_PROJECT_SLUG와 INTFUNC_DATASET_SLUG를 확인하세요.',
    };
  }
  if (e.status === 413) {
    return {
      status: 502,
      code: 'intfunc.too_large',
      message: '보낸 묶음이 IF의 한도를 넘었습니다 (413). --limit으로 나눠 보내세요.',
    };
  }
  return {
    status: 502,
    code: e.code ?? `intfunc.http_${e.status}`,
    message: `IF가 요청을 거부했습니다 (${e.status}). 아래 code로 IF 콘솔 로그를 확인하세요.`,
  };
}

/** 네트워크가 끊겼는가 — 응답을 못 받은 실패는 재시도가 답이다. */
function isUnreachable(e: Error): boolean {
  const cause = (e as { cause?: { code?: string } }).cause;
  return (
    e.name === 'AbortError' ||
    e.name === 'TimeoutError' ||
    e.message.includes('fetch failed') ||
    ['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', 'EAI_AGAIN'].includes(cause?.code ?? '')
  );
}

export function describeSendFailure(e: unknown): SendFailure {
  if (e instanceof MissingEnvError) {
    return { status: 500, code: 'config.missing_env', message: e.message };
  }
  if (e instanceof DatasetImportError) {
    return {
      status: 400,
      code: 'dataset.rows_invalid',
      message: `보낼 행 ${e.failures.length}개가 형식에 맞지 않아 아무것도 보내지 않았습니다.`,
      rows: e.failures.slice(0, MAX_ROWS_SHOWN).map((failure) => failure.index),
    };
  }
  if (e instanceof ApiError) return fromApiError(e);
  if (e instanceof Error && isUnreachable(e)) {
    return {
      status: 504,
      code: 'intfunc.unreachable',
      message: 'IF에 연결하지 못했습니다. 잠시 후 다시 시도하세요.',
    };
  }
  // 어디서 온 문장인지 모르면 옮기지 않는다. 전문은 서버 로그에 남는다.
  return {
    status: 500,
    code: 'unknown',
    message: '전송에 실패했습니다. 서버 로그를 확인하세요.',
  };
}
