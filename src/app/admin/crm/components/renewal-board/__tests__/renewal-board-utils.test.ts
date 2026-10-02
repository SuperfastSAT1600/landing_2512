import type { RenewalStage, RenewalTarget, RenewalWeeklyStat, Student } from '@/types/crm';
import type { TutoringEntry } from '../../TutoringStudentRow';
import {
  buildTutoringByStudentId,
  buildWeekOptions,
  groupTargetsByStage,
} from '../renewal-board-utils';

function t(
  id: string,
  stage: RenewalStage,
  next_contact_date: string | null = null,
  stage_updated_at = '2026-08-10T00:00:00Z'
): RenewalTarget {
  return { id, stage, next_contact_date, stage_updated_at } as RenewalTarget;
}

describe('groupTargetsByStage', () => {
  it('다섯 단계 키를 항상 만든다', () => {
    const map = groupTargetsByStage([]);
    expect([...map.keys()]).toEqual(['1', '2', '3', '4', '5']);
  });

  it('진행 단계(1~3)는 컨택 예정일 임박순, 날짜 없는 카드는 아래로', () => {
    const map = groupTargetsByStage([
      t('none', '1', null),
      t('late', '1', '2026-09-20'),
      t('soon', '1', '2026-09-10'),
    ]);
    expect(map.get('1')?.map((x) => x.id)).toEqual(['soon', 'late', 'none']);
  });

  it('같은 날짜면 stage_updated_at 최신순', () => {
    const map = groupTargetsByStage([
      t('old', '2', '2026-09-10', '2026-08-01T00:00:00Z'),
      t('new', '2', '2026-09-10', '2026-08-09T00:00:00Z'),
    ]);
    expect(map.get('2')?.map((x) => x.id)).toEqual(['new', 'old']);
  });

  it('터미널 단계(4·5)는 입력(서버) 순서를 그대로 둔다', () => {
    const map = groupTargetsByStage([
      t('b', '4', '2026-09-20'),
      t('a', '4', '2026-09-01'),
      t('c', '5', null),
    ]);
    expect(map.get('4')?.map((x) => x.id)).toEqual(['b', 'a']);
    expect(map.get('5')?.map((x) => x.id)).toEqual(['c']);
  });
});

describe('buildTutoringByStudentId', () => {
  const entry = (id: string, hours: unknown) =>
    ({ student: { id } as Student, displayStatus: 'active', hours }) as unknown as TutoringEntry<Student>;

  it('0으로 깎지 않은 잔여(초과 사용 포함)를 그대로 담는다', () => {
    const map = buildTutoringByStudentId([
      entry('s1', { remaining: -3, scheduled: 2, overscheduled: 1 }),
    ]);
    expect(map.get('s1')).toEqual({
      displayStatus: 'active',
      remainingHours: -3,
      scheduledHours: 2,
      overscheduledHours: 1,
    });
  });

  it('SRM 시간 정보가 없으면 null 로 채운다', () => {
    const map = buildTutoringByStudentId([entry('s2', null)]);
    expect(map.get('s2')).toEqual({
      displayStatus: 'active',
      remainingHours: null,
      scheduledHours: null,
      overscheduledHours: null,
    });
  });
});

describe('buildWeekOptions', () => {
  const stat = (week_start: string) => ({ week_start }) as RenewalWeeklyStat;

  it('데이터가 있는 주차를 중복 없이 최신순으로 나열한다', () => {
    // 정의된 주차 범위 밖 시각(2000년)이라 이번 주차는 끼지 않는다.
    const out = buildWeekOptions(
      [stat('2026-08-03'), stat('2026-08-10'), stat('2026-08-03')],
      new Date('2000-01-01T00:00:00Z').getTime()
    );
    expect(out).toEqual(['2026-08-10', '2026-08-03']);
  });

  it('정의된 주차 안이면 이번 주차를 후보에 더한다', () => {
    const out = buildWeekOptions([], new Date('2026-08-12T03:00:00Z').getTime());
    expect(out).toEqual(['2026-08-10']);
  });
});
