// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

const db = vi.hoisted(() => {
  const state = { upsert: vi.fn(), del: vi.fn(), eq: vi.fn() };
  const chain = { eq: (...a: unknown[]) => { state.eq(...a); return chain; }, then: (r: (v: unknown) => void) => r({ error: null }) };
  const from = vi.fn(() => ({
    upsert: (...a: unknown[]) => { state.upsert(...a); return Promise.resolve({ error: null }); },
    delete: () => { state.del(); return chain; },
  }));
  return { state, from };
});
vi.mock('@/lib/supabase-admin', () => ({ supabaseAdmin: { from: db.from } }));

const fetchMock = vi.fn();
global.fetch = fetchMock as unknown as typeof fetch;

import { handleDoneReaction, isDoneReactionEvent } from '@/lib/work-item-completions';

const added = {
  type: 'reaction_added', user: 'U3CCC', reaction: 'white_check_mark',
  item: { type: 'message', channel: 'C0C9B0DEGDN', ts: '1793840353.287059' }, event_ts: '1793847553.000100',
};
const removed = { ...added, type: 'reaction_removed' };
const reactionsGet = (reactions: { name: string }[]) =>
  fetchMock.mockResolvedValue({ json: () => Promise.resolve({ ok: true, message: { reactions } }) });

beforeEach(() => {
  vi.clearAllMocks();
  process.env.SLACK_BOT_TOKEN = 'xoxb-test';
});

describe('isDoneReactionEvent (REQ-004)', () => {
  it('업무 채널 글에 단 ✅ 반응 추가·제거만 해당한다', () => {
    expect(isDoneReactionEvent(added)).toBe(true);
    expect(isDoneReactionEvent(removed)).toBe(true);
    expect(isDoneReactionEvent({ ...added, reaction: 'heavy_check_mark' })).toBe(false);
    expect(isDoneReactionEvent({ ...added, item: { ...added.item, channel: 'C999' } })).toBe(false);
    expect(isDoneReactionEvent({ ...added, item: { type: 'file', channel: 'C0C9B0DEGDN', ts: '1.1' } })).toBe(false);
    expect(isDoneReactionEvent({ type: 'message' })).toBe(false);
  });
});

describe('handleDoneReaction (REQ-004)', () => {
  it('✅ 추가 시 반응 시각을 완료 시각으로 저장하고, 이미 있으면 처음 시각을 유지한다', async () => {
    await handleDoneReaction(added);
    expect(db.from).toHaveBeenCalledWith('work_item_completions');
    expect(db.state.upsert).toHaveBeenCalledWith(
      { channel: 'C0C9B0DEGDN', message_ts: '1793840353.287059', done_at: new Date(1793847553000).toISOString(), done_by: 'U3CCC' },
      { onConflict: 'channel,message_ts', ignoreDuplicates: true },
    );
  });

  it('✅ 가 모두 빠지면 기록을 지운다', async () => {
    reactionsGet([{ name: 'eyes' }]);
    await handleDoneReaction(removed);
    expect(db.state.del).toHaveBeenCalled();
    expect(db.state.eq).toHaveBeenCalledWith('message_ts', '1793840353.287059');
  });

  it('다른 사람의 ✅ 가 남아 있으면 기록을 유지한다', async () => {
    reactionsGet([{ name: 'white_check_mark' }]);
    await handleDoneReaction(removed);
    expect(db.state.del).not.toHaveBeenCalled();
  });
});
