// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const fetchOpen = vi.hoisted(() => vi.fn());
const markReminded = vi.hoisted(() => vi.fn());
vi.mock('@/lib/assignment-checklist-store', () => ({ fetchOpenChecklists: fetchOpen, markReminded }));
vi.mock('@/lib/supabase-admin', () => ({ supabaseAdmin: {} }));

const fetchMock = vi.fn();
global.fetch = fetchMock as unknown as typeof fetch;

import { GET } from '../route';

const hoursAgo = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();
const open = { channel: 'C0C9B0DEGDN', message_ts: '200.2', request_text: '배정', checked_ids: [], created_at: hoursAgo(5), last_reminded_at: null };
const req = (auth?: string) => new NextRequest('http://localhost/api/cron/assignment-checklist-reminder', { headers: auth ? { authorization: auth } : {} });

beforeEach(() => {
  vi.clearAllMocks();
  process.env.CRON_SECRET = 's';
  process.env.SLACK_BOT_TOKEN = 'xoxb';
  fetchOpen.mockResolvedValue([open]);
  markReminded.mockResolvedValue(undefined);
  fetchMock.mockResolvedValue({ json: () => Promise.resolve({ ok: true }) });
});

describe('GET /api/cron/assignment-checklist-reminder (REQ-003)', () => {
  it('CRON_SECRET 이 틀리면 401', async () => {
    expect((await GET(req('Bearer x'))).status).toBe(401);
  });

  it('두 담당자에게 DM 을 보내고 알림 시각을 갱신한다', async () => {
    await GET(req('Bearer s'));
    const channels = fetchMock.mock.calls.map((c) => JSON.parse(c[1].body).channel).sort();
    expect(channels).toEqual(['U07FK6LSK7C', 'U07FMTVHYBX']);
    expect(markReminded).toHaveBeenCalledWith([{ channel: 'C0C9B0DEGDN', message_ts: '200.2' }], expect.any(Date));
  });

  it('대상이 없으면 보내지 않는다', async () => {
    fetchOpen.mockResolvedValue([{ ...open, created_at: hoursAgo(1) }]);
    await GET(req('Bearer s'));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('전송이 실패하면 알림 시각을 갱신하지 않는다', async () => {
    fetchMock.mockResolvedValue({ json: () => Promise.resolve({ ok: false, error: 'not_allowed' }) });
    await GET(req('Bearer s'));
    expect(markReminded).not.toHaveBeenCalled();
  });

  describe('요청 글에서 태그된 사용자 (REQ-003)', () => {
    const tagged = { ...open, message_ts: '300.3', request_text: '<@U09KUDME9NW>\n박서진 배정' };
    const sent = () => fetchMock.mock.calls.map((c) => JSON.parse(c[1].body));

    it('태그된 사용자도 그 건의 DM 을 받고, 다른 건은 받지 않는다', async () => {
      fetchOpen.mockResolvedValue([tagged, open]);
      await GET(req('Bearer s'));
      const toTagged = sent().find((m) => m.channel === 'U09KUDME9NW');
      expect(toTagged.text).toContain('박서진 배정');
      expect(toTagged.text).toContain('1건');
      expect(sent().map((m) => m.channel).sort()).toEqual(['U07FK6LSK7C', 'U07FMTVHYBX', 'U09KUDME9NW']);
    });

    it('태그된 사용자 DM 이 실패해도 담당자 DM 은 나가고, 그 건만 알림 시각을 갱신하지 않는다', async () => {
      fetchOpen.mockResolvedValue([tagged, open]);
      fetchMock.mockImplementation((_url: string, init: { body: string }) => Promise.resolve({
        json: () => Promise.resolve(JSON.parse(init.body).channel === 'U09KUDME9NW' ? { ok: false, error: 'cannot_dm_bot' } : { ok: true }),
      }));
      const res = await GET(req('Bearer s'));
      expect(sent().filter((m) => m.channel.startsWith('U07F'))).toHaveLength(2);
      expect(markReminded).toHaveBeenCalledWith([{ channel: 'C0C9B0DEGDN', message_ts: '200.2' }], expect.any(Date));
      expect((await res.json()).reminded).toBe(1);
    });
  });
});
