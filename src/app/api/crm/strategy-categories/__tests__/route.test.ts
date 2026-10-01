import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockFrom = vi.fn();

vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: { from: (...args: unknown[]) => mockFrom(...args) },
}));

process.env.ADMIN_SECRET_KEY = 'admin-key';

function chainable(result: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {};
  chain.select = vi.fn(() => chain);
  chain.order = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.insert = vi.fn(() => chain);
  chain.limit = vi.fn(() => Promise.resolve(result));
  chain.single = vi.fn(() => Promise.resolve(result));
  chain.then = (resolve: (v: unknown) => void) => resolve(result);
  return chain;
}

function makeGetReq(qs = '') {
  return new NextRequest(`http://localhost/api/crm/strategy-categories${qs}`, {
    headers: { 'x-admin-key': 'admin-key' },
  });
}

function makePostReq(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/crm/strategy-categories', {
    method: 'POST',
    headers: { 'x-admin-key': 'admin-key', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('GET /api/crm/strategy-categories', () => {
  beforeEach(() => vi.clearAllMocks());

  it('requires segment → 400', async () => {
    const { GET } = await import('../route');
    const res = await GET(makeGetReq());
    expect(res.status).toBe(400);
  });

  it('lists categories for a segment ordered by sort_order', async () => {
    const chain = chainable({ data: [{ id: 'c1', name: '최초 컨텍 전략', sort_order: 0 }], error: null });
    mockFrom.mockReturnValueOnce(chain);

    const { GET } = await import('../route');
    const res = await GET(makeGetReq('?segment=b2c'));
    expect(res.status).toBe(200);
    expect(chain.eq).toHaveBeenCalledWith('segment', 'b2c');
    expect(chain.order).toHaveBeenCalledWith('sort_order', { ascending: true });
  });
});

describe('POST /api/crm/strategy-categories', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects blank name → 400', async () => {
    const { POST } = await import('../route');
    const res = await POST(makePostReq({ name: '  ', segment: 'b2c' }));
    expect(res.status).toBe(400);
  });

  it('rejects invalid segment → 400', async () => {
    const { POST } = await import('../route');
    const res = await POST(makePostReq({ name: '새 카테고리', segment: 'xx' }));
    expect(res.status).toBe(400);
  });

  it('creates a category with next sort_order', async () => {
    const maxChain = chainable({ data: [{ sort_order: 2 }], error: null });
    const insertChain = chainable({ data: { id: 'c9', name: '새 카테고리', sort_order: 3 }, error: null });
    mockFrom.mockReturnValueOnce(maxChain).mockReturnValueOnce(insertChain);

    const { POST } = await import('../route');
    const res = await POST(makePostReq({ name: '새 카테고리', segment: 'b2c' }));
    expect(res.status).toBe(201);
    expect(insertChain.insert).toHaveBeenCalledWith({ name: '새 카테고리', segment: 'b2c', sort_order: 3 });
  });
});
