import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockFrom = vi.fn();

vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: { from: (...args: unknown[]) => mockFrom(...args) },
}));

process.env.ADMIN_SECRET_KEY = 'admin-key';

function fetchChain(ids: string[]) {
  const chain: Record<string, unknown> = {};
  chain.select = vi.fn(() => chain);
  chain.eq = vi.fn(() => Promise.resolve({ data: ids.map((id) => ({ id })), error: null }));
  return chain;
}

function updateChain() {
  const chain: Record<string, unknown> = {};
  chain.update = vi.fn(() => chain);
  chain.eq = vi.fn(() => Promise.resolve({ error: null }));
  return chain;
}

function makeReq(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/crm/strategy-categories/reorder', {
    method: 'PATCH',
    headers: { 'x-admin-key': 'admin-key', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('PATCH /api/crm/strategy-categories/reorder', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects a partial/foreign id list → 400', async () => {
    mockFrom.mockReturnValueOnce(fetchChain(['c1', 'c2', 'c3']));

    const { PATCH } = await import('../route');
    const res = await PATCH(makeReq({ segment: 'b2c', ordered_ids: ['c1', 'c2'] }));
    expect(res.status).toBe(400);
  });

  it('bulk-updates sort_order in one transaction-like batch', async () => {
    mockFrom.mockReturnValueOnce(fetchChain(['c1', 'c2', 'c3']));
    mockFrom.mockReturnValueOnce(updateChain());
    mockFrom.mockReturnValueOnce(updateChain());
    mockFrom.mockReturnValueOnce(updateChain());

    const { PATCH } = await import('../route');
    const res = await PATCH(makeReq({ segment: 'b2c', ordered_ids: ['c3', 'c1', 'c2'] }));
    expect(res.status).toBe(200);
    expect(mockFrom).toHaveBeenCalledTimes(4);
  });
});
