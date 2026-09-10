// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockFrom = vi.hoisted(() => vi.fn());
const mockFetchExecution = vi.hoisted(() => vi.fn());

vi.mock('@/lib/supabase-admin', () => ({ supabaseAdmin: { from: mockFrom } }));
vi.mock('../fetch-execution', () => ({ fetchWeeklyExecution: mockFetchExecution }));

process.env.ADMIN_SECRET_KEY = 'admin-key';

type Result = { data: unknown; error: null | { message: string } };

/** 체이닝 가능한 supabase 빌더 목. maybeSingle/single/await 모두 result를 돌려준다. */
function makeBuilder(result: Result) {
  const builder: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'or', 'in', 'limit', 'order', 'upsert', 'insert', 'update']) {
    builder[m] = vi.fn(() => builder);
  }
  builder.maybeSingle = vi.fn(() => Promise.resolve(result));
  builder.single = vi.fn(() => Promise.resolve(result));
  builder.then = (resolve: (v: Result) => unknown) => Promise.resolve(result).then(resolve);
  return builder;
}

function planRow(over: Record<string, unknown> = {}) {
  return {
    id: 'p-1',
    segment: 'b2c',
    week_start: '2026-08-17',
    targets: [{ key: 'paid', label: '결제', target_value: 3 }],
    actions: [{ id: 'a1', text: '리포트 상담', done: false, done_at: null }],
    focus_strategies: [],
    retrospective: { went_well: '', went_wrong: '', next_actions: [], updated_at: null },
    execution_notes: [],
    created_at: '2026-08-17T00:00:00Z',
    updated_at: '2026-08-17T00:00:00Z',
    ...over,
  };
}

function getReq(qs: string, key = 'admin-key') {
  return new NextRequest(`http://localhost/api/crm/weekly-plan${qs}`, { headers: { 'x-admin-key': key } });
}

function putReq(body: unknown, key = 'admin-key') {
  return new NextRequest('http://localhost/api/crm/weekly-plan', {
    method: 'PUT',
    headers: { 'x-admin-key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockFetchExecution.mockResolvedValue([]);
  // stats 자기호출(actuals)은 네트워크 없이 실패 → {} 로 degrade
  vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('no network'))));
});

describe('GET /api/crm/weekly-plan', () => {
  it('잘못된 admin key → 401', async () => {
    const { GET } = await import('../route');
    expect((await GET(getReq('?segment=b2c&week_start=2026-08-17', 'nope'))).status).toBe(401);
  });

  it('segment 누락·오타 → 400', async () => {
    const { GET } = await import('../route');
    expect((await GET(getReq('?week_start=2026-08-17'))).status).toBe(400);
    expect((await GET(getReq('?segment=b2x&week_start=2026-08-17'))).status).toBe(400);
  });

  it('week_start 형식 오류·주차 정의 밖 → 400', async () => {
    const { GET } = await import('../route');
    expect((await GET(getReq('?segment=b2c&week_start=2026-8-17'))).status).toBe(400);
    expect((await GET(getReq('?segment=b2c&week_start=2026-08-18'))).status).toBe(400);
  });

  it('plan·execution·prev를 담아 200으로 응답한다', async () => {
    const execution = [
      {
        strategy_id: 's-1',
        strategy_name: '진단리포트 당일등록 할인',
        type: 'initial_sales',
        planned: true,
        applied_count: 2,
        contacted_count: 2,
        paid_count: 1,
        revenue: 4_100_000,
        leads: [],
      },
    ];
    mockFetchExecution.mockResolvedValue(execution);
    mockFrom
      .mockReturnValueOnce(makeBuilder({ data: planRow(), error: null })) // 이번 주 계획
      .mockReturnValueOnce(
        makeBuilder({
          data: { retrospective: { went_well: '당일등록 할인 반응 좋음', went_wrong: '', next_actions: [] } },
          error: null,
        }),
      ); // 지난주 회고

    const { GET } = await import('../route');
    const res = await GET(getReq('?segment=b2c&week_start=2026-08-17'));
    expect(res.status).toBe(200);
    const { data } = await res.json();

    expect(data.week).toEqual({ start: '2026-08-17', end: '2026-08-23', label: '26년 08월 03주차' });
    expect(data.plan.targets).toHaveLength(1);
    expect(data.execution).toEqual(execution);
    expect(data.prev).toEqual({ week_start: '2026-08-10', week_label: '26년 08월 02주차', retro_filled: true });
    expect(data.actuals).toEqual({}); // stats 호출 실패는 조용히 degrade
  });

  it('계획이 없는 주차는 plan=null, execution은 계획 없이 집계한다', async () => {
    mockFrom
      .mockReturnValueOnce(makeBuilder({ data: null, error: null }))
      .mockReturnValueOnce(makeBuilder({ data: null, error: null }));

    const { GET } = await import('../route');
    const { data } = await (await GET(getReq('?segment=b2c&week_start=2026-08-17'))).json();
    expect(data.plan).toBeNull();
    expect(data.prev.retro_filled).toBe(false);
    expect(mockFetchExecution).toHaveBeenCalledWith('b2c', { start: '2026-08-17', end: '2026-08-23' }, []);
  });

  it('마이그레이션 112 이전 행(새 컬럼 없음)도 기본값으로 채워 돌려준다', async () => {
    mockFrom
      .mockReturnValueOnce(
        makeBuilder({
          data: {
            id: 'p-old',
            segment: 'b2c',
            week_start: '2026-08-17',
            targets: [],
            actions: [],
            created_at: 'x',
            updated_at: 'y',
          },
          error: null,
        }),
      )
      .mockReturnValueOnce(makeBuilder({ data: null, error: null }));

    const { GET } = await import('../route');
    const { data } = await (await GET(getReq('?segment=b2c&week_start=2026-08-17'))).json();
    expect(data.plan.focus_strategies).toEqual([]);
    expect(data.plan.retrospective).toEqual({ went_well: '', went_wrong: '', next_actions: [], updated_at: null });
  });
});

