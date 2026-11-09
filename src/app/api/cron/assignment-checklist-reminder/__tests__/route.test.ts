// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const fetchOpen = vi.hoisted(() => vi.fn());
const markReminded = vi.hoisted(() => vi.fn());
const saveChecked = vi.hoisted(() => vi.fn());
vi.mock('@/lib/assignment-checklist-store', () => ({ fetchOpenChecklists: fetchOpen, markReminded, saveChecked }));
vi.mock('@/lib/supabase-admin', () => ({ supabaseAdmin: {} }));

const fetchMock = vi.fn();
global.fetch = fetchMock as unknown as typeof fetch;

import { GET } from '../route';
import { ASSIGNMENT_TASKS, buildChecklistBlocks } from '@/lib/slack-assignment-checklist';

const hoursAgo = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();
const open = { channel: 'C0C9B0DEGDN', message_ts: '200.2', request_text: '배정', checked_ids: [], created_at: hoursAgo(5), last_reminded_at: null };
const liveReply = (ids: string[]) => (ts: string | null) => ({ ok: true, messages: [{ ts, blocks: buildChecklistBlocks(Object.fromEntries(ids.map((id) => [id, '✔ a']))) }] });
/** conversations.replies 는 replies 로, chat.postMessage 는 dm(본문) 으로 응답 */
const mockSlack = (replies: unknown, dm: (body: { channel: string }) => unknown = () => ({ ok: true })) =>
  fetchMock.mockImplementation((url: string, init?: { body: string }) => Promise.resolve({
    json: () => Promise.resolve(url.includes('conversations.replies')
      ? (typeof replies === 'function' ? replies(new URL(url).searchParams.get('ts')) : replies)
      : dm(JSON.parse(init!.body))),
  }));
const dmCalls = () => fetchMock.mock.calls.filter((c) => c[0].includes('chat.postMessage')).map((c) => JSON.parse(c[1].body));
const req = (auth?: string) => new NextRequest('http://localhost/api/cron/assignment-checklist-reminder', { headers: auth ? { authorization: auth } : {} });

beforeEach(() => {
  vi.clearAllMocks();
  process.env.CRON_SECRET = 's';
  process.env.SLACK_BOT_TOKEN = 'xoxb';
  fetchOpen.mockResolvedValue([open]);
  markReminded.mockResolvedValue(undefined);
  saveChecked.mockResolvedValue(undefined);
  mockSlack(liveReply([]));
});

describe('GET /api/cron/assignment-checklist-reminder (REQ-003)', () => {
  it('CRON_SECRET 이 틀리면 401', async () => {
    expect((await GET(req('Bearer x'))).status).toBe(401);
  });

  it('두 담당자에게 DM 을 보내고 알림 시각을 갱신한다', async () => {
    await GET(req('Bearer s'));
    const channels = dmCalls().map((m) => m.channel).sort();
    expect(channels).toEqual(['U07FK6LSK7C', 'U07FMTVHYBX']);
    expect(markReminded).toHaveBeenCalledWith([{ channel: 'C0C9B0DEGDN', message_ts: '200.2' }], expect.any(Date));
  });

  it('대상이 없으면 보내지 않는다', async () => {
    fetchOpen.mockResolvedValue([{ ...open, created_at: hoursAgo(1) }]);
    await GET(req('Bearer s'));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('전송이 실패하면 알림 시각을 갱신하지 않는다', async () => {
    mockSlack(liveReply([]), () => ({ ok: false, error: 'not_allowed' }));
    await GET(req('Bearer s'));
    expect(markReminded).not.toHaveBeenCalled();
  });

  describe('Slack 현재 상태 확인', () => {
    it('Slack 에서 다 체크된 건은 DB 가 미완료여도 알리지 않고 완료로 닫는다', async () => {
      const ids = ASSIGNMENT_TASKS.map((t) => t.id);
      mockSlack(liveReply(ids));
      await GET(req('Bearer s'));
      expect(dmCalls()).toEqual([]);
      expect(saveChecked).toHaveBeenCalledWith('C0C9B0DEGDN', '200.2', ids, true);
    });

    it('글이 지워진 건은 알리지 않고 닫는다', async () => {
      mockSlack({ ok: false, error: 'thread_not_found' });
      await GET(req('Bearer s'));
      expect(dmCalls()).toEqual([]);
      expect(saveChecked).toHaveBeenCalledWith('C0C9B0DEGDN', '200.2', [], true);
      expect(markReminded).not.toHaveBeenCalled();
    });

    it('남은 항목은 Slack 의 체크 상태로 계산한다', async () => {
      mockSlack(liveReply(['t1']));
      await GET(req('Bearer s'));
      expect(dmCalls()[0].text).not.toContain(ASSIGNMENT_TASKS[0].label);
      expect(saveChecked).not.toHaveBeenCalled();
    });

    it('조회가 실패하면 DB 기준으로 알린다', async () => {
      mockSlack({ ok: false, error: 'ratelimited' });
      await GET(req('Bearer s'));
      expect(dmCalls()).toHaveLength(2);
      expect(saveChecked).not.toHaveBeenCalled();
    });
  });

  describe('요청 글에서 태그된 사용자 (REQ-003)', () => {
    const tagged = { ...open, message_ts: '300.3', request_text: '<@U09KUDME9NW>\n박서진 배정' };
    const sent = dmCalls;

    it('태그된 건은 태그된 사람에게만, 태그 없는 건은 담당자 2명에게 간다', async () => {
      fetchOpen.mockResolvedValue([tagged, open]);
      await GET(req('Bearer s'));
      const toTagged = sent().find((m) => m.channel === 'U09KUDME9NW');
      expect(toTagged.text).toContain('박서진 배정');
      expect(toTagged.text).toContain('1건');
      const toFixed = sent().filter((m) => m.channel.startsWith('U07F'));
      expect(toFixed.map((m) => m.channel).sort()).toEqual(['U07FK6LSK7C', 'U07FMTVHYBX']);
      toFixed.forEach((m) => expect(m.text).not.toContain('박서진 배정'));
    });

    it('태그된 사용자 DM 이 실패해도 다른 DM 은 나가고, 실패한 건만 알림 시각을 갱신하지 않는다', async () => {
      fetchOpen.mockResolvedValue([tagged, open]);
      mockSlack(liveReply([]), (body) => (body.channel === 'U09KUDME9NW' ? { ok: false, error: 'cannot_dm_bot' } : { ok: true }));
      const res = await GET(req('Bearer s'));
      expect(sent().filter((m) => m.channel.startsWith('U07F'))).toHaveLength(2);
      expect(markReminded).toHaveBeenCalledWith([{ channel: 'C0C9B0DEGDN', message_ts: '200.2' }], expect.any(Date));
      expect((await res.json()).reminded).toBe(1);
    });
  });
});
