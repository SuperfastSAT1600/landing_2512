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
const mockFetchAdsetName = vi.hoisted(() => vi.fn());
const mockFetchFormLabels = vi.hoisted(() => vi.fn());
const mockSendSlackLeadWebhook = vi.hoisted(() => vi.fn());
const mockSendSlackLeadMessage = vi.hoisted(() => vi.fn());

vi.mock('@/lib/meta-lead-webhook', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/meta-lead-webhook')>();
  return {
    ...actual,
    fetchMetaLeadData: mockFetchMetaLeadData,
    fetchAdTimezone: mockFetchAdTimezone,
    fetchAdsetName: mockFetchAdsetName,
    fetchFormLabels: mockFetchFormLabels,
    sendSlackLeadWebhook: mockSendSlackLeadWebhook,
    sendSlackLeadMessage: mockSendSlackLeadMessage,
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
    mockFetchAdsetName.mockResolvedValue('TestAdset');
    mockFetchFormLabels.mockResolvedValue(new Map([['full_name', '이름'], ['phone_number', '연락처']]));
    mockSendSlackLeadWebhook.mockResolvedValue(undefined);
    mockSendSlackLeadMessage.mockResolvedValue(undefined);
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

  it('REQ-A02: adset 이름 조회', async () => {
    mockFetchMetaLeadData.mockResolvedValue(makeLeadData());
    const { POST } = await import('../route');
    await POST(signedRequest(JSON.stringify(makePayload())));
    expect(mockFetchAdsetName).toHaveBeenCalledWith(AD_ID, ACCESS_TOKEN);
  });

  it('REQ-A04: Slack Block Kit 메시지 전송', async () => {
    mockFetchMetaLeadData.mockResolvedValue(makeLeadData());
    const { POST } = await import('../route');
    await POST(signedRequest(JSON.stringify(makePayload())));
    expect(mockSendSlackLeadMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.any(String),
        blocks: expect.any(Array),
        webhookUrl: 'https://hooks.slack.com/test',
      }),
    );
  });

  it('REQ-A04: Block Kit 본문에 크리에이티브·광고세트·캠페인 포함', async () => {
    mockFetchMetaLeadData.mockResolvedValue(makeLeadData());
    const { POST } = await import('../route');
    await POST(signedRequest(JSON.stringify(makePayload())));
    const { blocks } = mockSendSlackLeadMessage.mock.calls[0][0] as { blocks: { text?: { text: string } }[] };
    const bodyText = blocks[0]?.text?.text ?? '';
    expect(bodyText).toContain('크리에이티브:* TestAd');
    expect(bodyText).toContain('광고세트:* TestAdset');
    expect(bodyText).toContain('캠페인:* TestCampaign');
  });

  it('REQ-A04: 연락처 앞에 p: 붙음', async () => {
    mockFetchMetaLeadData.mockResolvedValue(makeLeadData());
    const { POST } = await import('../route');
    await POST(signedRequest(JSON.stringify(makePayload())));
    const { blocks } = mockSendSlackLeadMessage.mock.calls[0][0] as { blocks: { text?: { text: string } }[] };
    const bodyText = blocks[0]?.text?.text ?? '';
    expect(bodyText).toContain('p:01012345678');
  });

  it('REQ-A04: ad_name/campaign_name 없으면 "없음" 표시', async () => {
    mockFetchMetaLeadData.mockResolvedValue(makeLeadData({ ad_name: undefined, campaign_name: undefined }));
    mockFetchAdsetName.mockResolvedValue(null);
    const payloadNoAd = {
      object: 'page',
      entry: [{ id: 'page_1', time: 1234567890, changes: [{ field: 'leadgen', value: { leadgen_id: LEADGEN_ID, page_id: 'page_1' } }] }],
    };
    const { POST } = await import('../route');
    await POST(signedRequest(JSON.stringify(payloadNoAd)));
    const { blocks } = mockSendSlackLeadMessage.mock.calls[0][0] as { blocks: { text?: { text: string } }[] };
    const bodyText = blocks[0]?.text?.text ?? '';
    expect(bodyText).toContain('크리에이티브:* 없음');
    expect(bodyText).toContain('캠페인:* 없음');
    expect(bodyText).toContain('광고세트:* 없음');
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
    mockSendSlackLeadMessage.mockRejectedValue(new Error('Slack down'));
    const { POST } = await import('../route');
    const res = await POST(signedRequest(JSON.stringify(makePayload())));
    expect(res.status).toBe(200);
  });

  it('REQ-RETRY-01: ad_id 없으면 재시도 후 ad_name 저장', async () => {
    mockFetchMetaLeadData
      .mockResolvedValueOnce(makeLeadData({ ad_id: undefined, ad_name: undefined, campaign_name: undefined }))
      .mockResolvedValueOnce(makeLeadData());
    const { POST } = await import('../route');
    await POST(signedRequest(JSON.stringify(makePayload())));
    expect(mockFetchMetaLeadData).toHaveBeenCalledTimes(2);
    expect(mockInsert).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ ad_name: 'TestAd', adset_name: 'TestAdset' })]),
    );
  });

  it('REQ-RETRY-02: 재시도 후에도 ad_id 없으면 null로 저장', async () => {
    mockFetchMetaLeadData.mockResolvedValue(makeLeadData({ ad_id: undefined, ad_name: undefined }));
    const payloadNoAdName = {
      object: 'page',
      entry: [{ id: 'page_1', time: 1234567890, changes: [{ field: 'leadgen', value: { leadgen_id: LEADGEN_ID, page_id: 'page_1' } }] }],
    };
    const { POST } = await import('../route');
    await POST(signedRequest(JSON.stringify(payloadNoAdName)));
    expect(mockFetchMetaLeadData).toHaveBeenCalledTimes(2);
    expect(mockInsert).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ ad_name: null })]),
    );
  });

  it('REQ-BUG-01: SLACK_BOT_TOKEN 실패 시 webhookUrl fallback 없음 재현 (버그)', async () => {
    // botToken은 설정되어 있지만 Slack API가 ok:false 반환
    process.env.SLACK_BOT_TOKEN = 'xoxb-expired-token';
    mockFetchMetaLeadData.mockResolvedValue(makeLeadData());
    mockSendSlackLeadMessage.mockRejectedValue(new Error('Slack API error: token_expired'));
    const { POST } = await import('../route');
    await POST(signedRequest(JSON.stringify(makePayload())));
    // 버그: webhookUrl fallback이 없어 sendSlackLeadWebhook도 호출 안 됨
    expect(mockSendSlackLeadWebhook).not.toHaveBeenCalled();
    // 그래도 DB 삽입은 성공
    expect(mockInsert).toHaveBeenCalled();
    delete process.env.SLACK_BOT_TOKEN;
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

  it('REQ-004: DB에 인스타그램 광고 학생 삽입 (ad_name, adset_name 포함)', async () => {
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
          ad_name: 'TestAd',
          adset_name: 'TestAdset',
        }),
      ]),
    );
  });
});

