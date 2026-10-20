import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const db = vi.hoisted(() => ({
  studentExists: vi.fn(),
  findActiveCoaches: vi.fn(),
  upsertRequests: vi.fn(),
  listRequests: vi.fn(),
  selectRequest: vi.fn(),
}));
vi.mock('@/lib/coach-prep-requests-db', () => db);

process.env.ADMIN_SECRET_KEY = 'admin-key';

const params = Promise.resolve({ id: 'stu-1' });
const FUTURE = '2099-01-01T10:00:00+09:00';

function req(method: string, body?: unknown, key: string | null = 'admin-key') {
  return new NextRequest('http://localhost/api/crm/students/stu-1/coach-requests', {
    method,
    headers: { ...(key ? { 'x-admin-key': key } : {}), 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

const view = (slug: string, name: string) => ({
  id: `r-${slug}`, student_id: 'stu-1', coach_slug: slug, coach_name: name, token: `tok-${slug}`,
  deadline_at: FUTURE, status: 'pending', first_lesson_at: null, second_lesson_at: null,
  option2_first_lesson_at: null, option2_second_lesson_at: null, decline_reason: null,
  first_opened_at: null, responded_at: null, selected_at: null, created_at: '2026-10-20T00:00:00Z',
});

beforeEach(() => {
  vi.clearAllMocks();
  db.studentExists.mockResolvedValue(true);
});

describe('POST /api/crm/students/[id]/coach-requests', () => {
  // REQ-003
  it('x-admin-key가 없거나 틀리면 401', async () => {
    const { POST } = await import('../route');
    const res = await POST(req('POST', { coach_slugs: ['a'], deadline_at: FUTURE }, 'wrong'), { params });
    expect(res.status).toBe(401);
    expect((await res.json()).error.code).toBe('UNAUTHORIZED');
  });

  it('잘못된 JSON은 400 INVALID_JSON', async () => {
    const { POST } = await import('../route');
    const bad = new NextRequest('http://localhost/x', { method: 'POST', headers: { 'x-admin-key': 'admin-key' }, body: '{nope' });
    const res = await POST(bad, { params });
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe('INVALID_JSON');
  });

  it('검증 실패는 400 VALIDATION_ERROR와 첫 번째 메시지', async () => {
    const { POST } = await import('../route');
    const res = await POST(req('POST', { coach_slugs: [], deadline_at: FUTURE }), { params });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe('VALIDATION_ERROR');
    expect(json.error.message).toContain('코치');
  });

  it('학생이 없으면 404 STUDENT_NOT_FOUND', async () => {
    db.studentExists.mockResolvedValue(false);
    const { POST } = await import('../route');
    const res = await POST(req('POST', { coach_slugs: ['a'], deadline_at: FUTURE }), { params });
    expect(res.status).toBe(404);
    expect((await res.json()).error.code).toBe('STUDENT_NOT_FOUND');
  });

  it('없거나 비활성인 코치가 섞이면 400 COACH_NOT_FOUND이고 아무것도 만들지 않는다', async () => {
    db.findActiveCoaches.mockResolvedValue([{ slug: 'a', name: '김혜지' }]);
    const { POST } = await import('../route');
    const res = await POST(req('POST', { coach_slugs: ['a', 'ghost'], deadline_at: FUTURE }), { params });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe('COACH_NOT_FOUND');
    expect(json.error.message).toContain('ghost');
    expect(db.upsertRequests).not.toHaveBeenCalled();
  });

  it('성공하면 코치별 요청을 data.requests와 meta.requestId로 돌려준다', async () => {
    db.findActiveCoaches.mockResolvedValue([{ slug: 'a', name: '김혜지' }, { slug: 'b', name: '유승준' }]);
    db.upsertRequests.mockResolvedValue([view('a', '김혜지'), view('b', '유승준')]);
    const { POST } = await import('../route');
    const res = await POST(req('POST', { coach_slugs: ['a', 'b'], deadline_at: FUTURE }), { params });

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data.requests.map((r: { coach_name: string }) => r.coach_name)).toEqual(['김혜지', '유승준']);
    expect(typeof json.meta.requestId).toBe('string');
    expect(db.upsertRequests).toHaveBeenCalledWith('stu-1', [{ slug: 'a', name: '김혜지' }, { slug: 'b', name: '유승준' }], FUTURE);
  });
});

describe('GET /api/crm/students/[id]/coach-requests', () => {
  // REQ-003
  it('인증 없이는 401', async () => {
    const { GET } = await import('../route');
    expect((await GET(req('GET', undefined, null), { params })).status).toBe(401);
  });

  it('요청 목록을 data.requests로 돌려준다', async () => {
    db.listRequests.mockResolvedValue([view('a', '김혜지')]);
    const { GET } = await import('../route');
    const res = await GET(req('GET'), { params });
    expect(res.status).toBe(200);
    expect((await res.json()).data.requests).toHaveLength(1);
    expect(db.listRequests).toHaveBeenCalledWith('stu-1');
  });
});

describe('PATCH /api/crm/students/[id]/coach-requests/[requestId]', () => {
  const p = Promise.resolve({ id: 'stu-1', requestId: 'r-a' });
  const patch = (body: unknown, key: string | null = 'admin-key') =>
    new NextRequest('http://localhost/x', {
      method: 'PATCH',
      headers: { ...(key ? { 'x-admin-key': key } : {}), 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

  // REQ-006
  it('인증 없이는 401', async () => {
    const { PATCH } = await import('../[requestId]/route');
    expect((await PATCH(patch({ selected: true }, null), { params: p })).status).toBe(401);
  });

  it('수락한 코치를 선택하면 200', async () => {
    db.selectRequest.mockResolvedValue('ok');
    const { PATCH } = await import('../[requestId]/route');
    const res = await PATCH(patch({ selected: true }), { params: p });
    expect(res.status).toBe(200);
    expect(db.selectRequest).toHaveBeenCalledWith('stu-1', 'r-a');
  });

  it('수락하지 않은 코치는 409 NOT_ACCEPTED', async () => {
    db.selectRequest.mockResolvedValue('not_accepted');
    const { PATCH } = await import('../[requestId]/route');
    const res = await PATCH(patch({ selected: true }), { params: p });
    expect(res.status).toBe(409);
    expect((await res.json()).error.code).toBe('NOT_ACCEPTED');
  });

  it('동시에 다른 선택이 끼어들면 409 SELECTION_CONFLICT', async () => {
    db.selectRequest.mockResolvedValue('conflict');
    const { PATCH } = await import('../[requestId]/route');
    const res = await PATCH(patch({ selected: true }), { params: p });
    expect(res.status).toBe(409);
    expect((await res.json()).error.code).toBe('SELECTION_CONFLICT');
  });

  it('없는 요청은 404', async () => {
    db.selectRequest.mockResolvedValue('not_found');
    const { PATCH } = await import('../[requestId]/route');
    const res = await PATCH(patch({ selected: true }), { params: p });
    expect(res.status).toBe(404);
  });

  it('selected가 true가 아니면 400', async () => {
    const { PATCH } = await import('../[requestId]/route');
    expect((await PATCH(patch({ selected: false }), { params: p })).status).toBe(400);
  });
});
