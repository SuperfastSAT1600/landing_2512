// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

const db = vi.hoisted(() => {
  const state = { upsert: vi.fn(), del: vi.fn(), eq: vi.fn(), rows: [] as unknown[] };
  const chain = {
    eq: (...a: unknown[]) => { state.eq(...a); return chain; },
    then: (r: (v: unknown) => void) => r({ data: state.rows, error: null }),
  };
  const from = vi.fn(() => ({
    select: () => chain,
    upsert: (...a: unknown[]) => { state.upsert(...a); return Promise.resolve({ error: null }); },
    delete: () => { state.del(); return chain; },
  }));
  return { state, from };
});
vi.mock('@/lib/supabase-admin', () => ({ supabaseAdmin: { from: db.from } }));

import { dismiss, listDismissals, restore } from '@/lib/work-log-dismissals';

beforeEach(() => {
  vi.clearAllMocks();
  db.state.rows = [];
});

// REQ-009
describe('work-log-dismissals', () => {
  it('종류별 삭제 기록을 대상 키로 묶어 돌려준다', async () => {
    db.state.rows = [{ target_key: '1.1', target_name: '할 일', dismissed_by: '직원A', dismissed_at: '2026-11-11T01:00:00+00:00' }];
    expect(await listDismissals('slack')).toEqual({ '1.1': { name: '할 일', by: '직원A', at: '2026-11-11T01:00:00.000Z' } });
    expect(db.from).toHaveBeenCalledWith('work_log_dismissals');
    expect(db.state.eq).toHaveBeenCalledWith('kind', 'slack');
  });

  it('삭제하면 누가 언제 지웠는지 저장하고 그 기록을 돌려준다', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-11T02:00:00.000Z'));
    const saved = await dismiss('contact', 's1', '나은', '알바B');
    vi.useRealTimers();
    expect(db.state.upsert).toHaveBeenCalledWith({
      kind: 'contact', target_key: 's1', target_name: '나은', dismissed_by: '알바B', dismissed_at: '2026-11-11T02:00:00.000Z',
    });
    expect(saved).toEqual({ name: '나은', by: '알바B', at: '2026-11-11T02:00:00.000Z' });
  });

  it('복구하면 그 대상의 삭제 기록을 지운다', async () => {
    await restore('contact', 'coach:ben');
    expect(db.state.del).toHaveBeenCalled();
    expect(db.state.eq).toHaveBeenCalledWith('kind', 'contact');
    expect(db.state.eq).toHaveBeenCalledWith('target_key', 'coach:ben');
  });
});
