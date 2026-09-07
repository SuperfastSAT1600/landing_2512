// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFrom = vi.hoisted(() => vi.fn());
vi.mock('@/lib/supabase-admin', () => ({ supabaseAdmin: { from: mockFrom } }));

type Result = { data: unknown; error: null | { message: string } };

function makeBuilder(result: Result) {
  const builder: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'gte', 'gt', 'lte', 'lt', 'in', 'order']) {
    builder[m] = vi.fn(() => builder);
  }
  builder.then = (resolve: (v: Result) => unknown) => Promise.resolve(result).then(resolve);
  return builder;
}

function stubTables(goals: unknown[], students: unknown[]) {
  const builders: Record<string, Record<string, unknown>> = {
    marketing_weekly_goals: makeBuilder({ data: goals, error: null }),
    students: makeBuilder({ data: students, error: null }),
  };
  mockFrom.mockImplementation((table: string) => builders[table]);
  return builders;
}

beforeEach(() => vi.clearAllMocks());

// REQ-004: 주차별 총합 목표 + 소스별 실적 집계
describe('fetchWeeklyGoalRows', () => {
  it('총합 목표와 소스별 실적을 주차별로 묶는다', async () => {
    stubTables(
      [{ week_start: '2026-08-31', target_count: 20 }],
      [
        { traffic_source: '인스타그램 광고', inquiry_date: '2026-08-31' },
        { traffic_source: '인스타그램 오가닉', inquiry_date: '2026-09-02T10:00:00+09:00' },
        { traffic_source: '레딧', inquiry_date: '2026-09-06' },
      ]
    );
    const { fetchWeeklyGoalRows } = await import('../marketing-goals');
    const [row] = await fetchWeeklyGoalRows(['2026-08-31']);

    expect(row.week_start).toBe('2026-08-31');
    expect(row.week_end).toBe('2026-09-06');
    expect(row.week_label).toBe('26년 09월 01주차');
    expect(row.target).toBe(20);
    expect(row.actuals['META']).toBe(2);
    expect(row.actuals['구글 SEO']).toBe(1);
    expect(row.actual_total).toBe(3);
    expect(row.achievement_rate).toBe(15); // 3/20
  });

  it('목표 행이 없으면 target 이 null 이다 (0 이 아니다)', async () => {
    stubTables([], [{ traffic_source: '레딧', inquiry_date: '2026-08-31' }]);
    const { fetchWeeklyGoalRows } = await import('../marketing-goals');
    const [row] = await fetchWeeklyGoalRows(['2026-08-31']);

    expect(row.target).toBeNull();
    expect(row.achievement_rate).toBeNull();
    expect(row.actual_total).toBe(1);
  });

  it('target 0 은 미설정과 구분되고 달성률은 계산하지 않는다', async () => {
    stubTables(
      [{ week_start: '2026-08-31', target_count: 0 }],
      [{ traffic_source: '레딧', inquiry_date: '2026-08-31' }]
    );
    const { fetchWeeklyGoalRows } = await import('../marketing-goals');
    const [row] = await fetchWeeklyGoalRows(['2026-08-31']);

    expect(row.target).toBe(0);
    expect(row.achievement_rate).toBeNull(); // 0 나눗셈 방지
  });

  it('소개·미분류 실적도 총계에 포함한다', async () => {
    stubTables([{ week_start: '2026-08-31', target_count: 10 }], [
      { traffic_source: '소개', inquiry_date: '2026-08-31' },
      { traffic_source: '알 수 없는 소스', inquiry_date: '2026-08-31' },
    ]);
    const { fetchWeeklyGoalRows } = await import('../marketing-goals');
    const [row] = await fetchWeeklyGoalRows(['2026-08-31']);

    expect(row.actuals['소개']).toBe(1);
    expect(row.actuals['미분류']).toBe(1);
    expect(row.actual_total).toBe(2);
  });

  it('다른 주차의 목표·실적이 섞이지 않는다', async () => {
    stubTables(
      [
        { week_start: '2026-08-24', target_count: 10 },
        { week_start: '2026-08-31', target_count: 20 },
      ],
      [
        { traffic_source: '인스타그램 광고', inquiry_date: '2026-08-24' },
        { traffic_source: '인스타그램 광고', inquiry_date: '2026-08-31' },
        { traffic_source: '인스타그램 광고', inquiry_date: '2026-09-01' },
      ]
    );
    const { fetchWeeklyGoalRows } = await import('../marketing-goals');
    const rows = await fetchWeeklyGoalRows(['2026-08-24', '2026-08-31']);

    expect(rows.map((r) => r.target)).toEqual([10, 20]);
    expect(rows.map((r) => r.actual_total)).toEqual([1, 2]);
  });

  it('요청한 주차 범위 밖의 실적은 버린다', async () => {
    stubTables([], [{ traffic_source: '레딧', inquiry_date: '2026-07-06' }]);
    const { fetchWeeklyGoalRows } = await import('../marketing-goals');
    const [row] = await fetchWeeklyGoalRows(['2026-08-31']);
    expect(row.actual_total).toBe(0);
  });

  it('쿼리는 목표 1회 + students 1회만 쓴다', async () => {
    stubTables([], []);
    const { fetchWeeklyGoalRows } = await import('../marketing-goals');
    await fetchWeeklyGoalRows(['2026-08-24', '2026-08-31']);
    expect(mockFrom.mock.calls.map((c) => c[0])).toEqual(['marketing_weekly_goals', 'students']);
  });

  it('주차 목록이 비면 쿼리하지 않는다', async () => {
    stubTables([], []);
    const { fetchWeeklyGoalRows } = await import('../marketing-goals');
    expect(await fetchWeeklyGoalRows([])).toEqual([]);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('목표 조회 실패는 예외로 올린다', async () => {
    mockFrom.mockImplementation((table: string) =>
      table === 'marketing_weekly_goals'
        ? makeBuilder({ data: null, error: { message: 'boom' } })
        : makeBuilder({ data: [], error: null })
    );
    const { fetchWeeklyGoalRows } = await import('../marketing-goals');
    await expect(fetchWeeklyGoalRows(['2026-08-31'])).rejects.toThrow(/boom/);
  });
});

describe('fetchWeekTarget', () => {
  it('단일 주차의 총합 목표를 낸다', async () => {
    stubTables([{ week_start: '2026-08-31', target_count: 20 }], []);
    const { fetchWeekTarget } = await import('../marketing-goals');
    expect(await fetchWeekTarget('2026-08-31')).toBe(20);
  });

  it('목표가 없으면 null', async () => {
    stubTables([], []);
    const { fetchWeekTarget } = await import('../marketing-goals');
    expect(await fetchWeekTarget('2026-08-31')).toBeNull();
  });
});
