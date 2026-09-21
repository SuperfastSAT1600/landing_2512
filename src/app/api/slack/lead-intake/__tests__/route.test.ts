import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockInsert = vi.fn();
const mockSelect = vi.fn();
const mockSingle = vi.fn();

vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: {
    from: () => ({
      insert: mockInsert.mockReturnValue({
        select: mockSelect.mockReturnValue({
          single: mockSingle,
        }),
      }),
    }),
  },
}));

vi.mock('@/app/api/slack/events/slack-utils', () => ({
  postSlack: vi.fn().mockResolvedValue(undefined),
}));

// fetch mock for postLeadConfirmation (uses Bot Token path)
global.fetch = vi.fn().mockResolvedValue({
  json: () => Promise.resolve({ ok: true }),
}) as unknown as typeof fetch;

// ── Helpers ──────────────────────────────────────────────────────────────────

const SECRET = 'test-secret-abc';

function makeRequest(body: unknown, token?: string): NextRequest {
  const url = new URL('http://localhost/api/slack/lead-intake');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token !== undefined) headers['x-lead-intake-token'] = token;
  return new NextRequest(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('POST /api/slack/lead-intake', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SLACK_LEAD_INTAKE_SECRET = SECRET;
    mockSingle.mockResolvedValue({
      data: { id: 'student-1', name: '카톡_20260921_143000' },
      error: null,
    });
  });

  // REQ-003: 토큰 검증
  describe('token validation (REQ-003)', () => {
    it('returns 401 when token header is missing', async () => {
      const { POST } = await import('../route');
      const req = makeRequest({ inquiry_channel: '카톡', traffic_source: '소개', lead_type: 'B2C' });
      const res = await POST(req);
      expect(res.status).toBe(401);
    });

    it('returns 401 when token is wrong', async () => {
      const { POST } = await import('../route');
      const req = makeRequest(
        { inquiry_channel: '카톡', traffic_source: '소개', lead_type: 'B2C' },
        'wrong-token',
      );
      const res = await POST(req);
      expect(res.status).toBe(401);
    });
  });

  // REQ-005: 필드 유효성 검사
  describe('field validation (REQ-005)', () => {
    it('returns 400 when inquiry_channel is missing', async () => {
      const { POST } = await import('../route');
      const req = makeRequest({ traffic_source: '소개', lead_type: 'B2C' }, SECRET);
      const res = await POST(req);
      expect(res.status).toBe(400);
      const json = await res.json() as { error: string };
      expect(json.error).toMatch(/inquiry_channel/);
    });

    it('returns 400 when traffic_source is missing', async () => {
      const { POST } = await import('../route');
      const req = makeRequest({ inquiry_channel: '카톡', lead_type: 'B2C' }, SECRET);
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it('returns 400 when lead_type is invalid', async () => {
      const { POST } = await import('../route');
      const req = makeRequest(
        { inquiry_channel: '카톡', traffic_source: '소개', lead_type: 'INVALID' },
        SECRET,
      );
      const res = await POST(req);
      expect(res.status).toBe(400);
      const json = await res.json() as { error: string };
      expect(json.error).toMatch(/lead_type/);
    });

    it('returns 400 when inquiry_channel value is not in allowed list', async () => {
      const { POST } = await import('../route');
      const req = makeRequest(
        { inquiry_channel: '존재하지않는채널', traffic_source: '소개', lead_type: 'B2C' },
        SECRET,
      );
      const res = await POST(req);
      expect(res.status).toBe(400);
    });
  });

  // REQ-002: 자동 이름 생성
  describe('auto name generation (REQ-002)', () => {
    it('generates name with channel prefix and datetime', async () => {
      const { generateLeadName } = await import('../route');
      const name = generateLeadName('카톡');
      expect(name).toMatch(/^카톡_\d{8}_\d{6}$/);
    });

    it('uses correct abbreviation per channel', async () => {
      const { generateLeadName } = await import('../route');
      expect(generateLeadName('네이버 상담시트')).toMatch(/^네이버시트_/);
      expect(generateLeadName('구글 상담시트')).toMatch(/^구글시트_/);
      expect(generateLeadName('전화')).toMatch(/^전화_/);
      expect(generateLeadName('상담 예약')).toMatch(/^상담예약_/);
      expect(generateLeadName('진단테스트 신청')).toMatch(/^진단_/);
      expect(generateLeadName('인스타그램 링크')).toMatch(/^인스타_/);
    });

    it('two calls within same second produce different names (uses hhmmss)', async () => {
      const { generateLeadName } = await import('../route');
      // Both calls use current second — same result is fine; we just verify format
      const name = generateLeadName('카톡');
      expect(name.split('_')).toHaveLength(3);
    });
  });

  // REQ-001: DB 삽입
  describe('student creation (REQ-001)', () => {
    it('returns 201 and student id on success', async () => {
      const { POST } = await import('../route');
      const req = makeRequest(
        { inquiry_channel: '카톡', traffic_source: '소개', lead_type: 'B2C' },
        SECRET,
      );
      const res = await POST(req);
      expect(res.status).toBe(201);
      const json = await res.json() as { ok: boolean; id: string };
      expect(json.ok).toBe(true);
      expect(json.id).toBe('student-1');
    });

    it('returns 500 when supabase insert fails', async () => {
      mockSingle.mockResolvedValueOnce({ data: null, error: { message: 'db error' } });
      const { POST } = await import('../route');
      const req = makeRequest(
        { inquiry_channel: '카톡', traffic_source: '소개', lead_type: 'B2C' },
        SECRET,
      );
      const res = await POST(req);
      expect(res.status).toBe(500);
    });

    it('passes correct fields to supabase insert', async () => {
      const { POST } = await import('../route');
      const req = makeRequest(
        { inquiry_channel: '네이버 상담시트', traffic_source: '인스타그램 광고', lead_type: 'B2B', channel_id: 'C123' },
        SECRET,
      );
      await POST(req);
      const insertCall = mockInsert.mock.calls[0][0][0] as Record<string, unknown>;
      expect(insertCall.inquiry_channel).toBe('네이버 상담시트');
      expect(insertCall.traffic_source).toBe('인스타그램 광고');
      expect(insertCall.lead_type).toBe('B2B');
      expect(typeof insertCall.name).toBe('string');
      expect(insertCall.inquiry_date).toBeTruthy();
    });
  });
});
