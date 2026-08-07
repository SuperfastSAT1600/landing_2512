import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const listPlaudAccounts = vi.fn();
vi.mock('@/lib/plaud-client', () => ({ listPlaudAccounts }));

process.env.ADMIN_SECRET_KEY = 'admin-key';

function makeReq(key: string | null = 'admin-key') {
  return new NextRequest('http://localhost/api/crm/plaud/accounts', {
    headers: key ? { 'x-admin-key': key } : {},
  });
}

describe('GET /api/crm/plaud/accounts', () => {
  beforeEach(() => vi.clearAllMocks());

  it('잘못된 admin key → 401', async () => {
    const { GET } = await import('../route');
    const res = await GET(makeReq('nope'));
    expect(res.status).toBe(401);
    expect(listPlaudAccounts).not.toHaveBeenCalled();
  });

  it('REQ-006: 설정된 직원 계정 목록(key+label) 반환', async () => {
    listPlaudAccounts.mockReturnValueOnce([
      { key: 'me', label: '이민재' },
      { key: 'wooyoung', label: '김우영' },
    ]);
    const { GET } = await import('../route');
    const res = await GET(makeReq());
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data).toEqual([
      { key: 'me', label: '이민재' },
      { key: 'wooyoung', label: '김우영' },
    ]);
  });
});
