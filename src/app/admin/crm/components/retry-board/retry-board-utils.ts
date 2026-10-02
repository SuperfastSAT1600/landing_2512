import { RETRY_STAGES, type RetryStage, type RetryStrategy, type Student } from '@/types/crm';

export interface RetryCategory {
  id: string;
  name: string;
  sort_order: number;
}

export interface RetryStrategyGroup {
  id: string;
  name: string;
  items: RetryStrategy[];
}

export function getDaysAssigned(retryAssignedAt: string | null): number | null {
  if (!retryAssignedAt) return null;
  return Math.floor((Date.now() - new Date(retryAssignedAt).getTime()) / 86400000);
}

// 스테이지별 그룹핑을 렌더당 1회만 계산 (기존: 컬럼마다 전체 filter).
export function groupStudentsByStage(students: Student[]): Map<RetryStage, Student[]> {
  const map = new Map<RetryStage, Student[]>();
  for (const stage of RETRY_STAGES) map.set(stage, []);
  for (const s of students) map.get(s.retry_stage as RetryStage)?.push(s);
  return map;
}

// 전략 목록을 라이브러리 카테고리 순서대로 묶는다. 카테고리를 찾을 수 없는 전략도
// 목록에서 빠지지 않도록 마지막 '분류 없음' 묶음에 남긴다.
export function groupStrategiesByCategory(
  categories: RetryCategory[],
  strategies: RetryStrategy[]
): RetryStrategyGroup[] {
  const ordered = [...categories].sort((a, b) => a.sort_order - b.sort_order);
  const groups = ordered.map((c) => ({
    id: c.id,
    name: c.name,
    items: strategies.filter((s) => s.category_id === c.id),
  }));
  const known = new Set(ordered.map((c) => c.id));
  const rest = strategies.filter((s) => !known.has(s.category_id));
  if (rest.length) groups.push({ id: '__none__', name: '분류 없음', items: rest });
  return groups.filter((g) => g.items.length > 0);
}
