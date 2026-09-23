import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockFrom = vi.fn();

vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: { from: (...args: unknown[]) => mockFrom(...args) },
}));

process.env.ADMIN_SECRET_KEY = 'admin-key';

const params = Promise.resolve({ id: 's1' });

function chainable(result: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {};
  chain.update = vi.fn(() => chain);
  chain.delete = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.select = vi.fn(() => chain);
  chain.single = vi.fn(() => Promise.resolve(result));
  chain.then = (resolve: (v: unknown) => void) => resolve(result);
  return chain;
}

function makePatchReq(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/crm/retry-strategies/s1', {
    method: 'PATCH',
    headers: { 'x-admin-key': 'admin-key', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('PATCH /api/crm/retry-strategies/[id]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('moves a strategy to a new category via category_id (drag-and-drop reassignment)', async () => {
    const chain = chainable({ data: { id: 's1', category_id: 'cat-2' }, error: null });
    mockFrom.mockReturnValueOnce(chain);

    const { PATCH } = await import('../route');
    const res = await PATCH(makePatchReq({ category_id: 'cat-2' }), { params });
    expect(res.status).toBe(200);
    expect(chain.update).toHaveBeenCalledWith({ category_id: 'cat-2' });
  });

  it('kind 는 무시한다 — 더 이상 전략의 분류가 아니다', async () => {
    const chain = chainable({ data: { id: 's1' }, error: null });
    mockFrom.mockReturnValueOnce(chain);

    const { PATCH } = await import('../route');
    const res = await PATCH(makePatchReq({ kind: 'initial_sales', name: '새 이름' }), { params });
    expect(res.status).toBe(200);
    expect(chain.update).toHaveBeenCalledWith({ name: '새 이름' });
  });

  it('still supports renaming name/description', async () => {
    const chain = chainable({ data: { id: 's1' }, error: null });
    mockFrom.mockReturnValueOnce(chain);

    const { PATCH } = await import('../route');
    const res = await PATCH(makePatchReq({ name: '새 이름', description: '설명' }), { params });
    expect(res.status).toBe(200);
    expect(chain.update).toHaveBeenCalledWith({ name: '새 이름', description: '설명' });
  });
});
