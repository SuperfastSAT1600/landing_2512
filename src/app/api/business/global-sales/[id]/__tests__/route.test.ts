// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockFrom = vi.hoisted(() => vi.fn());
vi.mock('@/lib/supabase-admin', () => ({ supabaseAdmin: { from: mockFrom } }));

process.env.ADMIN_SECRET_KEY = 'admin-key';

type Result = { error: null | { message: string } };

function makeBuilder(result: Result) {
  const builder: Record<string, unknown> = {};
  builder.delete = vi.fn(() => builder);
  builder.eq = vi.fn(() => builder);
  builder.then = (resolve: (v: Result) => unknown) => Promise.resolve(result).then(resolve);
  return builder;
}

function req(key = 'admin-key') {
  return new NextRequest('http://localhost/api/business/global-sales/g-1', {
    method: 'DELETE',
    headers: { 'x-admin-key': key },
  });
}
const params = Promise.resolve({ id: 'g-1' });

beforeEach(() => vi.clearAllMocks());

describe('DELETE /api/business/global-sales/[id]', () => {
  it('잘못된 admin key → 401', async () => {
    const { DELETE } = await import('../route');
    expect((await DELETE(req('nope'), { params })).status).toBe(401);
  });

  it('삭제 성공 → id를 반환한다', async () => {
    const builder = makeBuilder({ error: null });
    mockFrom.mockReturnValue(builder);

    const { DELETE } = await import('../route');
    const res = await DELETE(req(), { params });
    expect(res.status).toBe(200);
    const { data } = await res.json();
    expect(data).toEqual({ id: 'g-1' });
    expect(builder.eq).toHaveBeenCalledWith('id', 'g-1');
  });

  it('DB 오류 → 500', async () => {
    mockFrom.mockReturnValue(makeBuilder({ error: { message: 'boom' } }));
    const { DELETE } = await import('../route');
    expect((await DELETE(req(), { params })).status).toBe(500);
  });
});