describe('PUT /api/crm/weekly-plan', () => {
  it('회고만 보내면 targets·actions는 업서트 페이로드에 없다 (부분 업데이트)', async () => {
    const builder = makeBuilder({ data: planRow(), error: null });
    mockFrom.mockReturnValue(builder);

    const { PUT } = await import('../route');
    const res = await PUT(
      putReq({
        segment: 'b2c',
        week_start: '2026-08-17',
        retrospective: { went_well: '당일등록 할인 반응 좋음', went_wrong: '인스타 재신청 무응답', next_actions: [] },
      }),
    );
    expect(res.status).toBe(200);

    const payload = (builder.upsert as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(Object.keys(payload).sort()).toEqual(['retrospective', 'segment', 'updated_at', 'week_start']);
    expect(payload.retrospective.went_well).toBe('당일등록 할인 반응 좋음');
  });

  it('집중 전략은 유효 항목만 저장한다', async () => {
    const builder = makeBuilder({ data: planRow(), error: null });
    mockFrom.mockReturnValue(builder);

    const { PUT } = await import('../route');
    await PUT(
      putReq({
        segment: 'b2c',
        week_start: '2026-08-17',
        focus_strategies: [
          { strategy_id: 's-1', strategy_name: '할인', type: 'initial_sales', goal: '결제 3건' },
          { strategy_id: 's-2', type: 'bogus' },
        ],
      }),
    );
    const payload = (builder.upsert as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(payload.focus_strategies).toHaveLength(1);
    expect(payload.focus_strategies[0].goal).toBe('결제 3건');
  });

  it('저장할 필드가 없으면 400', async () => {
    const { PUT } = await import('../route');
    const res = await PUT(putReq({ segment: 'b2c', week_start: '2026-08-17' }));
    expect(res.status).toBe(400);
  });

  it('week_start가 주차 정의 밖이면 400', async () => {
    const { PUT } = await import('../route');
    const res = await PUT(putReq({ segment: 'b2c', week_start: '2026-08-18', actions: [] }));
    expect(res.status).toBe(400);
  });

  it('DB 오류 → 500', async () => {
    mockFrom.mockReturnValue(makeBuilder({ data: null, error: { message: 'boom' } }));
    const { PUT } = await import('../route');
    const res = await PUT(putReq({ segment: 'b2c', week_start: '2026-08-17', actions: [] }));
    expect(res.status).toBe(500);
  });
});
