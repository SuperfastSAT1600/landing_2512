// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

const db = vi.hoisted(() => {
  const state = { rows: [] as { message_ts: string; student_id: string }[], inArgs: [] as unknown[] };
  const query = {
    select: () => query,
    eq: () => query,
    in: (_col: string, ids: string[]) => { state.inArgs.push(ids); return Promise.resolve({ data: state.rows.filter(r => ids.includes(r.student_id)), error: null }); },
  };
  return { state, from: vi.fn(() => query) };
});
vi.mock('@/lib/supabase-admin', () => ({ supabaseAdmin: { from: db.from } }));
const byTs = vi.hoisted(() => vi.fn());
vi.mock('@/lib/work-log', async (orig) => ({ ...(await orig<typeof import('@/lib/work-log')>()), fetchWorkItemsByTs: byTs }));

import { listStudentWorkItems } from '@/lib/student-work-items';

const item = (messageTs: string) => ({ messageTs, text: messageTs, student: null });

beforeEach(() => {
  vi.clearAllMocks();
  db.state.inArgs = [];
  db.state.rows = [{ message_ts: '100.1', student_id: 's1' }, { message_ts: '300.3', student_id: 's1' }, { message_ts: '200.2', student_id: 's2' }];
  byTs.mockImplementation(async (tsList: string[]) => tsList.filter(ts => ts !== '200.2').sort().reverse().map(item));
});

describe('listStudentWorkItems (REQ-007)', () => {
  it('학생이 지정된 운영 할 일을 학생별로 최신순으로 묶고, Slack 에서 지워진 글은 뺀다', async () => {
    expect(await listStudentWorkItems(['s1', 's2', 's3'])).toEqual({ s1: [item('300.3'), item('100.1')] });
    expect(db.from).toHaveBeenCalledWith('work_item_students');
  });

  it('학생이 없으면 조회하지 않는다', async () => {
    expect(await listStudentWorkItems([])).toEqual({});
    expect(db.from).not.toHaveBeenCalled();
  });
});
