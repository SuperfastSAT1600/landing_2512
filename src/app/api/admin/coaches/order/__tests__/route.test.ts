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
      { slug: 'ben', sort_order: 0, sort_order_ap: 1, created_at: '2026-05-01' },
      { slug: 'julie', sort_order: 1, sort_order_ap: 0, created_at: '2026-05-02' },
      { slug: 'old', sort_order: null, sort_order_ap: null, created_at: '2026-04-01' },
      { slug: 'gone', sort_order: 5, sort_order_ap: 2, created_at: '2026-06-01' },
      { slug: 'a', sort_order: null, sort_order_ap: null, created_at: '2026-07-01' },
    ], error: null });
    mockUpdate.mockResolvedValue({ error: null });
  });

  it('관리자 키가 없으면 401', async () => {
    const { PATCH } = await import('../route');
    expect((await PATCH(patch({ subject: 'AP', slugs: ['a'] }, 'wrong'))).status).toBe(401);
  });

  it('subject가 있으면 그 과목 칸 순서(sort_order_ap)만 다시 매기고, 나머지는 기존 과목 순서 → sort_order → 등록순으로 뒤에', async () => {
    const { PATCH } = await import('../route');
    const res = await PATCH(patch({ subject: 'AP', slugs: ['ben'] }));
    expect(res.status).toBe(200);
    expect(mockUpdate.mock.calls.map(([v, slug]) => [slug, v])).toEqual([
      ['ben', { sort_order_ap: 0 }], ['julie', { sort_order_ap: 1 }], ['gone', { sort_order_ap: 2 }], ['old', { sort_order_ap: 3 }], ['a', { sort_order_ap: 4 }],
    ]);
  });

  it('SAT는 sort_order_sat에 저장하고, 모르는 과목은 400', async () => {
    const { PATCH } = await import('../route');
    expect((await PATCH(patch({ subject: 'SAT', slugs: ['julie'] }))).status).toBe(200);
    expect(mockUpdate.mock.calls[0]).toEqual([{ sort_order_sat: 0 }, 'julie']);
    mockUpdate.mockClear();
    expect((await PATCH(patch({ subject: 'MATH', slugs: ['julie'] }))).status).toBe(400);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('과목 순서 칸이 아직 없으면 409 — 마이그레이션 164 안내', async () => {
    mockUpdate.mockResolvedValue({ error: { code: '42703', message: 'column "sort_order_ap" does not exist' } });
    const { PATCH } = await import('../route');
    const res = await PATCH(patch({ subject: 'AP', slugs: ['ben'] }));
    expect(res.status).toBe(409);
    expect((await res.json()).error.message).toContain('164');
  });

  it('빈 목록·중복·없는 코치는 400', async () => {
    const { PATCH } = await import('../route');
    expect((await PATCH(patch({ subject: 'AP', slugs: [] }))).status).toBe(400);
    expect((await PATCH(patch({ subject: 'AP', slugs: ['a', 'a'] }))).status).toBe(400);
    expect((await PATCH(patch({ subject: 'AP', slugs: ['a', 'ghost'] }))).status).toBe(400);
    // 과목 없음·프로토타입 키도 400
    expect((await PATCH(patch({ slugs: ['a'] }))).status).toBe(400);
    expect((await PATCH(patch({ subject: 'constructor', slugs: ['a'] }))).status).toBe(400);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('PostgREST가 PGRST204(스키마 캐시에 칸 없음)로 답해도 409 MIGRATION_REQUIRED', async () => {
    mockUpdate.mockResolvedValue({ error: { code: 'PGRST204', message: "Could not find the 'sort_order_sat' column of 'coaches' in the schema cache" } });
    const { PATCH } = await import('../route');
    const res = await PATCH(patch({ subject: 'SAT', slugs: ['ben'] }));
    expect(res.status).toBe(409);
    expect((await res.json()).error.code).toBe('MIGRATION_REQUIRED');
  });
});
