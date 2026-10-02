// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

function makeBuilder(result: { data: unknown; error: null | { message: string } }) {
  const builder: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'update']) builder[m] = vi.fn(() => builder);
  builder.single = vi.fn(() => builder);
  builder.then = (resolve: (v: typeof result) => unknown) => Promise.resolve(result).then(resolve);
  return builder;
}

const mockFrom = vi.hoisted(() => vi.fn());
vi.mock('@/lib/supabase-admin', () => ({ supabaseAdmin: { from: mockFrom } }));

process.env.ADMIN_SECRET_KEY = 'admin-key';
const params = Promise.resolve({ id: 'stu-1' });

function makeReq(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/crm/students/stu-1/diagnostic-link', {
    method: 'POST',
    headers: { 'x-admin-key': 'admin-key', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/crm/students/[id]/diagnostic-link', () => {
  beforeEach(() => vi.clearAllMocks());

  // REQ-004 (crm-quality-cleanup)
  it('연결 해제 쓰기가 실패하면 500', async () => {
    mockFrom.mockReturnValueOnce(makeBuilder({ data: null, error: { message: 'boom' } }));
    const { POST } = await import('../route');
    const res = await POST(makeReq({ resultId: null }), { params });
    expect(res.status).toBe(500);
  });

  it('양방향 연결 중 하나라도 실패하면 500', async () => {
    mockFrom
      .mockReturnValueOnce(makeBuilder({ data: { id: 'r-1' }, error: null }))
      .mockReturnValueOnce(makeBuilder({ data: null, error: null }))
      .mockReturnValueOnce(makeBuilder({ data: null, error: { message: 'boom' } }));
    const { POST } = await import('../route');
    const res = await POST(makeReq({ resultId: 'r-1' }), { params });
    expect(res.status).toBe(500);
  });

  it('정상 연결은 200 success', async () => {
    mockFrom
      .mockReturnValueOnce(makeBuilder({ data: { id: 'r-1' }, error: null }))
      .mockReturnValueOnce(makeBuilder({ data: null, error: null }))
      .mockReturnValueOnce(makeBuilder({ data: null, error: null }));
    const { POST } = await import('../route');
    const res = await POST(makeReq({ resultId: 'r-1' }), { params });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
  });
});
