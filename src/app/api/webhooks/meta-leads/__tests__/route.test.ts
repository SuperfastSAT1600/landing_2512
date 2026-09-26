// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createHmac } from 'crypto';
import { NextRequest } from 'next/server';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockInsert = vi.hoisted(() => vi.fn());
const mockSelect = vi.hoisted(() => vi.fn());
const mockEq = vi.hoisted(() => vi.fn());
const mockMaybeSingle = vi.hoisted(() => vi.fn());

vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({
      select: mockSelect.mockReturnValue({ eq: mockEq.mockReturnValue({ maybeSingle: mockMaybeSingle }) }),
      insert: mockInsert.mockResolvedValue({ error: null }),
    })),
  },
}));

const mockFetchMetaLeadData = vi.hoisted(() => vi.fn());
const mockFetchAdTimezone = vi.hoisted(() => vi.fn());
const mockFetchFormLabels = vi.hoisted(() => vi.fn());
const mockSendSlackLeadWebhook = vi.hoisted(() => vi.fn());

vi.mock('@/lib/meta-lead-webhook', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/meta-lead-webhook')>();
  return {
    ...actual,
    fetchMetaLeadData: mockFetchMetaLeadData,
    fetchAdTimezone: mockFetchAdTimezone,
    fetchFormLabels: mockFetchFormLabels,
    sendSlackLeadWebhook: mockSendSlackLeadWebhook,
  };
});

// ── Helpers ──────────────────────────────────────────────────────────────────

const APP_SECRET = 'test_app_secret';
const VERIFY_TOKEN = 'test_verify_token';
const ACCESS_TOKEN = 'test_access_token';
const LEADGEN_ID = '123456789';
const FORM_ID = 'form_abc';
const AD_ID = 'ad_xyz';

