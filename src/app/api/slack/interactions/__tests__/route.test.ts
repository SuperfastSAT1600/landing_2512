import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import crypto from 'crypto';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockSingle = vi.fn();
vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: {
    from: () => ({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({ single: mockSingle }),
      }),
    }),
  },
}));

global.fetch = vi.fn().mockResolvedValue({
  json: () => Promise.resolve({ ok: true }),
}) as unknown as typeof fetch;

// ── Helpers ──────────────────────────────────────────────────────────────────

const SECRET = 'test-signing-secret';

function makeSlackRequest(body: string): NextRequest {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const sig = 'v0=' + crypto
    .createHmac('sha256', SECRET)
    .update(`v0:${timestamp}:${body}`)
    .digest('hex');
  return new NextRequest('http://localhost/api/slack/interactions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'x-slack-request-timestamp': timestamp,
      'x-slack-signature': sig,
    },
    body,
  });
}

function makePayload(overrides: Record<string, unknown> = {}): string {
  const payload = {
    type: 'block_actions',
    actions: [{ action_id: 'submit_lead', value: 'submit' }],
    channel: { id: 'C07FK85V9PD' },
    message: { ts: '1234567890.123456', blocks: [] },
    response_url: 'https://hooks.slack.com/actions/test',
    state: {
      values: {
        b_channel: { inquiry_channel: { selected_option: { value: '카톡' } } },
        b_source: { traffic_source: { selected_option: { value: '소개' } } },
        b_type: { lead_type: { selected_option: { value: 'B2C' } } },
      },
    },
    ...overrides,
  };
  return `payload=${encodeURIComponent(JSON.stringify(payload))}`;
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('POST /api/slack/interactions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SLACK_SIGNING_SECRET = SECRET;
    process.env.SLACK_BOT_TOKEN = 'xoxb-test';
    mockSingle.mockResolvedValue({
      data: { id: 'student-1', name: '카톡_20260921_143022' },
      error: null,
    });
  });

  // REQ-003: 서명 검증
  describe('signature verification (REQ-003)', () => {
    it('returns 401 for missing signature', async () => {
      const { POST } = await import('../route');
      const req = new NextRequest('http://localhost/api/slack/interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: makePayload(),
      });
      const res = await POST(req);
      expect(res.status).toBe(401);
    });

    it('returns 401 for wrong signature', async () => {
      const { POST } = await import('../route');
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const req = new NextRequest('http://localhost/api/slack/interactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'x-slack-request-timestamp': timestamp,
          'x-slack-signature': 'v0=wrongsignature',
        },
        body: makePayload(),
      });
      const res = await POST(req);
      expect(res.status).toBe(401);
    });
  });

  // REQ-004: 리드 등록 버튼
  describe('submit_lead action (REQ-004)', () => {
    it('returns 200 and creates student on valid payload', async () => {
      const { POST } = await import('../route');
      const body = makePayload();
      const res = await POST(makeSlackRequest(body));
      expect(res.status).toBe(200);
      expect(mockSingle).toHaveBeenCalledOnce();
    });

    it('ignores non-submit actions (dropdown changes)', async () => {
      const { POST } = await import('../route');
      const body = makePayload({ actions: [{ action_id: 'inquiry_channel' }] });
      const res = await POST(makeSlackRequest(body));
      expect(res.status).toBe(200);
      expect(mockSingle).not.toHaveBeenCalled();
    });

    it('returns 500 when DB insert fails', async () => {
      mockSingle.mockResolvedValueOnce({ data: null, error: { message: 'db error' } });
      const { POST } = await import('../route');
      const res = await POST(makeSlackRequest(makePayload()));
      expect(res.status).toBe(500);
    });
  });

  // REQ-006: 미선택 방어
  describe('missing selection guard (REQ-006)', () => {
    it('returns 400 when inquiry_channel not selected', async () => {
      const { POST } = await import('../route');
      const body = makePayload({
        state: {
          values: {
            b_channel: { inquiry_channel: { selected_option: null } },
            b_source: { traffic_source: { selected_option: { value: '소개' } } },
            b_type: { lead_type: { selected_option: { value: 'B2C' } } },
          },
        },
      });
      const res = await POST(makeSlackRequest(body));
      expect(res.status).toBe(400);
      expect(mockSingle).not.toHaveBeenCalled();
    });

    it('returns 400 when traffic_source not selected', async () => {
      const { POST } = await import('../route');
      const body = makePayload({
        state: {
          values: {
            b_channel: { inquiry_channel: { selected_option: { value: '카톡' } } },
            b_source: { traffic_source: { selected_option: null } },
            b_type: { lead_type: { selected_option: { value: 'B2C' } } },
          },
        },
      });
      const res = await POST(makeSlackRequest(body));
      expect(res.status).toBe(400);
    });
  });
});
