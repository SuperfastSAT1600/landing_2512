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

  // 로스터 전원. 계정을 추가·수정하면 여기도 같이 고친다 — 이름 오타가 화면까지 가지 않도록.
  it('구성원 전원이 각자 코드로 로그인되고 이름이 맞게 내려온다', async () => {
    const roster: [string, string][] = [
      ['dlalswo', '이민재'], ['rladndud', '김우영'], ['rlaskawns', '김남준'],
      ['rlawodus', '김재연'], ['qoqudbs', '배병윤'], ['qkrrmsdn', '박근우'],
      ['alsrudeh', '민경도'],
    ];
    for (const [code, name] of roster) {
      const r = await call(code);
      expect(r.status).toBe(200);
      expect(r.body).toMatchObject({ success: true, userName: name });
    }
  });

  it('등록되지 않은 값은 401', async () => {
    expect((await call('nope')).status).toBe(401);
  });
});
