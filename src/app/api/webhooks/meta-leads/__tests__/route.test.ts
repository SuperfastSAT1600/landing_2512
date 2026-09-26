// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createHmac } from 'crypto';
import { NextRequest } from 'next/server';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockInsert = vi.hoisted(() => vi.fn());
const mockSelect = vi.hoisted(() => vi.fn());
const mockEq = vi.hoisted(() => vi.fn());
const mockMaybeSingle = vi.hoisted(() => vi.fn());
const mockSingle = vi.hoisted(() => vi.fn());

vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({
      select: mockSelect.mockReturnValue({ eq: mockEq.mockReturnValue({ maybeSingle: mockMaybeSingle }) }),
      insert: mockInsert.mockReturnValue({ select: vi.fn(() => ({ single: mockSingle })) }),
    })),
  },
}));

const mockFetchMetaLeadData = vi.hoisted(() => vi.fn());
vi.mock('@/lib/meta-lead-webhook', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/meta-lead-webhook')>();
  return { ...actual, fetchMetaLeadData: mockFetchMetaLeadData };
});

global.fetch = vi.fn();

// ── Helpers ──────────────────────────────────────────────────────────────────

const APP_SECRET = 'test_app_secret';
const VERIFY_TOKEN = 'test_verify_token';
const ACCESS_TOKEN = 'test_access_token';
const LEADGEN_ID = '123456789';

function makePayload(leadgenId = LEADGEN_ID, adName = 'TestAd') {
  return {
    object: 'page',
    entry: [{
      id: 'page_1',
      time: 1234567890,
      changes: [{
        field: 'leadgen',
        value: { leadgen_id: leadgenId, page_id: 'page_1', ad_name: adName },
      }],
    }],
  };
}

function signedRequest(body: string): NextRequest {
  const sig = 'sha256=' + createHmac('sha256', APP_SECRET).update(body).digest('hex');
  return new NextRequest('https://example.com/api/webhooks/meta-leads', {
    method: 'POST',
    headers: { 'x-hub-signature-256': sig, 'content-type': 'application/json' },
    body,
  });
}

function setEnv() {
  process.env.META_APP_SECRET = APP_SECRET;
  process.env.META_WEBHOOK_VERIFY_TOKEN = VERIFY_TOKEN;
  process.env.FACEBOOK_ACCESS_TOKEN = ACCESS_TOKEN;
  process.env.SLACK_BOT_TOKEN = 'xoxb-test';
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('GET /api/webhooks/meta-leads', () => {
  beforeEach(() => { setEnv(); });

  it('REQ-001: 올바른 verify_token → 200 + challenge 반환', async () => {
    const { GET } = await import('../route');
    const req = new NextRequest(
      `https://example.com/api/webhooks/meta-leads?hub.mode=subscribe&hub.verify_token=${VERIFY_TOKEN}&hub.challenge=abc123`,
    );
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('abc123');
  });

  it('REQ-001: 잘못된 verify_token → 403', async () => {
    const { GET } = await import('../route');
    const req = new NextRequest(
      `https://example.com/api/webhooks/meta-leads?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=abc123`,
    );
    const res = await GET(req);
    expect(res.status).toBe(403);
  });
});

describe('POST /api/webhooks/meta-leads', () => {
  beforeEach(() => {
    setEnv();
    vi.clearAllMocks();
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    });
  });

  it('REQ-002: 잘못된 서명 → 400', async () => {
    const { POST } = await import('../route');
    const req = new NextRequest('https://example.com/api/webhooks/meta-leads', {
      method: 'POST',
      headers: { 'x-hub-signature-256': 'sha256=invalidsig', 'content-type': 'application/json' },
      body: JSON.stringify(makePayload()),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('REQ-002: 서명 없음 → 400', async () => {
    const { POST } = await import('../route');
    const req = new NextRequest('https://example.com/api/webhooks/meta-leads', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(makePayload()),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('REQ-003: Graph API 조회 후 이름·전화번호 파싱', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null });
    mockSingle.mockResolvedValue({ data: { id: 'stu_1' }, error: null });
    mockFetchMetaLeadData.mockResolvedValue({
      id: LEADGEN_ID,
      field_data: [
        { name: 'full_name', values: ['홍길동'] },
        { name: 'phone_number', values: ['010-1234-5678'] },
      ],
    });

    const { POST } = await import('../route');
    const body = JSON.stringify(makePayload());
    const res = await POST(signedRequest(body));
    expect(res.status).toBe(200);
    expect(mockFetchMetaLeadData).toHaveBeenCalledWith(LEADGEN_ID, ACCESS_TOKEN);
  });

  it('REQ-004: DB에 인스타그램 광고 학생 삽입', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null });
    mockSingle.mockResolvedValue({ data: { id: 'stu_1' }, error: null });
    mockFetchMetaLeadData.mockResolvedValue({
      id: LEADGEN_ID,
      field_data: [{ name: 'full_name', values: ['홍길동'] }],
    });

    const { POST } = await import('../route');
    const body = JSON.stringify(makePayload());
    await POST(signedRequest(body));

    expect(mockInsert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          traffic_source: '인스타그램 광고',
          inquiry_channel: '인스타그램 링크',
          entered_by: 'meta-webhook',
          meta_lead_id: LEADGEN_ID,
        }),
      ]),
    );
  });

  it('REQ-005: Slack postMessage 호출', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null });
    mockSingle.mockResolvedValue({ data: { id: 'stu_1' }, error: null });
    mockFetchMetaLeadData.mockResolvedValue({
      id: LEADGEN_ID,
      field_data: [{ name: 'full_name', values: ['홍길동'] }],
    });

    const { POST } = await import('../route');
    const body = JSON.stringify(makePayload());
    await POST(signedRequest(body));

    expect(global.fetch).toHaveBeenCalledWith(
      'https://slack.com/api/chat.postMessage',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('REQ-006: 중복 leadgen_id → 200 skip', async () => {
    mockMaybeSingle.mockResolvedValue({ data: { id: 'existing' } });

    const { POST } = await import('../route');
    const body = JSON.stringify(makePayload());
    const res = await POST(signedRequest(body));
    expect(res.status).toBe(200);
    const json = await res.json() as { results: { status: string }[] };
    expect(json.results[0].status).toBe('skipped_duplicate');
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('REQ-007: Graph API 실패 → 500', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null });
    mockFetchMetaLeadData.mockRejectedValue(new Error('Meta API 502'));

    const { POST } = await import('../route');
    const body = JSON.stringify(makePayload());
    const res = await POST(signedRequest(body));
    expect(res.status).toBe(500);
  });

  it('leadgen 필드가 없는 payload → 200 skip', async () => {
    const payload = { object: 'page', entry: [{ id: 'p1', changes: [{ field: 'feed', value: {} }] }] };
    const body = JSON.stringify(payload);
    const { POST } = await import('../route');
    const res = await POST(signedRequest(body));
    expect(res.status).toBe(200);
    const json = await res.json() as { skipped: string };
    expect(json.skipped).toContain('no leadgen');
  });
});
