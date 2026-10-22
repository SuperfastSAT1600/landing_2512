import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mockGet = vi.fn();
const mockDelete = vi.fn();
vi.mock('@/lib/staff-contacts', () => ({
  getContact: (...a: unknown[]) => mockGet(...a),
  deleteContact: (...a: unknown[]) => mockDelete(...a),
}));

process.env.STAFF_SESSION_SECRET = 'test-secret';
const { createStaffSessionToken } = await import('@/lib/staff-session');
const { DELETE } = await import('../route');

const cookie = `staff_session=${createStaffSessionToken({ id: 'staff-1', name: '신명경', role: 'staff' })}`;
const del = (c: string | null = cookie) =>
  DELETE(new NextRequest('http://localhost/api/staff/contacts/c1', { method: 'DELETE', headers: c ? { cookie: c } : {} }), { params: Promise.resolve({ id: 'c1' }) });

const NOW = new Date('2026-10-22T03:00:00Z'); // 10/22 12:00 KST

// REQ-004
describe('DELETE /api/staff/contacts/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });
  afterEach(() => vi.useRealTimers());

  it('세션이 없으면 401', async () => {
    expect((await del(null)).status).toBe(401);
  });

  it('없는 기록은 404', async () => {
    mockGet.mockResolvedValue(null);
    expect((await del()).status).toBe(404);
  });

  it('본인이 오늘 남긴 기록은 삭제', async () => {
    mockGet.mockResolvedValue({ id: 'c1', staffId: 'staff-1', contactedAt: '2026-10-22T01:00:00Z' });
    expect((await del()).status).toBe(200);
    expect(mockDelete).toHaveBeenCalledWith('c1');
  });

  it('다른 직원의 기록은 403', async () => {
    mockGet.mockResolvedValue({ id: 'c1', staffId: 'staff-2', contactedAt: '2026-10-22T01:00:00Z' });
    expect((await del()).status).toBe(403);
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('어제(KST) 남긴 본인 기록도 403', async () => {
    mockGet.mockResolvedValue({ id: 'c1', staffId: 'staff-1', contactedAt: '2026-10-21T10:00:00Z' }); // 10/21 19:00 KST
    expect((await del()).status).toBe(403);
  });
});
