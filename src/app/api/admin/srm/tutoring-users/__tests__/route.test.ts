// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { fakeClient, type FakeDb } from './fake-supabase';

const sfv2: FakeDb = { tables: {}, requests: [] };
const crm: FakeDb = { tables: {}, requests: [] };
vi.mock('@/lib/supabase-sfv2', () => ({ supabaseSFv2: fakeClient(sfv2) }));
vi.mock('@/lib/supabase-admin', () => ({ supabaseAdmin: fakeClient(crm) }));

process.env.ADMIN_SECRET_KEY = 'admin-key';

const req = () =>
  new NextRequest('http://localhost/api/admin/srm/tutoring-users', { headers: { 'x-admin-key': 'admin-key' } });

const H = 3_600_000;
/** 학생 3명(활성·온보딩·종료)과 미연결 1명, 코치 참가 행 포함, 참가자 2,500행 이상(페이지 3장). */
function seed() {
  const students = ['s1', 's2', 's3', 's4'];
  sfv2.tables = {
    payments: [
      { id: 'pay1', student_id: 's1', subject: 'SAT', management_status: 'active' },
      { id: 'pay2', student_id: 's1', subject: 'AP', management_status: 'paused' },
      { id: 'pay3', student_id: 's2', subject: 'SAT', management_status: 'onboarding' },
      { id: 'pay4', student_id: 's3', subject: 'SAT', management_status: 'inactive' },
    ],
    payment_transactions: [
      { id: 't1', student_id: 's1', hours: 20, created_at: '2026-08-01T00:00:00Z', subject: 'SAT' },
      { id: 't2', student_id: 's1', hours: 10, created_at: '2026-09-01T00:00:00Z', subject: 'AP' },
      { id: 't3', student_id: 's2', hours: 12, created_at: '2026-09-10T00:00:00Z', subject: 'SAT' },
      { id: 't4', student_id: 's4', hours: 8, created_at: '2026-09-15T00:00:00Z', subject: 'SAT' },
      { id: 't5', student_id: 's3', hours: 0, created_at: '2026-09-15T00:00:00Z', subject: 'SAT' },
    ],
    payment_refunds: [{ id: 'r1', payment_id: 'pay1', hours_refunded: 2 }],
    matchings: [
      { id: 'm1', subject: 'SAT' },
      { id: 'm2', subject: 'AP' },
    ],
    scheduled_events: [],
    scheduled_event_participants: [],
    profiles: students.map((id) => ({ id, full_name: `프로필${id}` })),
  };
  // 이벤트 1,300개 × 참가자 2명(학생+코치) = 2,600행 → 3페이지
  for (let i = 0; i < 1300; i++) {
    const id = `e${String(i).padStart(5, '0')}`;
    const student = students[i % 4];
    const status = i % 10 === 0 ? 'approved' : i % 13 === 0 ? 'cancelled' : 'completed';
    const start = Date.parse('2026-06-01T00:00:00Z') + i * H * 3;
    sfv2.tables.scheduled_events.push({
      id, starts_at: new Date(start).toISOString(), ends_at: new Date(start + (i % 3 === 0 ? 1.5 : 1) * H).toISOString(),
      status, matching_id: i % 2 ? 'm2' : 'm1', category: i % 17 === 0 ? 'group' : 'coach_room',
    });
    sfv2.tables.scheduled_event_participants.push({ event_id: id, user_id: student });
    sfv2.tables.scheduled_event_participants.push({ event_id: id, user_id: 'coach-1' });
  }
  crm.tables = {
    students: [
      { id: 'c1', name: '김학생', grade: '11', sfv2_profile_id: 's1', funnel_stage: '8', parent_phone: null },
      { id: 'c2', name: '이학생', grade: '10', sfv2_profile_id: 's2', funnel_stage: '8', parent_phone: null },
      { id: 'c9', name: '미연결학생', grade: '12', sfv2_profile_id: null, funnel_stage: '8', parent_phone: '010' },
    ],
    student_pauses: [{ id: 'sp1', student_id: 'c1', sfv2_profile_id: 's1', ended_at: null, pause_start: '2026-01-01', pause_until: null }],
  };
}

describe('GET /api/admin/srm/tutoring-users', () => {
  beforeEach(() => {
    seed();
    sfv2.requests = [];
    sfv2.failTables = undefined;
    crm.failTables = undefined;
  });

  it('관리자 키가 없으면 401', async () => {
    const { GET } = await import('../route');
    const res = await GET(new NextRequest('http://localhost/api/admin/srm/tutoring-users'));
    expect(res.status).toBe(401);
    expect((await res.json()).error.code).toBe('UNAUTHORIZED');
  });

  it('CRM 조회가 실패하면 휴원·연결 정보가 빠진 목록 대신 500', async () => {
    crm.failTables = new Set(['student_pauses']);
    const { GET } = await import('../route');
    const res = await GET(req());
    expect(res.status).toBe(500);
    expect((await res.json()).error.message).toContain('student_pauses');
  });

  // REQ-002 (tutoring-users-perf): 구조를 바꿔도 응답은 그대로
  it('응답이 기준 스냅샷과 같다', async () => {
    const { GET } = await import('../route');
    const res = await GET(req());
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchSnapshot();
  });

  it('1000행이 넘는 참가자 테이블도 빠짐없이 집계한다', async () => {
    const { GET } = await import('../route');
    const body = await (await GET(req())).json();
    const s1 = body.linked.find((u: { sfv2ProfileId: string }) => u.sfv2ProfileId === 's1');
    // s1은 i%4==0 이벤트(325개) — completed coach_room 시간 합이 0보다 커야 하고 페이지 경계에서 유실되지 않는다
    expect(s1.usedHours).toBeGreaterThan(100);
    expect(sfv2.requests.filter((r) => r.table === 'scheduled_event_participants').length).toBeGreaterThanOrEqual(3);
  });

  it('페이지로 나눠 읽는 조회는 모두 정렬을 건다(페이지 경계에서 행이 겹치거나 빠지지 않게)', async () => {
    const { GET } = await import('../route');
    await GET(req());
    const paged = sfv2.requests.filter((r) => r.ranged);
    expect(paged.length).toBeGreaterThan(0);
    expect(paged.filter((r) => !r.ordered)).toEqual([]);
  });

  // REQ-003
  it('SFv2 조회가 실패하면 일부 데이터로 계산하지 않고 500', async () => {
    sfv2.failTables = new Set(['scheduled_event_participants']);
    const { GET } = await import('../route');
    const res = await GET(req());
    expect(res.status).toBe(500);
  });
});
