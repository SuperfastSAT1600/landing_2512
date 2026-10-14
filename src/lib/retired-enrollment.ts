// 판매를 끝낸 수업권 페이지(V1·V2) → 현재 판매 페이지(V3). 옛 링크(광고·카톡)도 V3로 이어지게 한다.
const RETIRED: Record<string, string> = {
  '/enrollment': '/enrollment-v3',
  '/enrollment2026': '/enrollment-v3',
  '/enrollment2026/en': '/enrollment-v3/en',
  '/enrollment-v2': '/enrollment-v3',
};

/** 종료된 수업권 경로면 보낼 V3 경로, 아니면 null. 끝 슬래시는 무시한다. */
export function retiredEnrollmentTarget(pathname: string): string | null {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  return RETIRED[path] ?? null;
}
