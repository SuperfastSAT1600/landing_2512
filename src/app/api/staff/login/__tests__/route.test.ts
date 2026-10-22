import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mockAuth = vi.fn();
vi.mock('@/lib/staff-auth', () => ({ authenticateStaff: (...a: unknown[]) => mockAuth(...a) }));

process.env.STAFF_SESSION_SECRET = 'test-secret';

let seq = 0;
const req = (body: unknown, ip = `10.0.0.${++seq}`) =>
  new NextRequest('http://localhost/api/staff/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
    body: JSON.stringify(body),
  });

// REQ-001
describe('POST /api/staff/login', () => {
  beforeEach(() => vi.clearAllMocks());

  it('직원 계정이면 httpOnly·strict 쿠키를 발급', async () => {
    mockAuth.mockResolvedValue({ id: 'u1', name: '신명경', role: 'staff' });
    const { POST } = await import('../route');
    const res = await POST(req({ email: 'a@b.c', password: 'pw' }));
    expect(res.status).toBe(200);
    expect((await res.json()).data.user).toMatchObject({ id: 'u1', role: 'staff' });
    const cookie = res.headers.get('set-cookie') ?? '';
    expect(cookie).toContain('staff_session=');
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=strict/i);
  });

  it('인증 실패(없는 계정·틀린 비밀번호·권한 없음)는 같은 401', async () => {
    mockAuth.mockResolvedValue(null);
    const { POST } = await import('../route');
    const res = await POST(req({ email: 'a@b.c', password: 'bad' }));
    expect(res.status).toBe(401);
    expect(res.headers.get('set-cookie')).toBeNull();
    expect((await res.json()).error.message).toBe('이메일 또는 비밀번호가 올바르지 않습니다.');
  });

  it('입력이 비었으면 400', async () => {
    const { POST } = await import('../route');
    expect((await POST(req({ email: '', password: '' }))).status).toBe(400);
    expect(mockAuth).not.toHaveBeenCalled();
  });

  it('같은 IP·이메일로 5회 실패하면 6번째는 429 (인증 시도 없이)', async () => {
    mockAuth.mockResolvedValue(null);
    const { POST } = await import('../route');
    for (let i = 0; i < 5; i++) expect((await POST(req({ email: 'x@y.z', password: 'bad' }, '9.9.9.9'))).status).toBe(401);
    mockAuth.mockClear();
    expect((await POST(req({ email: 'x@y.z', password: 'bad' }, '9.9.9.9'))).status).toBe(429);
    expect(mockAuth).not.toHaveBeenCalled();
  });

  it('인증 중 예기치 못한 오류는 500', async () => {
    mockAuth.mockRejectedValue(new Error('boom'));
    const { POST } = await import('../route');
    expect((await POST(req({ email: 'a@b.c', password: 'pw' }))).status).toBe(500);
  });
});
