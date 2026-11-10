// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchWorkItemsByTs } from '@/lib/work-log';

const messages: Record<string, unknown> = {
  '100.1': { ts: '100.1', user: 'U1AAA', text: '<@U2BBB> 가나다 학생 통화함', reply_count: 1 },
  '300.3': { ts: '300.3', user: 'U2BBB', text: '가나다 학부모 문자', reactions: [{ name: 'white_check_mark', users: ['U2BBB'] }] },
};
const names: Record<string, string> = { U1AAA: '직원A', U2BBB: '알바B' };

const fetchMock = vi.fn(async (url: string) => {
  const u = new URL(url);
  const method = u.pathname.split('/').pop();
  if (method === 'conversations.history') {
    const m = messages[u.searchParams.get('latest')!];
    return { json: async () => ({ ok: true, messages: m ? [m] : [] }) };
  }
  return { json: async () => ({ ok: true, user: { real_name: names[u.searchParams.get('user')!] } }) };
});
global.fetch = fetchMock as unknown as typeof fetch;

beforeEach(() => {
  fetchMock.mockClear();
  process.env.SLACK_BOT_TOKEN = 'xoxb-test';
});

describe('fetchWorkItemsByTs (REQ-007)', () => {
  it('글마다 그 글 하나만 읽고, 지워진 글은 빼고, 최신 글부터 돌려준다', async () => {
    const items = await fetchWorkItemsByTs(['100.1', '200.2', '300.3']);
    expect(items.map(i => i.messageTs)).toEqual(['300.3', '100.1']);
    expect(items[1]).toMatchObject({ authorName: '직원A', text: '@알바B 가나다 학생 통화함', done: false, replyCount: 1 });
    expect(items[0]).toMatchObject({ done: true, doneBy: '알바B' });
    const historyCall = new URL(fetchMock.mock.calls[0][0] as string);
    expect(Object.fromEntries(historyCall.searchParams)).toMatchObject({ channel: 'C0C9B0DEGDN', latest: '100.1', oldest: '100.1', inclusive: 'true', limit: '1' });
  });

  it('글이 없으면 Slack 을 부르지 않는다', async () => {
    expect(await fetchWorkItemsByTs([])).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
