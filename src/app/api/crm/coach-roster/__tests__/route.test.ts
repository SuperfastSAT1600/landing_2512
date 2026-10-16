import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockFetch = vi.fn();
vi.mock('@/lib/coach-roster-fetch', () => ({ fetchCoachRosterInput: () => mockFetch() }));

process.env.ADMIN_SECRET_KEY = 'admin-key';
const req = (key = 'admin-key') => new NextRequest('http://localhost/api/crm/coach-roster', { headers: { 'x-admin-key': key } });

// REQ-002 (crm-coach-roster)
describe('GET /api/crm/coach-roster', () => {
  beforeEach(() => vi.clearAllMocks());

  it('관리자 키가 없으면 401', async () => {
    const { GET } = await import('../route');
    expect((await GET(req('wrong'))).status).toBe(401);
  });

  it('코치별 명단을 { data: { coaches, unassigned } }로 돌려준다', async () => {
    mockFetch.mockResolvedValue({
      coaches: [{ slug: 'ben', name: 'Ben', v2_user_id: 't1', is_active: true, sort_order: 0, created_at: '2026-05-01' }],
      matchings: [{ id: 'm1', status: 'active', subject: 'SAT' }],
      matchingTeachers: [{ matching_id: 'm1', teacher_id: 't1', response: 'accepted' }],
      matchingStudents: [{ matching_id: 'm1', student_id: 'p1' }],
      lastEventTeacher: {},
      payments: [{ student_id: 'p1', subject: 'SAT', management_status: 'active' }],
      profileNames: { p1: 'Alice' },
      crmStudents: [],
    });
    const { GET } = await import('../route');
    const res = await GET(req());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.coaches[0]).toMatchObject({ name: 'Ben', activeCount: 1 });
    expect(body.data.unassigned).toEqual([]);
  });

  it('조회가 실패하면 502', async () => {
    mockFetch.mockRejectedValue(new Error('boom'));
    const { GET } = await import('../route');
    expect((await GET(req())).status).toBe(502);
  });
});
