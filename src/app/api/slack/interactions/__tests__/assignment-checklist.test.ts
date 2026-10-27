// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import crypto from 'crypto';
import { buildChecklistBlocks } from '@/lib/slack-assignment-checklist';

vi.mock('@/lib/supabase-admin', () => ({ supabaseAdmin: {} }));

const fetchMock = vi.fn().mockResolvedValue({ json: () => Promise.resolve({ ok: true }) });
global.fetch = fetchMock as unknown as typeof fetch;

const SECRET = 'test-signing-secret';

function signedRequest(payload: unknown): NextRequest {
  const body = `payload=${encodeURIComponent(JSON.stringify(payload))}`;
  const ts = Math.floor(Date.now() / 1000).toString();
  const sig = 'v0=' + crypto.createHmac('sha256', SECRET).update(`v0:${ts}:${body}`).digest('hex');
  return new NextRequest('http://localhost/api/slack/interactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'x-slack-request-timestamp': ts, 'x-slack-signature': sig },
    body,
  });
}

function togglePayload(prevChecked: Record<string, string>, selected: string[]) {
  return {
    type: 'block_actions',
    user: { name: '홍길동' },
    channel: { id: 'C0C9B0DEGDN' },
    message: { ts: '200.2', blocks: buildChecklistBlocks(prevChecked) },
    response_url: 'https://hooks.slack.com/x',
    actions: [{ action_id: 'assignment_checklist', selected_options: selected.map((value) => ({ value })) }],
  };
}

beforeEach(() => {
  fetchMock.mockClear();
  process.env.SLACK_SIGNING_SECRET = SECRET;
  process.env.SLACK_BOT_TOKEN = 'xoxb-test';
});

describe('interactions: 배정 체크리스트 (REQ-004)', () => {
  it('체크하면 chat.update 로 체크 상태와 사용자를 반영한다', async () => {
    const { POST } = await import('../route');
    const res = await POST(signedRequest(togglePayload({}, ['t1'])));
    expect(res.status).toBe(200);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://slack.com/api/chat.update');
    const body = JSON.parse(init.body);
    expect(body).toMatchObject({ channel: 'C0C9B0DEGDN', ts: '200.2' });
    expect(JSON.stringify(body.blocks)).toContain('홍길동');
    expect(JSON.stringify(body.blocks)).toContain('1/9');
  });

  it('해제하면 해당 항목이 빠진다', async () => {
    const { POST } = await import('../route');
    await POST(signedRequest(togglePayload({ t1: '✔ 김 10/26 09:00' }, [])));
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(JSON.stringify(body.blocks)).toContain('0/9');
    expect(JSON.stringify(body.blocks)).not.toContain('김 10/26');
  });

  it('마지막 항목까지 체크하면 완료 표시가 붙는다', async () => {
    const { POST } = await import('../route');
    const prev = Object.fromEntries(['t1', 't2', 't3', 't4', 't5', 't6', 't7', 't8'].map((id) => [id, '✔ a']));
    await POST(signedRequest(togglePayload(prev, ['t1', 't2', 't3', 't4', 't5', 't6', 't7', 't8', 't9'])));
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(JSON.stringify(body.blocks)).toContain('배정 업무 완료');
  });
});
