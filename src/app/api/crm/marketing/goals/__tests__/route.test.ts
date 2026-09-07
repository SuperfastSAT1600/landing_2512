// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockFrom = vi.hoisted(() => vi.fn());
vi.mock('@/lib/supabase-admin', () => ({ supabaseAdmin: { from: mockFrom } }));

process.env.ADMIN_SECRET_KEY = 'admin-key';

type Result = { data: unknown; error: null | { message: string } };

function makeBuilder(result: Result) {
  const builder: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'gte', 'lte', 'order', 'upsert', 'delete']) {
    builder[m] = vi.fn(() => builder);
  }
  builder.single = vi.fn(() => Promise.resolve(result));
  builder.then = (resolve: (v: Result) => unknown) => Promise.resolve(result).then(resolve);
  return builder;
}

const BASE = 'http://localhost/api/crm/marketing/goals';
const req = (qs = '', key = 'admin-key') =>
  new NextRequest(`${BASE}${qs}`, { headers: { 'x-admin-key': key } });
const putReq = (body: unknown, key = 'admin-key') =>
  new NextRequest(BASE, {
    method: 'PUT',
    headers: { 'x-admin-key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

const goalRow = (over: Record<string, unknown> = {}) => ({
  id: 'g1',
  week_start: '2026-08-31',
  target_count: 20,
  created_at: '2026-08-31T00:00:00Z',
  updated_at: '2026-08-31T00:00:00Z',
  ...over,
});

beforeEach(() => vi.clearAllMocks());

// REQ-003: 주차 총합 목표 CRUD (소스별 목표 없음)
describe('GET /api/crm/marketing/goals', () => {
  it('관리자 키가 없으면 401', async () => {
    const { GET } = await import('../route');
    expect((await GET(req('?week_start=2026-08-31', 'wrong'))).status).toBe(401);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('week_start 로 단일 주차를 조회한다', async () => {
    const builder = makeBuilder({ data: [goalRow()], error: null });
    mockFrom.mockReturnValue(builder);
    const { GET } = await import('../route');
    const res = await GET(req('?week_start=2026-08-31'));

    expect(res.status).toBe(200);
    expect(builder.eq).toHaveBeenCalledWith('week_start', '2026-08-31');
    expect((await res.json()).data).toHaveLength(1);
  });

  it('from/to 로 범위를 조회한다', async () => {
    const builder = makeBuilder({ data: [], error: null });
    mockFrom.mockReturnValue(builder);
    const { GET } = await import('../route');
    await GET(req('?from=2026-06-08&to=2026-08-31'));

    expect(builder.gte).toHaveBeenCalledWith('week_start', '2026-06-08');
    expect(builder.lte).toHaveBeenCalledWith('week_start', '2026-08-31');
  });

  it('week_start 도 from/to 도 없으면 400', async () => {
    const { GET } = await import('../route');
    expect((await GET(req())).status).toBe(400);
  });

  it('week_start 가 월요일이 아니면 400', async () => {
    const { GET } = await import('../route');
    expect((await GET(req('?week_start=2026-09-03'))).status).toBe(400);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('DB 오류는 500', async () => {
    mockFrom.mockReturnValue(makeBuilder({ data: null, error: { message: 'boom' } }));
    const { GET } = await import('../route');
    expect((await GET(req('?week_start=2026-08-31'))).status).toBe(500);
  });
});

describe('PUT /api/crm/marketing/goals', () => {
  it('관리자 키가 없으면 401', async () => {
    const { PUT } = await import('../route');
    expect((await PUT(putReq({ week_start: '2026-08-31', target_count: 20 }, 'wrong'))).status).toBe(401);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('주차 총합 목표를 업서트한다 (channel_group 없음)', async () => {
    const builder = makeBuilder({ data: goalRow(), error: null });
    mockFrom.mockReturnValue(builder);
    const { PUT } = await import('../route');
    const res = await PUT(putReq({ week_start: '2026-08-31', target_count: 20 }));

    expect(res.status).toBe(200);
    const [payload, options] = (builder.upsert as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(payload).toMatchObject({ week_start: '2026-08-31', target_count: 20 });
    expect(payload).not.toHaveProperty('channel_group');
    expect(payload.updated_at).toBeTruthy();
    expect(options).toEqual({ onConflict: 'week_start' });
  });

  it('target_count 0 을 허용한다 (의도한 0개 목표)', async () => {
    mockFrom.mockReturnValue(makeBuilder({ data: goalRow({ target_count: 0 }), error: null }));
    const { PUT } = await import('../route');
    expect((await PUT(putReq({ week_start: '2026-08-31', target_count: 0 }))).status).toBe(200);
  });

  it('week_start 가 월요일이 아니면 400', async () => {
    const { PUT } = await import('../route');
    expect((await PUT(putReq({ week_start: '2026-09-03', target_count: 20 }))).status).toBe(400);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('음수·소수·비숫자 target_count 는 400', async () => {
    const { PUT } = await import('../route');
    for (const target_count of [-1, 1.5, '3', null]) {
      expect((await PUT(putReq({ week_start: '2026-08-31', target_count }))).status).toBe(400);
    }
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('JSON 이 깨지면 400', async () => {
    const { PUT } = await import('../route');
    const broken = new NextRequest(BASE, {
      method: 'PUT',
      headers: { 'x-admin-key': 'admin-key', 'Content-Type': 'application/json' },
      body: '{',
    });
    expect((await PUT(broken)).status).toBe(400);
  });

  it('DB 오류는 500', async () => {
    mockFrom.mockReturnValue(makeBuilder({ data: null, error: { message: 'boom' } }));
    const { PUT } = await import('../route');
    expect((await PUT(putReq({ week_start: '2026-08-31', target_count: 20 }))).status).toBe(500);
  });
});

describe('DELETE /api/crm/marketing/goals', () => {
  it('관리자 키가 없으면 401', async () => {
    const { DELETE } = await import('../route');
    expect((await DELETE(req('?week_start=2026-08-31', 'wrong'))).status).toBe(401);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('해당 주차 목표를 삭제해 미설정으로 되돌린다', async () => {
    const builder = makeBuilder({ data: null, error: null });
    mockFrom.mockReturnValue(builder);
    const { DELETE } = await import('../route');
    const res = await DELETE(req('?week_start=2026-08-31'));

    expect(res.status).toBe(200);
    expect(builder.delete).toHaveBeenCalled();
    expect(builder.eq).toHaveBeenCalledWith('week_start', '2026-08-31');
  });

  it('week_start 가 없거나 월요일이 아니면 400', async () => {
    const { DELETE } = await import('../route');
    expect((await DELETE(req())).status).toBe(400);
    expect((await DELETE(req('?week_start=2026-09-03'))).status).toBe(400);
  });

  it('DB 오류는 500', async () => {
    mockFrom.mockReturnValue(makeBuilder({ data: null, error: { message: 'boom' } }));
    const { DELETE } = await import('../route');
    expect((await DELETE(req('?week_start=2026-08-31'))).status).toBe(500);
  });
});
