import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mockLoad = vi.fn();
const mockList = vi.fn();
vi.mock('@/app/api/cron/schedule-input-status/briefing-store', () => ({
  loadBriefing: (...a: unknown[]) => mockLoad(...a),
  listBriefingDates: (...a: unknown[]) => mockList(...a),
}));

process.env.STAFF_SESSION_SECRET = 'test-secret';
const { createStaffSessionToken } = await import('@/lib/staff-session');
const { GET } = await import('../route');

const session = createStaffSessionToken({ id: 'u1', name: '직원', role: 'staff' });
const req = (query = '', cookie: string | null = `staff_session=${session}`) =>
  new NextRequest(`http://localhost/api/staff/briefing${query}`, { headers: cookie ? { cookie } : {} });

// REQ-003
describe('GET /api/staff/briefing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockList.mockResolvedValue(['2026-10-22', '2026-10-21']);
  });

  it('세션이 없으면 401', async () => {
    expect((await GET(req('?date=2026-10-22', null))).status).toBe(401);
    expect(mockLoad).not.toHaveBeenCalled();
  });

  it('날짜 형식이 틀리면 400', async () => {
    expect((await GET(req('?date=10-22'))).status).toBe(400);
    expect((await GET(req('?date=2026-02-31'))).status).toBe(400);
  });

  it('해당 날짜 저장본을 날짜 목록과 함께 돌려준다', async () => {
    mockLoad.mockResolvedValue({ generatedAt: 'x', endingSoon: [], noSchedule: [], neverScheduled: [], coaches: [] });
    const res = await GET(req('?date=2026-10-21'));
    expect(res.status).toBe(200);
    expect(mockLoad).toHaveBeenCalledWith('2026-10-21');
    expect((await res.json()).data).toMatchObject({ date: '2026-10-21', availableDates: ['2026-10-22', '2026-10-21'] });
  });

  it('date가 없으면 가장 최근 날짜', async () => {
    mockLoad.mockResolvedValue({ generatedAt: 'x', endingSoon: [], noSchedule: [], neverScheduled: [], coaches: [] });
    await GET(req());
    expect(mockLoad).toHaveBeenCalledWith('2026-10-22');
  });

  it('저장본이 없으면 404', async () => {
    mockLoad.mockResolvedValue(null);
    expect((await GET(req('?date=2026-01-01'))).status).toBe(404);
  });

  it('조회 오류는 502', async () => {
    mockList.mockRejectedValue(new Error('boom'));
    expect((await GET(req())).status).toBe(502);
  });
});
