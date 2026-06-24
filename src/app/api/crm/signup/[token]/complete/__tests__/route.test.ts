import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockSelect = vi.fn();
const mockUpdate = vi.fn();

vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: { from: vi.fn(() => ({ select: mockSelect, update: mockUpdate })) },
}));

process.env.SIGNUP_BRIDGE_SECRET = 'bridge';

function makeReq(key: string | undefined = 'bridge', body?: unknown) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (key !== undefined) headers['x-signup-bridge-secret'] = key;
  return new NextRequest('http://localhost/api/crm/signup/tok/complete', {
    method: 'POST',
    headers,
    body: JSON.stringify(body ?? {}),
  });
}
const params = Promise.resolve({ token: 'tok' });

function selectReturns(result: unknown) {
  mockSelect.mockReturnValueOnce({
    eq: vi.fn().mockReturnValueOnce({ maybeSingle: vi.fn().mockResolvedValueOnce(result) }),
  });
}

describe('POST /api/crm/signup/[token]/complete', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects a wrong bridge secret → 401', async () => {
    const { POST } = await import('../route');
    const res = await POST(makeReq('nope'), { params });
    expect(res.status).toBe(401);
  });

  it('stamps signup_done_at + links platform_user_id for a fresh token → done', async () => {
    selectReturns({ data: { id: 'stu-1', signup_done_at: null }, error: null });
    mockUpdate.mockReturnValueOnce({ eq: vi.fn().mockResolvedValueOnce({ error: null }) });
    const { POST } = await import('../route');
    const res = await POST(makeReq('bridge', { platformUserId: 'plat-uuid-1' }), { params });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.status).toBe('done');
    expect(mockUpdate).toHaveBeenCalledTimes(1);
    const updateArg = mockUpdate.mock.calls[0][0];
    expect(updateArg.platform_user_id).toBe('plat-uuid-1');
    expect(updateArg.signup_done_at).toBeTruthy();
  });

  it('is idempotent when already completed → already_done, no write', async () => {
    selectReturns({ data: { id: 'stu-1', signup_done_at: '2026-06-01T00:00:00Z' }, error: null });
    const { POST } = await import('../route');
    const res = await POST(makeReq(), { params });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.status).toBe('already_done');
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('404 for an unknown token', async () => {
    selectReturns({ data: null, error: null });
    const { POST } = await import('../route');
    const res = await POST(makeReq(), { params });
    expect(res.status).toBe(404);
  });
});
