import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockSelect = vi.fn();

vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: { from: vi.fn(() => ({ select: mockSelect })) },
}));

process.env.SIGNUP_BRIDGE_SECRET = 'bridge';

function makeReq(key: string | undefined = 'bridge') {
  const headers: Record<string, string> = {};
  if (key !== undefined) headers['x-signup-bridge-secret'] = key;
  return new NextRequest('http://localhost/api/crm/signup/tok', { headers });
}
const params = Promise.resolve({ token: 'tok' });

function selectReturns(result: unknown) {
  mockSelect.mockReturnValueOnce({
    eq: vi.fn().mockReturnValueOnce({ maybeSingle: vi.fn().mockResolvedValueOnce(result) }),
  });
}

describe('GET /api/crm/signup/[token]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects a wrong bridge secret → 401', async () => {
    const { GET } = await import('../route');
    const res = await GET(makeReq('nope'), { params });
    expect(res.status).toBe(401);
  });

  it('returns mapped prefill for a valid token', async () => {
    selectReturns({
      data: {
        id: 'stu-1',
        name: '홍길동',
        parent_phone: '+82 10',
        parent_timezone: 'Asia/Seoul',
        previous_rw_score: 600,
        previous_math_score: 700,
        previous_test_date: '2025-12',
        target_test_date: '2026-05-03',
        signup_done_at: null,
      },
      error: null,
    });
    const { GET } = await import('../route');
    const res = await GET(makeReq(), { params });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.status).toBe('valid');
    expect(body.studentId).toBe('stu-1');
    expect(body.prefill.studentName).toBe('홍길동');
    expect(body.prefill.lastScoreRw).toBe(600);
  });

  it('404 for an unknown token', async () => {
    selectReturns({ data: null, error: null });
    const { GET } = await import('../route');
    const res = await GET(makeReq(), { params });
    const body = await res.json();
    expect(res.status).toBe(404);
    expect(body.status).toBe('invalid');
  });

  it('409 for an already-consumed token', async () => {
    selectReturns({ data: { id: 'stu-1', signup_done_at: '2026-06-01T00:00:00Z' }, error: null });
    const { GET } = await import('../route');
    const res = await GET(makeReq(), { params });
    const body = await res.json();
    expect(res.status).toBe(409);
    expect(body.status).toBe('consumed');
  });
});
