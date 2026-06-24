import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockSelect = vi.fn();
const mockUpdate = vi.fn();

vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: { from: vi.fn(() => ({ select: mockSelect, update: mockUpdate })) },
}));

process.env.ADMIN_SECRET_KEY = 'admin-key';
process.env.SUPERFASTSAT_PLATFORM_URL = 'https://app.superfastsat.com';

function makeReq(key = 'admin-key') {
  return new NextRequest('http://localhost/api/crm/students/s1/signup-token', {
    method: 'POST',
    headers: { 'x-admin-key': key },
  });
}
const params = Promise.resolve({ id: 's1' });

function selectReturns(result: unknown) {
  mockSelect.mockReturnValueOnce({
    eq: vi.fn().mockReturnValueOnce({ single: vi.fn().mockResolvedValueOnce(result) }),
  });
}

describe('POST /api/crm/students/[id]/signup-token', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects a wrong admin key → 401', async () => {
    const { POST } = await import('../route');
    const res = await POST(makeReq('nope'), { params });
    expect(res.status).toBe(401);
  });

  it('returns the existing token without regenerating → 200', async () => {
    selectReturns({ data: { id: 's1', signup_token: 'existing' }, error: null });
    const { POST } = await import('../route');
    const res = await POST(makeReq(), { params });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.signup_token).toBe('existing');
    expect(body.signup_url).toBe('https://app.superfastsat.com/signup/tutoring?token=existing');
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('generates a token when none exists → 201', async () => {
    selectReturns({ data: { id: 's1', signup_token: null }, error: null });
    mockUpdate.mockReturnValueOnce({ eq: vi.fn().mockResolvedValueOnce({ error: null }) });
    const { POST } = await import('../route');
    const res = await POST(makeReq(), { params });
    const body = await res.json();
    expect(res.status).toBe(201);
    expect(body.signup_token).toMatch(/^[0-9a-f]{32}$/);
    expect(body.signup_url).toContain('/signup/tutoring?token=');
    expect(mockUpdate).toHaveBeenCalledTimes(1);
  });

  it('404 when the student is missing', async () => {
    selectReturns({ data: null, error: { message: 'not found' } });
    const { POST } = await import('../route');
    const res = await POST(makeReq(), { params });
    expect(res.status).toBe(404);
  });
});
