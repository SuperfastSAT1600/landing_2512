import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const listPlaudRecordings = vi.fn();
vi.mock('@/lib/plaud-client', () => ({ listPlaudRecordings }));

process.env.ADMIN_SECRET_KEY = 'admin-key';

function makeReq(url: string, key: string | null = 'admin-key') {
  return new NextRequest(url, { headers: key ? { 'x-admin-key': key } : {} });
}

describe('GET /api/crm/plaud/recordings', () => {
  beforeEach(() => vi.clearAllMocks());

  it('잘못된 admin key → 401', async () => {
    const { GET } = await import('../route');
    const res = await GET(makeReq('http://localhost/api/crm/plaud/recordings', 'nope'));
    expect(res.status).toBe(401);
    expect(listPlaudRecordings).not.toHaveBeenCalled();
  });

  it('정상 → 200, query 파라미터 전달', async () => {
    listPlaudRecordings.mockResolvedValueOnce([{ id: 'a1', name: '상담' }]);
    const { GET } = await import('../route');
    const res = await GET(
      makeReq('http://localhost/api/crm/plaud/recordings?q=%EC%83%81%EB%8B%B4&page_size=15')
    );
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data).toEqual([{ id: 'a1', name: '상담' }]);
    expect(listPlaudRecordings).toHaveBeenCalledWith(
      expect.objectContaining({ query: '상담', page_size: 15 })
    );
  });

  it('클라이언트 오류(토큰 만료 등) → 502', async () => {
    listPlaudRecordings.mockRejectedValueOnce(new Error('token expired'));
    const { GET } = await import('../route');
    const res = await GET(makeReq('http://localhost/api/crm/plaud/recordings'));
    expect(res.status).toBe(502);
  });
});
