import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockFrom = vi.fn();

vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: { from: (...args: unknown[]) => mockFrom(...args) },
}));

process.env.ADMIN_SECRET_KEY = 'admin-key';

const params = Promise.resolve({ id: 'c1' });

function chainable(result: { data: unknown; error: unknown; count?: number }) {
  const chain: Record<string, unknown> = {};
  chain.select = vi.fn(() => chain);
  chain.update = vi.fn(() => chain);
  chain.delete = vi.fn(() => chain);
  chain.eq = vi.fn(() => Promise.resolve(result));
  chain.single = vi.fn(() => Promise.resolve(result));
  return chain;
}

/** select().update().eq().select().single() 처럼 eq 뒤에 체이닝이 더 필요한 경우. */
function chainableWithEqChain(result: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {};
  chain.update = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.select = vi.fn(() => chain);
  chain.single = vi.fn(() => Promise.resolve(result));
  return chain;
}

function makePatchReq(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/crm/strategy-categories/c1', {
    method: 'PATCH',
    headers: { 'x-admin-key': 'admin-key', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function makeDeleteReq() {
  return new NextRequest('http://localhost/api/crm/strategy-categories/c1', {
    method: 'DELETE',
    headers: { 'x-admin-key': 'admin-key' },
  });
}

describe('PATCH /api/crm/strategy-categories/[id]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects blank name → 400', async () => {
    const { PATCH } = await import('../route');
    const res = await PATCH(makePatchReq({ name: '' }), { params });
    expect(res.status).toBe(400);
  });

  it('renames a category (system or custom, no restriction)', async () => {
    const chain = chainableWithEqChain({ data: { id: 'c1', name: '새 이름' }, error: null });
    mockFrom.mockReturnValueOnce(chain);

    const { PATCH } = await import('../route');
    const res = await PATCH(makePatchReq({ name: '새 이름' }), { params });
    expect(res.status).toBe(200);
    expect(chain.update).toHaveBeenCalledWith({ name: '새 이름' });
  });
});

describe('DELETE /api/crm/strategy-categories/[id]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('blocks deletion when strategies still reference the category → 400', async () => {
    const countChain = chainable({ data: null, error: null, count: 2 });
    mockFrom.mockReturnValueOnce(countChain);

    const { DELETE } = await import('../route');
    const res = await DELETE(makeDeleteReq(), { params });
    expect(res.status).toBe(400);
  });

  it('deletes an empty category', async () => {
    const countChain = chainable({ data: null, error: null, count: 0 });
    const deleteChain = chainable({ data: null, error: null });
    mockFrom.mockReturnValueOnce(countChain).mockReturnValueOnce(deleteChain);

    const { DELETE } = await import('../route');
    const res = await DELETE(makeDeleteReq(), { params });
    expect(res.status).toBe(200);
  });
});
