// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('next/server', async (orig) => ({ ...(await orig<typeof import('next/server')>()), after: (fn: () => unknown) => fn() }));

vi.mock('@/lib/supabase-admin', () => ({ supabaseAdmin: {} }));

const createChecklist = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
vi.mock('@/lib/assignment-checklist-store', () => ({ createChecklist }));

const fetchMock = vi.fn().mockResolvedValue({ json: () => Promise.resolve({ ok: true, ts: '555.5' }) });
global.fetch = fetchMock as unknown as typeof fetch;

import { POST } from '../route';

function eventRequest(event: Record<string, unknown>, headers: Record<string, string> = {}) {
  return new NextRequest('http://localhost/api/slack/events', {
    method: 'POST',
    headers,
    body: JSON.stringify({ type: 'event_callback', event }),
  });
}

const post = { type: 'message', channel: 'C0C9B0DEGDN', ts: '100.1', text: '코치 배정 필요합니다' };

beforeEach(() => {
  fetchMock.mockClear();
  createChecklist.mockClear();
  process.env.SLACK_BOT_TOKEN = 'xoxb-test';
  delete process.env.SLACK_SIGNING_SECRET;
});

describe('events: 배정 요청 체크리스트 (REQ-003)', () => {
  it('배정 요청 글 스레드에 체크리스트를 한 번 올린다', async () => {
    await POST(eventRequest(post));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body).toMatchObject({ channel: 'C0C9B0DEGDN', thread_ts: '100.1' });
    expect(JSON.stringify(body.blocks)).toContain('assignment_checklist');
  });

  it('게시한 체크리스트를 추적 테이블에 저장한다 (REQ-001)', async () => {
    await POST(eventRequest(post));
    await vi.waitFor(() => expect(createChecklist).toHaveBeenCalledWith('C0C9B0DEGDN', '555.5', '코치 배정 필요합니다'));
  });

  it('워크플로(bot_id) 글도 처리한다', async () => {
    await POST(eventRequest({ ...post, subtype: 'bot_message', bot_id: 'B9' }));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('Slack 재전송은 무시한다', async () => {
    await POST(eventRequest(post, { 'x-slack-retry-num': '1' }));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('스레드 답글은 무시한다', async () => {
    await POST(eventRequest({ ...post, thread_ts: '99.9' }));
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
