// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mockRefreshAll = vi.fn();
vi.mock('@/lib/plaud-keepalive', () => ({ refreshAllPlaudAccounts: () => mockRefreshAll() }));

process.env.CRON_SECRET = 'secret';
const { GET } = await import('../route');

const req = (auth: string | null = 'Bearer secret') =>
  new NextRequest('http://localhost/api/cron/plaud-token-keepalive', {
    headers: auth ? { authorization: auth } : {},
  });

// REQ-003
describe('GET /api/cron/plaud-token-keepalive', () => {
  beforeEach(() => vi.clearAllMocks());

  it('인증이 맞지 않으면 401이고 갱신하지 않는다', async () => {
    const res = await GET(req('Bearer wrong'));
    expect(res.status).toBe(401);
    expect(mockRefreshAll).not.toHaveBeenCalled();
  });

  it('전부 성공하면 200과 결과', async () => {
    const results = [{ account: 'me', label: '이민재', ok: true }];
    mockRefreshAll.mockResolvedValue(results);
    const res = await GET(req());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ data: { results } });
  });

  it('실패 계정이 있으면 502와 결과', async () => {
    const results = [
      { account: 'me', label: '이민재', ok: true },
      { account: 'wooyoung', label: '김우영', ok: false, error: 'Plaud 토큰 갱신 실패: 401' },
    ];
    mockRefreshAll.mockResolvedValue(results);
    const res = await GET(req());
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ data: { results } });
  });
});
