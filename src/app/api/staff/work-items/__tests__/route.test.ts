// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  staff: vi.fn(), items: vi.fn(), list: vi.fn(), set: vi.fn(), clear: vi.fn(), find: vi.fn(), completions: vi.fn(),
}));
vi.mock('@/lib/staff-request', () => ({ getStaffUser: mocks.staff }));
vi.mock('@/lib/work-log', () => ({ fetchWorkItems: mocks.items }));
vi.mock('@/lib/work-item-students', () => ({
  listWorkItemStudents: mocks.list, setWorkItemStudent: mocks.set, clearWorkItemStudent: mocks.clear, findStudent: mocks.find,
}));

vi.mock('@/lib/work-item-completions', () => ({ listCompletions: mocks.completions }));

import { GET, PUT } from '../route';

const url = 'http://localhost/api/staff/work-items';
const put = (body: unknown) => new NextRequest(url, { method: 'PUT', body: JSON.stringify(body) });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.staff.mockReturnValue({ id: 's1', name: '직원' });
  mocks.items.mockResolvedValue([{ messageTs: '1.1', student: null }, { messageTs: '2.2', student: null }]);
  mocks.list.mockResolvedValue({ '2.2': { id: 'p1', name: '남윤지' } });
  mocks.completions.mockResolvedValue({});
});

describe('GET /api/staff/work-items', () => {
  it('세션이 없으면 401', async () => {
    mocks.staff.mockReturnValue(null);
    expect((await GET(new NextRequest(url))).status).toBe(401);
  });

  it('저장된 학생을 할 일에 붙인다', async () => {
    const { data } = await (await GET(new NextRequest(url))).json();
    expect(data.items).toEqual([
      { messageTs: '1.1', student: null, doneAt: null },
      { messageTs: '2.2', student: { id: 'p1', name: '남윤지' }, doneAt: null },
    ]);
  });

  it('완료된 할 일에만 저장된 완료 시각을 붙인다 (REQ-004)', async () => {
    mocks.items.mockResolvedValue([
      { messageTs: '1.1', done: true, doneAt: null, student: null },
      { messageTs: '2.2', done: false, doneAt: null, student: null },
      { messageTs: '3.3', done: true, doneAt: null, student: null },
    ]);
    mocks.completions.mockResolvedValue({ '1.1': '2026-11-11T05:00:00.000Z', '2.2': '2026-11-10T01:00:00.000Z' });
    const { data } = await (await GET(new NextRequest(url))).json();
    expect(data.items.map((i: { doneAt: string | null }) => i.doneAt)).toEqual(['2026-11-11T05:00:00.000Z', null, null]);
  });

  it('조회가 실패하면 502', async () => {
    mocks.items.mockRejectedValue(new Error('x'));
    expect((await GET(new NextRequest(url))).status).toBe(502);
  });
});

describe('PUT /api/staff/work-items', () => {
  it('세션이 없으면 401', async () => {
    mocks.staff.mockReturnValue(null);
    expect((await PUT(put({ messageTs: '1.1', studentId: 'p1' }))).status).toBe(401);
  });

  it('형식이 틀리면 400', async () => {
    expect((await PUT(put({ messageTs: 'abc', studentId: 'p1' }))).status).toBe(400);
  });

  it('tutoring 학생이 아니면 저장하지 않는다', async () => {
    mocks.find.mockResolvedValue(null);
    expect((await PUT(put({ messageTs: '1.1', studentId: 'x' }))).status).toBe(400);
    expect(mocks.set).not.toHaveBeenCalled();
  });

  it('학생 이름은 서버가 찾은 값으로 저장하고 세션 직원을 기록한다', async () => {
    mocks.find.mockResolvedValue({ id: 'p1', name: '남윤지', email: null });
    const res = await PUT(put({ messageTs: '1.1', studentId: 'p1' }));
    expect((await res.json()).data.student).toEqual({ id: 'p1', name: '남윤지' });
    expect(mocks.set).toHaveBeenCalledWith('1.1', { id: 'p1', name: '남윤지', email: null }, '직원');
  });

  it('studentId 가 null 이면 해제한다', async () => {
    await PUT(put({ messageTs: '1.1', studentId: null }));
    expect(mocks.clear).toHaveBeenCalledWith('1.1');
    expect(mocks.find).not.toHaveBeenCalled();
  });
});
