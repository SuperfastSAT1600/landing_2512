// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({ staff: vi.fn(), dates: vi.fn(), load: vi.fn() }));
vi.mock('@/lib/staff-request', () => ({ getStaffUser: mocks.staff }));
vi.mock('@/app/api/cron/schedule-input-status/briefing-store', () => ({ listBriefingDates: mocks.dates, loadBriefing: mocks.load }));

import { GET } from '../route';

const req = () => new NextRequest('http://localhost/api/staff/contact-tasks');
const payload = { generatedAt: '2026-11-10T23:00:00.000Z', endingSoon: [], noSchedule: [], neverScheduled: [], coaches: [] };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.staff.mockReturnValue({ id: 's1', name: '알바' });
  mocks.dates.mockResolvedValue(['2026-11-11', '2026-11-10']);
  mocks.load.mockResolvedValue(payload);
});

describe('GET /api/staff/contact-tasks (REQ-005)', () => {
  it('세션이 없으면 401', async () => {
    mocks.staff.mockReturnValue(null);
    expect((await GET(req())).status).toBe(401);
  });

  it('가장 최근 브리핑으로 연락 업무를 만든다', async () => {
    const { data } = await (await GET(req())).json();
    expect(mocks.load).toHaveBeenCalledWith('2026-11-11');
    expect(data.date).toBe('2026-11-11');
    expect(data.generatedAt).toBe('2026-11-10T23:00:00.000Z');
    expect(data.groups.map((g: { kind: string }) => g.kind)).toEqual(['coachRoom', 'coach', 'endingSoon', 'noSchedule', 'neverScheduled']);
  });

  it('저장된 브리핑이 없으면 404', async () => {
    mocks.dates.mockResolvedValue([]);
    expect((await GET(req())).status).toBe(404);
  });

  it('조회가 실패하면 502', async () => {
    mocks.dates.mockRejectedValue(new Error('x'));
    expect((await GET(req())).status).toBe(502);
  });
});
