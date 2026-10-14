// 판매를 끝낸 수업권 페이지(V1·V2). 가격 정책이 크게 바뀌어 옛 링크(광고·카톡)로 들어온 고객은 블로그로 보낸다.
const RETIRED_PATHS = new Set(['/enrollment', '/enrollment2026', '/enrollment2026/en', '/enrollment-v2']);

export const RETIRED_ENROLLMENT_TARGET = '/blog';

/** 종료된 수업권 경로면 보낼 경로(/blog), 아니면 null. 끝 슬래시는 무시한다. */
export function retiredEnrollmentTarget(pathname: string): string | null {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  return RETIRED_PATHS.has(path) ? RETIRED_ENROLLMENT_TARGET : null;
}
