// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createHmac } from 'crypto';
import { NextRequest } from 'next/server';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockUpdate = vi.hoisted(() => vi.fn());
const mockEq = vi.hoisted(() => vi.fn());

vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({
      update: mockUpdate.mockReturnValue({ eq: mockEq.mockResolvedValue({ error: null }) }),
    })),
  },
}));

const mockFetch = vi.hoisted(() => vi.fn());
vi.stubGlobal('fetch', mockFetch);

// ── Helpers ──────────────────────────────────────────────────────────────────

const SIGNING_SECRET = 'test_signing_secret';
const STUDENT_ID = 'student-abc-123';

function makeSlackPayload(actionId = 'reinquiry_restore', value = STUDENT_ID) {
  return JSON.stringify({
    type: 'block_actions',
    actions: [{ action_id: actionId, value }],
    message: { ts: '1234567890.123456', blocks: [{ type: 'section', text: { type: 'mrkdwn', text: '⚠️ *기존 등록 리드 재문의*' } }] },
    channel: { id: 'C07FK85V9PD' },
    user: { name: 'test_user' },
  });
}

function signedRequest(body: string): NextRequest {
  const formBody = `payload=${encodeURIComponent(body)}`;
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const sig = 'v0=' + createHmac('sha256', SIGNING_SECRET)
    .update(`v0:${timestamp}:${formBody}`)
    .digest('hex');
  return new NextRequest('https://example.com/api/webhooks/slack-actions', {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      'x-slack-signature': sig,
      'x-slack-request-timestamp': timestamp,
    },
    body: formBody,
  });
}

function setEnv() {
  process.env.SLACK_SIGNING_SECRET = SIGNING_SECRET;
  process.env.SLACK_BOT_TOKEN = 'xoxb-test-token';
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('POST /api/webhooks/slack-actions', () => {
  beforeEach(() => {
    setEnv();
    vi.clearAllMocks();
    mockUpdate.mockReturnValue({ eq: mockEq.mockResolvedValue({ error: null }) });
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ ok: true }) });
  });

  it('REQ-BTN-05: 잘못된 서명 → 400', async () => {
    const { POST } = await import('../route');
    const req = new NextRequest('https://example.com/api/webhooks/slack-actions', {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        'x-slack-signature': 'v0=invalidsig',
        'x-slack-request-timestamp': Math.floor(Date.now() / 1000).toString(),
      },
      body: `payload=${encodeURIComponent(makeSlackPayload())}`,
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('REQ-BTN-03: reinquiry_restore → DB funnel_stage "0" 업데이트', async () => {
    const { POST } = await import('../route');
    const res = await POST(signedRequest(makeSlackPayload()));
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ funnel_stage: '0', lead_status: 'active' }),
    );
    expect(mockEq).toHaveBeenCalledWith('id', STUDENT_ID);
  });

  it('REQ-BTN-04: reinquiry_restore → chat.update 호출', async () => {
    const { POST } = await import('../route');
    await POST(signedRequest(makeSlackPayload()));
    expect(mockFetch).toHaveBeenCalledWith(
      'https://slack.com/api/chat.update',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('REQ-BTN-02: 알 수 없는 action_id → 200 무시', async () => {
    const { POST } = await import('../route');
    const res = await POST(signedRequest(makeSlackPayload('unknown_action')));
    expect(res.status).toBe(200);
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});

// ── buildLeadSlackBlocks 재문의 버튼 단위 테스트 ──────────────────────────────

describe('buildLeadSlackBlocks — 재문의 actions 블록', () => {
  it('REQ-BTN-01: existingStudentId 있으면 actions 블록 + 버튼 포함', async () => {
    const { buildLeadSlackBlocks } = await import('@/lib/meta-lead-webhook');
    const { blocks } = buildLeadSlackBlocks({
      leadData: { id: '1', field_data: [], ad_name: 'TestAd' },
      localTz: null,
      labels: new Map(),
      adsetName: null,
      existingStudentId: 'student-abc-123',
    });
    expect(blocks).toHaveLength(2);
    const actionsBlock = blocks[1] as { type: string; elements: { action_id: string; value: string }[] };
    expect(actionsBlock.type).toBe('actions');
    expect(actionsBlock.elements[0].action_id).toBe('reinquiry_restore');
    expect(actionsBlock.elements[0].value).toBe('student-abc-123');
  });

  it('REQ-BTN-01: existingStudentId 없으면 actions 블록 없음', async () => {
    const { buildLeadSlackBlocks } = await import('@/lib/meta-lead-webhook');
    const { blocks } = buildLeadSlackBlocks({
      leadData: { id: '1', field_data: [], ad_name: 'TestAd' },
      localTz: null,
      labels: new Map(),
      adsetName: null,
    });
    expect(blocks).toHaveLength(1);
  });
});
