// 로그인 실패 횟수 제한 — 서버 인스턴스 메모리 기준(서버리스에서는 인스턴스별로 세는 최선 노력 방식).
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 5;

const failures = new Map<string, number[]>();

function recent(key: string, now: number): number[] {
  const list = (failures.get(key) ?? []).filter(t => now - t < WINDOW_MS);
  if (list.length) failures.set(key, list);
  else failures.delete(key);
  return list;
}

export function isLoginBlocked(key: string, now = Date.now()): boolean {
  return recent(key, now).length >= MAX_FAILURES;
}

export function recordLoginFailure(key: string, now = Date.now()): void {
  failures.set(key, [...recent(key, now), now]);
}

export function clearLoginFailures(key: string): void {
  failures.delete(key);
}
