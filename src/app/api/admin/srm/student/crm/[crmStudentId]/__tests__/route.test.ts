import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockFrom = vi.fn();
vi.mock('@/lib/supabase-admin', () => ({ supabaseAdmin: { from: (t: string) => mockFrom(t) } }));
vi.mock('@/lib/embedding', () => ({ generateEmbedding: vi.fn(), buildEmbeddingText: vi.fn() }));

process.env.ADMIN_SECRET_KEY = 'admin-key';
const params = Promise.resolve({ crmStudentId: 's1' });

function req(body: unknown, key = 'admin-key') {
  return new NextRequest('http://localhost/api/admin/srm/student/crm/s1', {
    method: 'PATCH',
    headers: { 'x-admin-key': key, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function updateSucceeds(row: unknown = { id: 's1' }) {
  const update = vi.fn((_p: Record<string, unknown>) => ({
    eq: () => ({ select: () => ({ single: () => Promise.resolve({ data: row, error: null }) }) }),
  }));
  mockFrom.mockReturnValue({ update });
  return update;
}

describe('PATCH /api/admin/srm/student/crm/[crmStudentId] — service_status', () => {
  beforeEach(() => vi.clearAllMocks());

  it('부분종료(partial_end)는 더 이상 허용하지 않는다', async () => {
    const { PATCH } = await import('../route');
    const res = await PATCH(req({ service_status: 'partial_end' }), { params });
    expect(res.status).toBe(400);
  });

  it('active 는 그대로 저장된다', async () => {
    const update = updateSucceeds();
    const { PATCH } = await import('../route');
    const res = await PATCH(req({ service_status: 'active' }), { params });
    expect(res.status).toBe(200);
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ service_status: 'active' }));
  });
});
