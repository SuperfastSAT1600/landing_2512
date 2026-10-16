import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockExisting = vi.fn();
const mockUpdate = vi.fn();
vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: {
    from: () => ({
      select: () => mockExisting(),
      update: (v: unknown) => ({ eq: (_c: string, slug: string) => mockUpdate(v, slug) }),
    }),
  },
}));

process.env.ADMIN_SECRET_KEY = 'admin-key';
const patch = (body: unknown, key = 'admin-key') => new NextRequest('http://localhost/api/admin/coaches/order', {
  method: 'PATCH', headers: { 'x-admin-key': key, 'content-type': 'application/json' }, body: JSON.stringify(body),
});

// REQ-002 (crm-coach-roster)
describe('PATCH /api/admin/coaches/order', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExisting.mockResolvedValue({ data: [
      { slug: 'ben', sort_order: 0, created_at: '2026-05-01' },
      { slug: 'julie', sort_order: 1, created_at: '2026-05-02' },
      { slug: 'old', sort_order: null, created_at: '2026-04-01' },
      { slug: 'gone', sort_order: 5, created_at: '2026-06-01' },
      { slug: 'a', sort_order: null, created_at: '2026-07-01' },
    ], error: null });
    mockUpdate.mockResolvedValue({ error: null });
  });

  it('관리자 키가 없으면 401', async () => {
    const { PATCH } = await import('../route');
    expect((await PATCH(patch({ slugs: ['a'] }, 'wrong'))).status).toBe(401);
  });

  it('목록 위치를 sort_order로 저장하고, 화면에 없던 코치는 기존 순서대로 뒤에 붙인다', async () => {
    const { PATCH } = await import('../route');
    const res = await PATCH(patch({ slugs: ['julie', 'ben'] }));
    expect(res.status).toBe(200);
    expect(mockUpdate.mock.calls.map(([v, slug]) => [slug, (v as { sort_order: number }).sort_order])).toEqual([
      ['julie', 0], ['ben', 1], ['gone', 2], ['old', 3], ['a', 4],
    ]);
  });

  it('빈 목록·중복·없는 코치는 400', async () => {
    const { PATCH } = await import('../route');
    expect((await PATCH(patch({ slugs: [] }))).status).toBe(400);
    expect((await PATCH(patch({ slugs: ['a', 'a'] }))).status).toBe(400);
    expect((await PATCH(patch({ slugs: ['a', 'ghost'] }))).status).toBe(400);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('sort_order 칸이 아직 없으면 409 MIGRATION_REQUIRED', async () => {
    mockUpdate.mockResolvedValue({ error: { code: '42703', message: 'column "sort_order" does not exist' } });
    const { PATCH } = await import('../route');
    const res = await PATCH(patch({ slugs: ['ben'] }));
    expect(res.status).toBe(409);
    expect((await res.json()).error.code).toBe('MIGRATION_REQUIRED');
  });
});
