// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockFrom = vi.hoisted(() => vi.fn());
vi.mock('@/lib/supabase-admin', () => ({ supabaseAdmin: { from: mockFrom } }));

process.env.ADMIN_SECRET_KEY = 'admin-key';

type Result = { data: unknown; error: null | { message: string } };

function makeBuilder(result: Result) {
  const builder: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'order', 'upsert']) builder[m] = vi.fn(() => builder);
  builder.single = vi.fn(() => Promise.resolve(result));
  builder.then = (resolve: (v: Result) => unknown) => Promise.resolve(result).then(resolve);
  return builder;
}

function row(over: Record<string, unknown> = {}) {
  return {
    id: 't-1',
    month: '2026-08-01',
    segment: 'tutoring',
    target_amount: 150000000,
    currency: 'KRW',
    created_at: 'x',
    updated_at: 'x',
    ...over,
  };
}

function getReq(qs: string, key = 'admin-key') {
  return new NextRequest(`http://localhost/api/business/monthly-targets${qs}`, { headers: { 'x-admin-key': key } });
}
function putReq(body: unknown, key = 'admin-key') {
  return new NextRequest('http://localhost/api/business/monthly-targets', {
    method: 'PUT',
    headers: { 'x-admin-key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => vi.clearAllMocks());

describe('GET /api/business/monthly-targets', () => {
  it('잘못된 admin key → 401', async () => {
    const { GET } = await import('../route');
    expect((await GET(getReq('?segment=tutoring', 'nope'))).status).toBe(401);
  });

  it('segment 누락·오타 → 400', async () => {
    const { GET } = await import('../route');
    expect((await GET(getReq(''))).status).toBe(400);
    expect((await GET(getReq('?segment=bogus'))).status).toBe(400);
  });

  it('월 오름차순으로 목록을 반환한다', async () => {
    const builder = makeBuilder({ data: [row()], error: null });
    mockFrom.mockReturnValue(builder);

    const { GET } = await import('../route');
    const res = await GET(getReq('?segment=tutoring'));
    expect(res.status).toBe(200);
    const { data } = await res.json();
    expect(data).toHaveLength(1);
    expect(builder.eq).toHaveBeenCalledWith('segment', 'tutoring');
    expect(builder.order).toHaveBeenCalledWith('month', { ascending: true });
  });

  it('DB 오류 → 500', async () => {
    mockFrom.mockReturnValue(makeBuilder({ data: null, error: { message: 'boom' } }));
    const { GET } = await import('../route');
    expect((await GET(getReq('?segment=tutoring'))).status).toBe(500);
  });
});

describe('PUT /api/business/monthly-targets', () => {
  it('잘못된 admin key → 401', async () => {
    const { PUT } = await import('../route');
    expect((await PUT(putReq({}, 'nope'))).status).toBe(401);
  });

  it('segment가 tutoring|global이 아니면 → 400', async () => {
    const { PUT } = await import('../route');
    const res = await PUT(putReq({ segment: 'bogus', month: '2026-08', target_amount: 100 }));
    expect(res.status).toBe(400);
  });

  it('month 형식이 잘못되면 → 400', async () => {
    const { PUT } = await import('../route');
    const res = await PUT(putReq({ segment: 'tutoring', month: '2026/08', target_amount: 100 }));
    expect(res.status).toBe(400);
  });

  it('target_amount가 0 이하면 → 400', async () => {
    const { PUT } = await import('../route');
    const res = await PUT(putReq({ segment: 'tutoring', month: '2026-08', target_amount: 0 }));
    expect(res.status).toBe(400);
  });

  it('tutoring·global 모두 KRW로 통화를 지정하고 month를 YYYY-MM-01로 정규화한다', async () => {
    const builder = makeBuilder({ data: row(), error: null });
    mockFrom.mockReturnValue(builder);

    const { PUT } = await import('../route');
    await PUT(putReq({ segment: 'tutoring', month: '2026-08', target_amount: 150000000 }));
    expect(builder.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ month: '2026-08-01', segment: 'tutoring', target_amount: 150000000, currency: 'KRW' }),
      { onConflict: 'month,segment' },
    );

    await PUT(putReq({ segment: 'global', month: '2026-09', target_amount: 10000000 }));
    expect(builder.upsert).toHaveBeenLastCalledWith(
      expect.objectContaining({ month: '2026-09-01', segment: 'global', target_amount: 10000000, currency: 'KRW' }),
      { onConflict: 'month,segment' },
    );
  });

  it('DB 오류 → 500', async () => {
    mockFrom.mockReturnValue(makeBuilder({ data: null, error: { message: 'boom' } }));
    const { PUT } = await import('../route');
    const res = await PUT(putReq({ segment: 'tutoring', month: '2026-08', target_amount: 100 }));
    expect(res.status).toBe(500);
  });
});
