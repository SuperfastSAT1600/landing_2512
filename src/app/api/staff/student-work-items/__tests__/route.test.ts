// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({ staff: vi.fn(), list: vi.fn() }));
vi.mock('@/lib/staff-request', () => ({ getStaffUser: mocks.staff }));
vi.mock('@/lib/student-work-items', () => ({ listStudentWorkItems: mocks.list }));

import { GET } from '../route';

const req = (q: string) => new NextRequest(`http://localhost/api/staff/student-work-items${q}`);

beforeEach(() => {
  vi.clearAllMocks();
  mocks.staff.mockReturnValue({ id: 'me', name: '알바' });
  mocks.list.mockResolvedValue({ s1: [{ messageTs: '100.1' }] });
});

describe('GET /api/staff/student-work-items (REQ-007)', () => {
  it('세션이 없으면 401', async () => {
    mocks.staff.mockReturnValue(null);
    expect((await GET(req('?studentIds=s1'))).status).toBe(401);
  });

  it('학생 ID 가 없으면 400', async () => {
    expect((await GET(req(''))).status).toBe(400);
  });

  it('학생별 운영 할 일을 돌려준다(중복 ID 는 한 번만)', async () => {
    const { data } = await (await GET(req('?studentIds=s1,s2,s1'))).json();
    expect(mocks.list).toHaveBeenCalledWith(['s1', 's2']);
    expect(data.byStudent).toEqual({ s1: [{ messageTs: '100.1' }] });
  });

  it('조회가 실패하면 502', async () => {
    mocks.list.mockRejectedValue(new Error('x'));
    expect((await GET(req('?studentIds=s1'))).status).toBe(502);
  });
});
