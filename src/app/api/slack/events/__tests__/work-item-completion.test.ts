// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('next/server', async (orig) => ({ ...(await orig<typeof import('next/server')>()), after: (fn: () => unknown) => fn() }));
vi.mock('@/lib/supabase-admin', () => ({ supabaseAdmin: {} }));
vi.mock('@/lib/assignment-checklist-store', () => ({ createChecklist: vi.fn() }));

const handleDoneReaction = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
vi.mock('@/lib/work-item-completions', async (orig) => ({
  ...(await orig<typeof import('@/lib/work-item-completions')>()), handleDoneReaction,
}));

const fetchMock = vi.fn();
global.fetch = fetchMock as unknown as typeof fetch;

import { POST } from '../route';

const eventRequest = (event: Record<string, unknown>) => new NextRequest('http://localhost/api/slack/events', {
  method: 'POST', body: JSON.stringify({ type: 'event_callback', event }),
});

const reaction = {
  type: 'reaction_added', user: 'U3CCC', reaction: 'white_check_mark',
  item: { type: 'message', channel: 'C0C9B0DEGDN', ts: '100.1' }, event_ts: '200.2',
};

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.SLACK_SIGNING_SECRET;
});

describe('events: 할 일 완료 시각 (REQ-004)', () => {
  it('업무 채널 ✅ 반응을 완료 기록으로 넘긴다', async () => {
    const res = await POST(eventRequest(reaction));
    expect(res.status).toBe(200);
    expect(handleDoneReaction).toHaveBeenCalledWith(reaction);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('다른 반응은 무시한다', async () => {
    await POST(eventRequest({ ...reaction, reaction: 'eyes' }));
    expect(handleDoneReaction).not.toHaveBeenCalled();
  });
});