// ── buildLeadSlackBlocks 단위 테스트 ─────────────────────────────────────────

describe('buildLeadSlackBlocks', () => {
  it('REQ-03: Block Kit 구조 — section + accessory button', async () => {
    const { buildLeadSlackBlocks } = await import('@/lib/meta-lead-webhook');
    const labels = new Map([['full_name', '이름'], ['phone_number', '연락처']]);
    const leadData = {
      id: '1',
      created_time: '2026-09-24T00:28:58+0000',
      field_data: [
        { name: 'full_name', values: ['홍길동'] },
        { name: 'phone_number', values: ['01012345678'] },
      ],
      ad_name: 'TestAd',
      campaign_name: 'TestCampaign',
    };
    const { text, blocks } = buildLeadSlackBlocks({ leadData, localTz: 'America/New_York', labels, adsetName: 'TestAdset' });
    expect(text).toContain('TestAd');
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toMatchObject({ type: 'section' });
    const block = blocks[0] as { text: { text: string }; accessory: { url: string } };
    expect(block.text.text).toContain('크리에이티브:* TestAd');
    expect(block.text.text).toContain('광고세트:* TestAdset');
    expect(block.text.text).toContain('캠페인:* TestCampaign');
    expect(block.text.text).toContain('p:01012345678');
    expect(block.accessory.url).toBe('https://tutoring.superfastsat.com/admin/crm');
  });

  it('REQ-03: adsetName null이면 "없음" 표시', async () => {
    const { buildLeadSlackBlocks } = await import('@/lib/meta-lead-webhook');
    const { blocks } = buildLeadSlackBlocks({
      leadData: { id: '1', field_data: [], ad_name: 'Ad' },
      localTz: null,
      labels: new Map(),
      adsetName: null,
    });
    const block = blocks[0] as { text: { text: string } };
    expect(block.text.text).toContain('광고세트:* 없음');
  });
});

// ── sendSlackLeadMessage fallback 단위 테스트 ─────────────────────────────────

describe('sendSlackLeadMessage fallback (unit)', () => {
  afterEach(() => { vi.unstubAllGlobals(); });

  it('REQ-FIX-01: botToken 실패 시 webhookUrl로 fallback 전송', async () => {
    const { sendSlackLeadMessage } = await vi.importActual<typeof import('@/lib/meta-lead-webhook')>('@/lib/meta-lead-webhook');
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ ok: false, error: 'token_expired' }) } as unknown as Response)
      .mockResolvedValueOnce({ ok: true, text: () => Promise.resolve('') } as unknown as Response);
    vi.stubGlobal('fetch', fetchMock);

    await sendSlackLeadMessage({ text: 'test', blocks: [], botToken: 'xoxb-bad', channelId: 'C123', webhookUrl: 'https://hooks.slack.com/fallback' });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][0]).toBe('https://hooks.slack.com/fallback');
  });

  it('REQ-FIX-01: botToken 실패 + webhookUrl 없으면 throw', async () => {
    const { sendSlackLeadMessage } = await vi.importActual<typeof import('@/lib/meta-lead-webhook')>('@/lib/meta-lead-webhook');
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ ok: false, error: 'token_revoked' }) } as unknown as Response);
    vi.stubGlobal('fetch', fetchMock);

    await expect(sendSlackLeadMessage({ text: 'test', blocks: [], botToken: 'xoxb-bad', channelId: 'C123' }))
      .rejects.toThrow('Slack API error: token_revoked');
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
