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

  it('filters by kind (not the legacy type param)', async () => {
    const chain = chainable({ data: [], error: null });
    mockFrom.mockReturnValueOnce(chain);

    const { GET } = await import('../route');
    const res = await GET(makeGetReq('?kind=retry&segment=b2c'));
    expect(res.status).toBe(200);
    expect(chain.eq).toHaveBeenCalledWith('kind', 'retry');
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

  it('rejects missing kind → 400', async () => {
    const { POST } = await import('../route');
    const res = await POST(makePostReq({ name: '새 전략', category_id: 'cat-1' }));
    expect(res.status).toBe(400);
  });

  it('rejects missing category_id → 400', async () => {
    const { POST } = await import('../route');
    const res = await POST(makePostReq({ name: '새 전략', kind: 'retry' }));
    expect(res.status).toBe(400);
  });

  it('creates a strategy with kind + category_id → 201', async () => {
    const chain = chainable({
      data: { id: 's1', name: '새 전략', kind: 'retry', category_id: 'cat-1' },
      error: null,
    });
    mockFrom.mockReturnValueOnce(chain);

    const { POST } = await import('../route');
    const res = await POST(makePostReq({ name: '새 전략', kind: 'retry', category_id: 'cat-1' }));
    expect(res.status).toBe(201);
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ name: '새 전략', kind: 'retry', category_id: 'cat-1' })
    );
  });
});