function makePayload(leadgenId = LEADGEN_ID) {
  return {
    object: 'page',
    entry: [{
      id: 'page_1',
      time: 1234567890,
      changes: [{
        field: 'leadgen',
        value: { leadgen_id: leadgenId, page_id: 'page_1', ad_name: 'TestAd' },
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

function makeLeadData(overrides = {}) {
  return {
    id: LEADGEN_ID,
    created_time: '2026-09-24T00:28:58+0000',
    field_data: [
      { name: 'full_name', values: ['홍길동'] },
      { name: 'phone_number', values: ['01012345678'] },
    ],
    form_id: FORM_ID,
    ad_id: AD_ID,
    ad_name: 'TestAd',
    campaign_name: 'TestCampaign',
    ...overrides,
  };
}

function setEnv() {
  process.env.META_APP_SECRET = APP_SECRET;
  process.env.META_WEBHOOK_VERIFY_TOKEN = VERIFY_TOKEN;
  process.env.META_PAGE_ACCESS_TOKEN = ACCESS_TOKEN;
  process.env.SLACK_LEADS_WEBHOOK_URL = 'https://hooks.slack.com/test';
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
    mockMaybeSingle.mockResolvedValue({ data: null });
    mockInsert.mockResolvedValue({ error: null });
    mockFetchAdTimezone.mockResolvedValue('America/New_York');
    mockFetchFormLabels.mockResolvedValue(new Map([['full_name', '이름'], ['phone_number', '연락처']]));
    mockSendSlackLeadWebhook.mockResolvedValue(undefined);
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

  it('REQ-A01: Graph API 확장 필드 조회', async () => {
    mockFetchMetaLeadData.mockResolvedValue(makeLeadData());
    const { POST } = await import('../route');
    const body = JSON.stringify(makePayload());
    const res = await POST(signedRequest(body));
    expect(res.status).toBe(200);
    expect(mockFetchMetaLeadData).toHaveBeenCalledWith(LEADGEN_ID, ACCESS_TOKEN);
  });

  it('REQ-A02: 광고 계정 시간대 조회', async () => {
    mockFetchMetaLeadData.mockResolvedValue(makeLeadData());
    const { POST } = await import('../route');
    await POST(signedRequest(JSON.stringify(makePayload())));
    expect(mockFetchAdTimezone).toHaveBeenCalledWith(AD_ID, ACCESS_TOKEN);
  });

  it('REQ-A02: ad_id 없으면 시간대 조회 안 함', async () => {
    mockFetchMetaLeadData.mockResolvedValue(makeLeadData({ ad_id: undefined }));
    const { POST } = await import('../route');
    await POST(signedRequest(JSON.stringify(makePayload())));
    expect(mockFetchAdTimezone).not.toHaveBeenCalled();
  });

  it('REQ-A03: 폼 질문 라벨 조회', async () => {
    mockFetchMetaLeadData.mockResolvedValue(makeLeadData());
    const { POST } = await import('../route');
    await POST(signedRequest(JSON.stringify(makePayload())));
    expect(mockFetchFormLabels).toHaveBeenCalledWith(FORM_ID, ACCESS_TOKEN);
  });

  it('REQ-A04: Slack Incoming Webhook 호출', async () => {
    mockFetchMetaLeadData.mockResolvedValue(makeLeadData());
    const { POST } = await import('../route');
    await POST(signedRequest(JSON.stringify(makePayload())));
    expect(mockSendSlackLeadWebhook).toHaveBeenCalledWith(
      expect.any(String),
      'https://hooks.slack.com/test',
    );
  });

  it('REQ-A04: Slack 메시지에 크리에이티브·캠페인 포함', async () => {
    mockFetchMetaLeadData.mockResolvedValue(makeLeadData());
    const { POST } = await import('../route');
    await POST(signedRequest(JSON.stringify(makePayload())));
    const text = mockSendSlackLeadWebhook.mock.calls[0][0] as string;
    expect(text).toContain('크리에이티브 : TestAd');
    expect(text).toContain('캠페인 : TestCampaign');
    expect(text).toContain('----');
  });

  it('REQ-A04: 연락처 앞에 p: 붙음', async () => {
    mockFetchMetaLeadData.mockResolvedValue(makeLeadData());
    const { POST } = await import('../route');
    await POST(signedRequest(JSON.stringify(makePayload())));
    const text = mockSendSlackLeadWebhook.mock.calls[0][0] as string;
    expect(text).toContain('연락처:p:01012345678');
  });

  it('REQ-A04: ad_name/campaign_name 없으면 "없음" 표시', async () => {
    mockFetchMetaLeadData.mockResolvedValue(makeLeadData({ ad_name: undefined, campaign_name: undefined }));
    const { POST } = await import('../route');
    await POST(signedRequest(JSON.stringify(makePayload())));
    const text = mockSendSlackLeadWebhook.mock.calls[0][0] as string;
    expect(text).toContain('크리에이티브 : 없음');
    expect(text).toContain('캠페인 : 없음');
  });

  it('REQ-A05: Graph API 실패 → 200 반환 + Slack 오류 알림', async () => {
    mockFetchMetaLeadData.mockRejectedValue(new Error('Meta API 502'));
    const { POST } = await import('../route');
    const res = await POST(signedRequest(JSON.stringify(makePayload())));
    expect(res.status).toBe(200);
    expect(mockSendSlackLeadWebhook).toHaveBeenCalledWith(
      expect.stringContaining('⚠️ 리드 상세 조회 실패'),
      'https://hooks.slack.com/test',
    );
  });

  it('REQ-A05: Slack 전송 실패해도 200 반환', async () => {
    mockFetchMetaLeadData.mockResolvedValue(makeLeadData());
    mockSendSlackLeadWebhook.mockRejectedValue(new Error('Slack down'));
    const { POST } = await import('../route');
    const res = await POST(signedRequest(JSON.stringify(makePayload())));
    expect(res.status).toBe(200);
  });

  it('REQ-006: 중복 leadgen_id → 200 skip', async () => {
    mockMaybeSingle.mockResolvedValue({ data: { id: 'existing' } });
    const { POST } = await import('../route');
    const res = await POST(signedRequest(JSON.stringify(makePayload())));
    expect(res.status).toBe(200);
    const json = await res.json() as { results: { status: string }[] };
    expect(json.results[0].status).toBe('skipped_duplicate');
    expect(mockFetchMetaLeadData).not.toHaveBeenCalled();
  });

  it('leadgen 아닌 field → 200 skip', async () => {
    const payload = { object: 'page', entry: [{ id: 'p1', changes: [{ field: 'feed', value: {} }] }] };
    const body = JSON.stringify(payload);
    const { POST } = await import('../route');
    const res = await POST(signedRequest(body));
    expect(res.status).toBe(200);
    const json = await res.json() as { skipped: string };
    expect(json.skipped).toContain('no leadgen');
  });

  it('REQ-004: DB에 인스타그램 광고 학생 삽입', async () => {
    mockFetchMetaLeadData.mockResolvedValue(makeLeadData());
    const { POST } = await import('../route');
    await POST(signedRequest(JSON.stringify(makePayload())));
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
});

// ── buildLeadSlackText 단위 테스트 ────────────────────────────────────────────

describe('buildLeadSlackText', () => {
  it('REQ-A04: 기본 포맷 검증', async () => {
    const { buildLeadSlackText } = await import('@/lib/meta-lead-webhook');
    const labels = new Map([['full_name', '이름'], ['phone_number', '연락처']]);
    const leadData = {
      id: '1',
      created_time: '2026-09-24T00:28:58+0000',
      field_data: [
        { name: 'full_name', values: ['홍길동'] },
        { name: 'phone_number', values: ['+82101234567'] },
      ],
      form_id: 'f1',
      ad_name: 'TestAd',
      campaign_name: 'TestCampaign',
    };
    const text = buildLeadSlackText({ leadData, localTz: 'America/New_York', labels });
    expect(text).toContain('작성일(한국) :');
    expect(text).toContain('+09:00');
    expect(text).toContain('작성일(현지) :');
    expect(text).toContain('America/New_York');
    expect(text).toContain('크리에이티브 : TestAd');
    expect(text).toContain('캠페인 : TestCampaign');
    expect(text).toContain('이름:홍길동');
    expect(text).toContain('연락처:p:+82101234567');
    expect(text).toContain('----');
  });

  it('REQ-A02: localTz null이면 현지 시간 알 수 없음', async () => {
    const { buildLeadSlackText } = await import('@/lib/meta-lead-webhook');
    const text = buildLeadSlackText({
      leadData: { id: '1', field_data: [] },
      localTz: null,
      labels: new Map(),
    });
    expect(text).toContain('작성일(현지) : 알 수 없음');
  });
});
