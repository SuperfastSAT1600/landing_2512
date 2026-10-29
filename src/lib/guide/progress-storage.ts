import { MISSIONS, type MissionId } from './sfv2-steps';

export const STORAGE_KEY = 'sfv2-tutorial-completed';

const VALID_IDS = new Set<string>(MISSIONS.map((m) => m.id));

const CHANGE_EVENT = 'sfv2-tutorial-progress';

export function parseCompleted(raw: string): MissionId[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is MissionId => typeof id === 'string' && VALID_IDS.has(id));
  } catch {
    return [];
  }
}

// useSyncExternalStore 용: 원문 문자열을 스냅샷으로 써서 참조 안정성을 확보한다.
export function getProgressSnapshot(): string {
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? '[]';
  } catch {
    return '[]';
  }
}

export function subscribeProgress(onChange: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener('storage', onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener('storage', onChange);
  };
}

export function loadCompleted(): MissionId[] {
  return parseCompleted(getProgressSnapshot());
}

export function markCompleted(id: MissionId): void {
  try {
    const next = Array.from(new Set([...loadCompleted(), id]));
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {
    // 저장 불가 환경(시크릿 모드 등)에서는 진행도만 저장되지 않는다.
  }
}
