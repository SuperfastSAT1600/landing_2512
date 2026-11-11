// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({ staff: vi.fn(), compute: vi.fn(), dismissals: vi.fn() }));
vi.mock('@/lib/staff-request', () => ({ getStaffUser: mocks.staff }));
vi.mock('@/app/api/cron/schedule-input-status/compute', () => ({ computeScheduleBriefing: mocks.compute }));
vi.mock('@/lib/work-log-dismissals', () => ({ listDismissals: mocks.dismissals }));

import { GET } from '../route';

const req = () => new NextRequest('http://localhost/api/staff/contact-tasks');

beforeEach(() => {
  vi.clearAllMocks();
  mocks.staff.mockReturnValue({ id: 's1', name: '알바' });
  mocks.compute.mockResolvedValue({ briefing: { endingSoon: [], noSchedule: [], neverScheduled: [] }, coachRatios: [] });
  mocks.dismissals.mockResolvedValue({ s9: { name: '가나다', by: '알바B', at: '2026-11-11T01:00:00.000Z' } });
});

describe('GET /api/staff/contact-tasks (REQ-008)', () => {
  it('세션이 없으면 401', async () => {
    mocks.staff.mockReturnValue(null);
    expect((await GET(req())).status).toBe(401);
    expect(mocks.compute).not.toHaveBeenCalled();
  });

  it('요청 시각 기준으로 tutoring 데이터를 다시 계산해 연락 업무를 만든다', async () => {
    const before = Date.now();
    const { data } = await (await GET(req())).json();
    const now = mocks.compute.mock.calls[0][0] as Date;
    expect(now.getTime()).toBeGreaterThanOrEqual(before);
    expect(data.generatedAt).toBe(now.toISOString());
    expect(data).toMatchObject({ students: [], coaches: [] });
  });

  it('삭제한 학생·코치 기록을 함께 돌려준다 (REQ-009)', async () => {
    const { data } = await (await GET(req())).json();
    expect(mocks.dismissals).toHaveBeenCalledWith('contact');
    expect(data.dismissed).toEqual({ s9: { name: '가나다', by: '알바B', at: '2026-11-11T01:00:00.000Z' } });
  });

  it('계산이 실패하면 502', async () => {
    mocks.compute.mockRejectedValue(new Error('x'));
    expect((await GET(req())).status).toBe(502);
  });
});
