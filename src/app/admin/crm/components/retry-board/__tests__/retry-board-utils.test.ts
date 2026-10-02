import type { RetryStrategy, Student } from '@/types/crm';
import {
  getDaysAssigned,
  groupStrategiesByCategory,
  groupStudentsByStage,
} from '../retry-board-utils';

const strat = (id: string, category_id: string) =>
  ({ id, name: id, category_id }) as unknown as RetryStrategy;
const stu = (id: string, retry_stage: string | null) =>
  ({ id, retry_stage }) as unknown as Student;

describe('groupStudentsByStage', () => {
  it('모든 단계 키를 빈 배열로 만들고 학생을 단계별로 담는다', () => {
    const map = groupStudentsByStage([stu('a', '상담 중'), stu('b', '연락 시도'), stu('c', '상담 중')]);
    expect([...map.keys()]).toEqual(['연락 시도', '상담 중', '제안 완료']);
    expect(map.get('상담 중')?.map((s) => s.id)).toEqual(['a', 'c']);
    expect(map.get('제안 완료')).toEqual([]);
  });

  it('알 수 없는 단계나 null 단계 학생은 어느 컬럼에도 들어가지 않는다', () => {
    const map = groupStudentsByStage([stu('x', null), stu('y', '없는단계')]);
    expect([...map.values()].flat()).toEqual([]);
  });
});

describe('groupStrategiesByCategory', () => {
  const cats = [
    { id: 'c2', name: '둘째', sort_order: 2 },
    { id: 'c1', name: '첫째', sort_order: 1 },
  ];

  it('카테고리를 sort_order 순으로 정렬하고 빈 묶음은 뺀다', () => {
    const groups = groupStrategiesByCategory(cats, [strat('s1', 'c2'), strat('s2', 'c2')]);
    expect(groups.map((g) => g.id)).toEqual(['c2']);
    expect(groups[0].items.map((s) => s.id)).toEqual(['s1', 's2']);
  });

  it('카테고리를 찾을 수 없는 전략은 마지막 분류 없음 묶음에 둔다', () => {
    const groups = groupStrategiesByCategory(cats, [strat('s1', 'c1'), strat('s2', 'gone')]);
    expect(groups.map((g) => [g.id, g.name])).toEqual([
      ['c1', '첫째'],
      ['__none__', '분류 없음'],
    ]);
  });

  it('입력 카테고리 배열을 변형하지 않는다', () => {
    groupStrategiesByCategory(cats, []);
    expect(cats.map((c) => c.id)).toEqual(['c2', 'c1']);
  });
});

describe('getDaysAssigned', () => {
  afterEach(() => vi.useRealTimers());

  it('배정일이 없으면 null', () => {
    expect(getDaysAssigned(null)).toBeNull();
  });

  it('경과 일수를 내림으로 계산한다', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-02T12:00:00Z'));
    expect(getDaysAssigned('2026-10-02T01:00:00Z')).toBe(0);
    expect(getDaysAssigned('2026-09-30T13:00:00Z')).toBe(1);
    expect(getDaysAssigned('2026-09-25T12:00:00Z')).toBe(7);
  });
});
