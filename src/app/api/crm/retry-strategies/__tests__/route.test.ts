import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockFrom = vi.fn();

vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: { from: (...args: unknown[]) => mockFrom(...args) },
}));

process.env.ADMIN_SECRET_KEY = 'admin-key';

/** select().order().eq().eq() 형태의 체인을 흉내내고, 마지막에 await 하면 result로 resolve된다. */
function chainable(result: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {};
  chain.select = vi.fn(() => chain);
  chain.order = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.insert = vi.fn(() => chain);
  chain.single = vi.fn(() => Promise.resolve(result));
  chain.then = (resolve: (v: unknown) => void) => resolve(result);
  return chain;
}

function makeGetReq(qs = '') {
  return new NextRequest(`http://localhost/api/crm/retry-strategies${qs}`, {
    headers: { 'x-admin-key': 'admin-key' },
  });
}

function makePostReq(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/crm/retry-strategies', {
    method: 'POST',
    headers: { 'x-admin-key': 'admin-key', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('GET /api/crm/retry-strategies', () => {
  beforeEach(() => vi.clearAllMocks());

  it('kind 파라미터는 더 이상 필터로 쓰이지 않는다 — 축은 카테고리 하나다', async () => {
    const chain = chainable({ data: [], error: null });
    mockFrom.mockReturnValueOnce(chain);

    const { GET } = await import('../route');
    const res = await GET(makeGetReq('?kind=retry&segment=b2c'));
    expect(res.status).toBe(200);
    expect(chain.eq).not.toHaveBeenCalledWith('kind', 'retry');
    expect(chain.eq).toHaveBeenCalledWith('segment', 'b2c');
  });

  it('filters by category_id', async () => {
    const chain = chainable({ data: [], error: null });
    mockFrom.mockReturnValueOnce(chain);

    const { GET } = await import('../route');
    const res = await GET(makeGetReq('?category_id=cat-1'));
    expect(res.status).toBe(200);
    expect(chain.eq).toHaveBeenCalledWith('category_id', 'cat-1');
  });
});

describe('POST /api/crm/retry-strategies', () => {
  beforeEach(() => vi.clearAllMocks());

  it('kind 없이도 만들 수 있다 — 더 이상 요구하지 않는다', async () => {
    const chain = chainable({ data: { id: 's1' }, error: null });
    mockFrom.mockReturnValueOnce(chain);

    const { POST } = await import('../route');
    const res = await POST(makePostReq({ name: '새 전략', category_id: 'cat-1' }));
    expect(res.status).toBe(201);
  });

  it('rejects missing category_id → 400 — 카테고리가 유일한 분류다', async () => {
    const { POST } = await import('../route');
    const res = await POST(makePostReq({ name: '새 전략' }));
    expect(res.status).toBe(400);
  });

  it('insert 에 kind 를 싣지 않는다', async () => {
    const chain = chainable({
      data: { id: 's1', name: '새 전략', category_id: 'cat-1' },
      error: null,
    });
    mockFrom.mockReturnValueOnce(chain);

    const { POST } = await import('../route');
    const res = await POST(makePostReq({ name: '새 전략', category_id: 'cat-1' }));
    expect(res.status).toBe(201);
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ name: '새 전략', category_id: 'cat-1' })
    );
    expect(chain.insert).not.toHaveBeenCalledWith(
      expect.objectContaining({ kind: expect.anything() })
    );
  });
});
