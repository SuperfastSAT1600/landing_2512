import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockFetch = vi.fn();
vi.mock('@/lib/matching-cleanup-fetch', () => ({ fetchMatchingCleanupInput: () => mockFetch() }));

process.env.ADMIN_SECRET_KEY = 'admin-key';
const req = (key = 'admin-key') => new NextRequest('http://localhost/api/crm/coach-roster/cleanup', { headers: { 'x-admin-key': key } });

// REQ-002 (crm-matching-cleanup-panel)
describe('GET /api/crm/coach-roster/cleanup', () => {
  beforeEach(() => vi.clearAllMocks());

  it('관리자 키가 없으면 401', async () => {
    const { GET } = await import('../route');
    expect((await GET(req('wrong'))).status).toBe(401);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('{ data: { stale, unclear } }를 돌려준다', async () => {
    mockFetch.mockResolvedValue({
      input: {
        coaches: [], matchings: [{ id: 'm1', status: 'active', subject: 'SAT' }, { id: 'm2', status: 'active', subject: 'SAT' }],
        matchingTeachers: [{ matching_id: 'm1', teacher_id: 't1', response: 'accepted' }, { matching_id: 'm2', teacher_id: 't2', response: 'accepted' }],
        matchingStudents: [{ matching_id: 'm1', student_id: 'p1' }, { matching_id: 'm2', student_id: 'p1' }],
        lastEventTeacher: {}, payments: [{ student_id: 'p1', subject: 'SAT', management_status: 'active' }],
        profileNames: { p1: 'Alice', t1: 'T1', t2: 'T2' }, crmStudents: [],
      },
      lessons: { m1: { last: new Date().toISOString(), next: null } },
      meta: {},
      recentCutoff: '2000-01-01T00:00:00Z',
    });
    const { GET } = await import('../route');
    const res = await GET(req());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.stale).toHaveLength(1);
    expect(body.data.stale[0]).toMatchObject({ matchingId: 'm2', coach: 'T2', keepCoaches: ['T1'] });
    expect(body.data.unclear).toEqual([]);
  });

  it('SFv2 오류면 502', async () => {
    mockFetch.mockRejectedValue(new Error('boom'));
    const { GET } = await import('../route');
    expect((await GET(req())).status).toBe(502);
  });
});
