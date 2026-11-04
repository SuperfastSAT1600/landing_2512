// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('next/server', async (orig) => ({ ...(await orig<typeof import('next/server')>()), after: (fn: () => unknown) => fn() }));
vi.mock('@/lib/supabase-admin', () => ({ supabaseAdmin: {} }));

const generateTopics = vi.hoisted(() => vi.fn());
vi.mock('../topic-suggester', () => ({ generateTopics, buildTopicMessage: () => 'TOPIC_MESSAGE' }));

const postSlack = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
vi.mock('../slack-utils', async (orig) => ({ ...(await orig<typeof import('../slack-utils')>()), postSlack }));

import { handleTopicSuggest } from '../handlers';
import { POST } from '../route';
import { BLOG_CHANNEL } from '../slack-utils';

beforeEach(() => {
  vi.clearAllMocks();
  generateTopics.mockResolvedValue([{ n: 1, title: 't' }]);
});

describe('handleTopicSuggest', () => {
  it('REQ-001/002: BLOG_CHANNEL 요청도 스레드에 답글을 달고 최상위 게시를 유지한다', async () => {
    await handleTopicSuggest(2, BLOG_CHANNEL, '100.1');
    expect(postSlack).toHaveBeenCalledWith(BLOG_CHANNEL, 'TOPIC_MESSAGE');
    expect(postSlack).toHaveBeenCalledWith(BLOG_CHANNEL, 'TOPIC_MESSAGE', '100.1');
  });

  it('REQ-001: 다른 채널 요청은 BLOG_CHANNEL 최상위 + 요청 스레드에 게시한다', async () => {
    await handleTopicSuggest(2, 'COTHER', '200.2');
    expect(postSlack).toHaveBeenCalledWith(BLOG_CHANNEL, 'TOPIC_MESSAGE');
    expect(postSlack).toHaveBeenCalledWith('COTHER', 'TOPIC_MESSAGE', '200.2');
  });
});

function eventRequest(event: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/slack/events', {
    method: 'POST',
    body: JSON.stringify({ type: 'event_callback', event }),
  });
}

const text = '<@UBOT> 주제 2개 추천해줘';

describe('중복 이벤트 처리', () => {
  it('REQ-003: 같은 ts의 app_mention과 message는 한 번만 처리한다', async () => {
    await POST(eventRequest({ type: 'app_mention', channel: BLOG_CHANNEL, ts: '300.1', text }));
    await POST(eventRequest({ type: 'message', channel: BLOG_CHANNEL, ts: '300.1', text }));
    expect(generateTopics).toHaveBeenCalledTimes(1);
  });

  it('REQ-004: 다른 ts의 이벤트는 각각 처리한다', async () => {
    await POST(eventRequest({ type: 'message', channel: BLOG_CHANNEL, ts: '400.1', text }));
    await POST(eventRequest({ type: 'message', channel: BLOG_CHANNEL, ts: '400.2', text }));
    expect(generateTopics).toHaveBeenCalledTimes(2);
  });
});

describe('기본 주제 개수', () => {
  it('REQ-005: 개수 없이 "주제 추천해줘"하면 2개를 생성한다', async () => {
    await POST(eventRequest({ type: 'message', channel: BLOG_CHANNEL, ts: '500.1', text: '<@UBOT> 블로그 주제 추천해줘' }));
    expect(postSlack).toHaveBeenCalledWith(BLOG_CHANNEL, '주제 2개를 생성 중입니다...', '500.1');
  });
});
