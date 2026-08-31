import { describe, it, expect, beforeAll } from 'vitest';
import { POST } from '../route';

const call = async (password: string) => {
  const res = await POST(new Request('http://localhost/api/admin/auth', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }),
  }) as never);
  return { status: res.status, body: await res.json() };
};

describe('CRM 로그인 코드', () => {
  beforeAll(() => { process.env.ADMIN_PASSWORD = 'test-admin-pw'; process.env.ADMIN_SECRET_KEY = 'test-key'; });

  it('민경 코드로 로그인된다', async () => {
    const r = await call('alsrud');
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ success: true, userName: '민경' });
  });

  it('기존 구성원 6명이 그대로 동작한다', async () => {
    const roster: [string, string][] = [
      ['dlalswo', '이민재'], ['rladndud', '김우영'], ['rlaskawns', '김남준'],
      ['rlawodus', '김재연'], ['qoqudbs', '배병윤'], ['qkrrmsdn', '박근우'],
    ];
    for (const [code, name] of roster) {
      expect((await call(code)).body).toMatchObject({ success: true, userName: name });
    }
  });

  it('등록되지 않은 값은 401', async () => {
    expect((await call('nope')).status).toBe(401);
  });
});
