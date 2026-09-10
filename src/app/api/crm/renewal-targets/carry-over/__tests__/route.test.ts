import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockCarry = vi.hoisted(() => vi.fn());
vi.mock('@/lib/renewal-carry-over', () => ({ carryOverRenewalTargets: mockCarry }));

process.env.ADMIN_SECRET_KEY = 'admin-key';

function makeReq(key = 'admin-key') {
  return new NextRequest('http://localhost/api/crm/renewal-targets/carry-over', {
    method: 'POST',
    headers: { 'x-admin-key': key },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/crm/renewal-targets/carry-over', () => {
  it('rejects a wrong admin key → 401', async () => {
    const { POST } = await import('../route');
    const res = await POST(makeReq('nope'));
    expect(res.status).toBe(401);
    expect(mockCarry).not.toHaveBeenCalled();
  });

  it('이월 결과를 그대로 돌려준다 → 200', async () => {
    mockCarry.mockResolvedValueOnce({
      ok: true,
      data: { week_start: '2026-08-31', created: 10, closed: 10 },
    });
    const { POST } = await import('../route');
    const res = await POST(makeReq());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toEqual({ week_start: '2026-08-31', created: 10, closed: 10 });
  });

  it('이월 실패는 코드를 보존해 500으로 내려준다', async () => {
    mockCarry.mockResolvedValueOnce({
      ok: false,
      code: 'UPDATE_FAILED',
      message: '이월 표시에 실패했습니다.',
    });
    const { POST } = await import('../route');
    const res = await POST(makeReq());
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error.code).toBe('UPDATE_FAILED');
  });
});
