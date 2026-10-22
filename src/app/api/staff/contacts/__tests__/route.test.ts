import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mockList = vi.fn();
const mockCreate = vi.fn();
vi.mock('@/lib/staff-contacts', () => ({
  listContacts: (...a: unknown[]) => mockList(...a),
  createContact: (...a: unknown[]) => mockCreate(...a),
}));

process.env.STAFF_SESSION_SECRET = 'test-secret';
const { createStaffSessionToken } = await import('@/lib/staff-session');
const { GET, POST } = await import('../route');

const cookie = `staff_session=${createStaffSessionToken({ id: 'staff-1', name: '신명경', role: 'staff' })}`;
const get = (query: string, c: string | null = cookie) =>
  new NextRequest(`http://localhost/api/staff/contacts${query}`, { headers: c ? { cookie: c } : {} });
const post = (body: unknown, c: string | null = cookie) =>
  new NextRequest('http://localhost/api/staff/contacts', {
    method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json', ...(c ? { cookie: c } : {}) },
  });

const valid = { studentId: 's1', studentName: '학생', briefingDate: '2026-10-22', listKey: 'noSchedule', note: '문자 발송' };

// REQ-004
describe('GET /api/staff/contacts', () => {
  beforeEach(() => vi.clearAllMocks());

  it('세션이 없으면 401', async () => {
    expect((await GET(get('?studentIds=a', null))).status).toBe(401);
  });

  it('studentIds가 없거나 200개를 넘으면 400', async () => {
    expect((await GET(get(''))).status).toBe(400);
    const many = Array.from({ length: 201 }, (_, i) => `s${i}`).join(',');
    expect((await GET(get(`?studentIds=${many}`))).status).toBe(400);
  });

  it('중복을 없애고 학생별 이력을 돌려준다', async () => {
    mockList.mockResolvedValue({ a: [], b: [] });
    const res = await GET(get('?studentIds=a,b,a'));
    expect(mockList).toHaveBeenCalledWith(['a', 'b']);
    expect((await res.json()).data.byStudent).toEqual({ a: [], b: [] });
  });
});

describe('POST /api/staff/contacts', () => {
  beforeEach(() => vi.clearAllMocks());

  it('세션이 없으면 401', async () => {
    expect((await POST(post(valid, null))).status).toBe(401);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('직원은 세션에서 채우고 클라이언트가 보낸 staff 값은 무시', async () => {
    mockCreate.mockResolvedValue({ id: 'c1' });
    const res = await POST(post({ ...valid, staffId: 'someone-else', staffName: '다른 사람' }));
    expect(res.status).toBe(201);
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ staffId: 'staff-1', staffName: '신명경', studentId: 's1', note: '문자 발송' }));
  });

  it('필수값이 없거나 날짜가 틀리면 400', async () => {
    expect((await POST(post({ ...valid, studentId: '' }))).status).toBe(400);
    expect((await POST(post({ ...valid, briefingDate: '2026-13-01' }))).status).toBe(400);
  });

  it('메모가 비어 있으면 null로 저장', async () => {
    mockCreate.mockResolvedValue({ id: 'c1' });
    await POST(post({ ...valid, note: '  ', listKey: undefined }));
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ note: null, listKey: null }));
  });

  it('저장 오류는 502', async () => {
    mockCreate.mockRejectedValue(new Error('boom'));
    expect((await POST(post(valid))).status).toBe(502);
  });
});
