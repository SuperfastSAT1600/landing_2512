import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const db = vi.hoisted(() => ({ markOpenedByToken: vi.fn() }));
vi.mock('@/lib/coach-prep-requests-db', () => db);

const post = (body: unknown) =>
  new NextRequest('http://localhost/api/coach-prep/opened', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: typeof body === 'string' ? body : JSON.stringify(body),
  });

beforeEach(() => { vi.clearAllMocks(); db.markOpenedByToken.mockResolvedValue(undefined); });

describe('POST /api/coach-prep/opened', () => {
  // 링크 미리보기 봇은 JS를 실행하지 않으므로, 열람은 페이지가 뜬 브라우저에서 이 API로만 기록한다
  it('토큰으로 첫 열람을 기록하고 204를 돌려준다', async () => {
    const { POST } = await import('../route');
    const res = await POST(post({ token: 'a'.repeat(32) }));
    expect(res.status).toBe(204);
    expect(db.markOpenedByToken).toHaveBeenCalledWith('a'.repeat(32));
  });

  it('토큰이 없거나 JSON이 깨졌으면 400이고 기록하지 않는다', async () => {
    const { POST } = await import('../route');
    expect((await POST(post({}))).status).toBe(400);
    expect((await POST(post('{nope'))).status).toBe(400);
    expect(db.markOpenedByToken).not.toHaveBeenCalled();
  });

  it('DB 오류는 500', async () => {
    db.markOpenedByToken.mockRejectedValue(new Error('db down'));
    const { POST } = await import('../route');
    expect((await POST(post({ token: 'a'.repeat(32) }))).status).toBe(500);
  });
});
