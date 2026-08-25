// @vitest-environment node
/// <reference types="vitest/globals" />
import { NextRequest } from 'next/server';

const mockFrom = vi.fn();
const mockCookieGet = vi.fn();
const mockLogLeadEvent = vi.fn().mockResolvedValue(true);

vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: { from: (...args: unknown[]) => mockFrom(...args) },
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({ get: mockCookieGet })),
}));

vi.mock('@/lib/lead-events', () => ({
  logLeadEvent: (...args: unknown[]) => mockLogLeadEvent(...args),
  LEAD_EVENT_DEDUP_MINUTES: 30,
}));

vi.mock('@/lib/build-srm-report', () => ({
  buildSrmReport: vi.fn().mockResolvedValue({ weeks: [] }),
}));

function makeChain(result: { data?: unknown; error?: unknown }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  ['select', 'eq'].forEach((m) => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });
  chain['single'] = vi.fn().mockResolvedValue(result);
  return chain;
}

const req = new NextRequest('http://localhost/api/portal/tok/data');
const params = Promise.resolve({ token: 'tok' });

const studentRow = {
  id: 'stu-1',
  name: '홍길동',
  portal_name: null,
  grade: '11th',
  school_type: 'AP',
  desired_subjects: 'Both',
  target_score: 1500,
  target_test_date: null,
  target_score_2: null,
  target_test_date_2: null,
  previous_rw_score: null,
  previous_math_score: null,
  preferred_language: null,
  consultation_timeline: [],
  diagnostic_result_id: null,
  sfv2_profile_id: null,
  created_at: '2026-06-01T00:00:00Z',
};

describe('portal view tracking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLogLeadEvent.mockResolvedValue(true);
  });

  describe('GET /api/portal/[token]/data', () => {
    it('does not log when unauthenticated (401)', async () => {
      mockCookieGet.mockReturnValue(undefined);
      const { GET } = await import('../data/route');
      const res = await GET(req, { params });
      expect(res.status).toBe(401);
      expect(mockLogLeadEvent).not.toHaveBeenCalled();
    });

    it('logs portal_viewed with dedup on a successful fetch', async () => {
      mockCookieGet.mockReturnValue({ value: 'authenticated' });
      mockFrom.mockReturnValue(makeChain({ data: studentRow, error: null }));

      const { GET } = await import('../data/route');
      const res = await GET(req, { params });
      expect(res.status).toBe(200);
      expect(mockLogLeadEvent).toHaveBeenCalledWith('stu-1', 'portal_viewed', {
        dedupMinutes: 30,
      });
    });

    it('does not log when the student is not found (404)', async () => {
      mockCookieGet.mockReturnValue({ value: 'authenticated' });
      mockFrom.mockReturnValue(makeChain({ data: null, error: { message: 'not found' } }));

      const { GET } = await import('../data/route');
      const res = await GET(req, { params });
      expect(res.status).toBe(404);
      expect(mockLogLeadEvent).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/portal/[token]/srm-report', () => {
    it('logs srm_report_viewed on a successful report build', async () => {
      mockCookieGet.mockReturnValue({ value: 'authenticated' });
      mockFrom.mockReturnValue(
        makeChain({ data: { id: 'stu-1', sfv2_profile_id: 'p-1' }, error: null })
      );

      const { GET } = await import('../srm-report/route');
      const res = await GET(req, { params });
      expect(res.status).toBe(200);
      expect(mockLogLeadEvent).toHaveBeenCalledWith('stu-1', 'srm_report_viewed', {
        dedupMinutes: 30,
      });
    });

    it('does not log when there is no v2 profile (404)', async () => {
      mockCookieGet.mockReturnValue({ value: 'authenticated' });
      mockFrom.mockReturnValue(
        makeChain({ data: { id: 'stu-1', sfv2_profile_id: null }, error: null })
      );

      const { GET } = await import('../srm-report/route');
      const res = await GET(req, { params });
      expect(res.status).toBe(404);
      expect(mockLogLeadEvent).not.toHaveBeenCalled();
    });
  });
});
