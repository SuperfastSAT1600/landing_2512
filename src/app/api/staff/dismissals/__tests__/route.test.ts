// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({ staff: vi.fn(), dismiss: vi.fn(), restore: vi.fn() }));
vi.mock('@/lib/staff-request', () => ({ getStaffUser: mocks.staff }));
vi.mock('@/lib/work-log-dismissals', () => ({ DISMISS_KINDS: ['slack', 'contact'], dismiss: mocks.dismiss, restore: mocks.restore }));

import { DELETE, POST } from '../route';

const url = 'http://localhost/api/staff/dismissals';
const req = (method: string, body: unknown) => new NextRequest(url, { method, body: JSON.stringify(body) });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.staff.mockReturnValue({ id: 's1', name: '알바B' });
  mocks.dismiss.mockResolvedValue({ name: '나은', by: '알바B', at: '2026-11-11T02:00:00.000Z' });
});

// REQ-009
describe('POST /api/staff/dismissals', () => {
  it('세션이 없으면 401', async () => {
    mocks.staff.mockReturnValue(null);
    expect((await POST(req('POST', { kind: 'slack', targetKey: '1.1', targetName: 'x' }))).status).toBe(401);
  });

  it('종류가 틀리거나 운영 할 일 키 형식이 틀리면 400', async () => {
    expect((await POST(req('POST', { kind: 'other', targetKey: '1.1', targetName: 'x' }))).status).toBe(400);
    expect((await POST(req('POST', { kind: 'slack', targetKey: 'abc', targetName: 'x' }))).status).toBe(400);
    expect(mocks.dismiss).not.toHaveBeenCalled();
  });

  it('세션 근무자 이름으로 삭제를 기록한다', async () => {
    const res = await POST(req('POST', { kind: 'contact', targetKey: 's1', targetName: '나은' }));
    expect(mocks.dismiss).toHaveBeenCalledWith('contact', 's1', '나은', '알바B');
    expect((await res.json()).data.dismissed).toEqual({ name: '나은', by: '알바B', at: '2026-11-11T02:00:00.000Z' });
  });

  it('저장이 실패하면 502', async () => {
    mocks.dismiss.mockRejectedValue(new Error('x'));
    expect((await POST(req('POST', { kind: 'contact', targetKey: 's1', targetName: '나은' }))).status).toBe(502);
  });
});

describe('DELETE /api/staff/dismissals', () => {
  it('세션이 없으면 401', async () => {
    mocks.staff.mockReturnValue(null);
    expect((await DELETE(req('DELETE', { kind: 'slack', targetKey: '1.1' }))).status).toBe(401);
  });

  it('삭제 기록을 지워 복구한다', async () => {
    const res = await DELETE(req('DELETE', { kind: 'contact', targetKey: 'coach:ben' }));
    expect(res.status).toBe(200);
    expect(mocks.restore).toHaveBeenCalledWith('contact', 'coach:ben');
  });
});
