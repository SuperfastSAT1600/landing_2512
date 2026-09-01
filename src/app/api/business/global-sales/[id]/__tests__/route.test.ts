// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockFrom = vi.hoisted(() => vi.fn());
vi.mock('@/lib/supabase-admin', () => ({ supabaseAdmin: { from: mockFrom } }));

process.env.ADMIN_SECRET_KEY = 'admin-key';

type Result = { data?: unknown; error: null | { message: string } };

function makeBuilder(result: Result) {
  const builder: Record<string, unknown> = {};
  for (const m of ['delete', 'update', 'eq', 'select']) builder[m] = vi.fn(() => builder);
  builder.single = vi.fn(() => Promise.resolve(result));
  builder.then = (resolve: (v: Result) => unknown) => Promise.resolve(result).then(resolve);
  return builder;
}

function req(key = 'admin-key') {
  return new NextRequest('http://localhost/api/business/global-sales/g-1', {
    method: 'DELETE',
    headers: { 'x-admin-key': key },
  });
}

function patchReq(body: unknown, key = 'admin-key') {
  return new NextRequest('http://localhost/api/business/global-sales/g-1', {
    method: 'PATCH',
    headers: { 'x-admin-key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}
const params = Promise.resolve({ id: 'g-1' });

beforeEach(() => vi.clearAllMocks());

describe('DELETE /api/business/global-sales/[id]', () => {
  it('잘못된 admin key → 401', async () => {
    const { DELETE } = await import('../route');
    expect((await DELETE(req('nope'), { params })).status).toBe(401);
  });

  it('삭제 성공 → id를 반환한다', async () => {
    const builder = makeBuilder({ error: null });
    mockFrom.mockReturnValue(builder);

    const { DELETE } = await import('../route');
    const res = await DELETE(req(), { params });
    expect(res.status).toBe(200);
    const { data } = await res.json();
    expect(data).toEqual({ id: 'g-1' });
    expect(builder.eq).toHaveBeenCalledWith('id', 'g-1');
  });

  it('DB 오류 → 500', async () => {
    mockFrom.mockReturnValue(makeBuilder({ error: { message: 'boom' } }));
    const { DELETE } = await import('../route');
    expect((await DELETE(req(), { params })).status).toBe(500);
  });
});

describe('PATCH /api/business/global-sales/[id]', () => {
  it('잘못된 admin key → 401', async () => {
    const { PATCH } = await import('../route');
    expect((await PATCH(patchReq({ country_code: 'PK' }, 'nope'), { params })).status).toBe(401);
  });

  it('국가 코드를 대문자로 정규화해 저장한다', async () => {
    const builder = makeBuilder({ data: { id: 'g-1', country_code: 'PK' }, error: null });
    mockFrom.mockReturnValue(builder);

    const { PATCH } = await import('../route');
    const res = await PATCH(patchReq({ country_code: 'pk' }), { params });
    expect(res.status).toBe(200);
    expect(builder.update).toHaveBeenCalledWith({ country_code: 'PK' });
    expect(builder.eq).toHaveBeenCalledWith('id', 'g-1');
  });

  it('빈 값이면 국가를 비운다(null)', async () => {
    const builder = makeBuilder({ data: { id: 'g-1', country_code: null }, error: null });
    mockFrom.mockReturnValue(builder);

    const { PATCH } = await import('../route');
    const res = await PATCH(patchReq({ country_code: '' }), { params });
    expect(res.status).toBe(200);
    expect(builder.update).toHaveBeenCalledWith({ country_code: null });
  });

  it('알 수 없는 국가 코드 → 400', async () => {
    const { PATCH } = await import('../route');
    expect((await PATCH(patchReq({ country_code: 'ZZ' }), { params })).status).toBe(400);
  });

  it('수정할 필드가 하나도 없으면 → 400', async () => {
    const { PATCH } = await import('../route');
    expect((await PATCH(patchReq({}), { params })).status).toBe(400);
  });

  it('billing_type만 바꿀 수 있다', async () => {
    const builder = makeBuilder({ data: { id: 'g-1', billing_type: '구독' }, error: null });
    mockFrom.mockReturnValue(builder);

    const { PATCH } = await import('../route');
    const res = await PATCH(patchReq({ billing_type: '구독' }), { params });
    expect(res.status).toBe(200);
    expect(builder.update).toHaveBeenCalledWith({ billing_type: '구독' });
  });

  it('국가와 결제 방식을 함께 바꿀 수 있다', async () => {
    const builder = makeBuilder({ data: { id: 'g-1' }, error: null });
    mockFrom.mockReturnValue(builder);

    const { PATCH } = await import('../route');
    await PATCH(patchReq({ country_code: 'PK', billing_type: '구독' }), { params });
    expect(builder.update).toHaveBeenCalledWith({ country_code: 'PK', billing_type: '구독' });
  });

  it('알 수 없는 billing_type → 400', async () => {
    const { PATCH } = await import('../route');
    expect((await PATCH(patchReq({ billing_type: '월정액' }), { params })).status).toBe(400);
  });

  it('DB 오류 → 500', async () => {
    mockFrom.mockReturnValue(makeBuilder({ data: null, error: { message: 'boom' } }));
    const { PATCH } = await import('../route');
    expect((await PATCH(patchReq({ country_code: 'PK' }), { params })).status).toBe(500);
  });
});
