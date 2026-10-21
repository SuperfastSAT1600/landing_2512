// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

type Result = { data: unknown; error: { message: string } | null };
const results = vi.hoisted(() => ({ student: null as unknown, slots: null as unknown, link: null as unknown }));

// 테이블마다 마지막 체인 호출(maybeSingle/limit)이 준비된 결과를 돌려준다
function chain(get: () => Result) {
  const c: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'is', 'order']) c[m] = () => c;
  c.maybeSingle = async () => get();
  c.limit = async () => get();
  return c;
}
vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: { from: () => chain(() => results.student as Result) },
}));
vi.mock('@/lib/supabase-sfv2', () => ({
  supabaseSFv2: { from: (t: string) => chain(() => (t === 'scheduled_availability_slots' ? results.slots : results.link) as Result) },
}));

import { loadStudentMessageContext } from '../coach-prep-student-context';

const ok = (data: unknown): Result => ({ data, error: null });
const fail = (): Result => ({ data: null, error: { message: 'boom' } });

beforeEach(() => {
  results.student = ok({ preferred_language: 'english', parent_timezone: 'America/Chicago', sfv2_profile_id: 'prof-1' });
  results.slots = ok([{ tz: 'America/New_York' }]);
  results.link = ok([{ token: 'abcDEF123_-xyz456789AB' }]);
});

describe('loadStudentMessageContext', () => {
  // REQ-003
  it('언어, SFv2 가능 시간의 시간대, 학생별 링크를 모은다', async () => {
    expect(await loadStudentMessageContext('stu-1')).toEqual({
      language: 'english', timezone: 'America/New_York', schedule_url: 'https://app.superfastsat.io/report/abcDEF123_-xyz456789AB',
    });
  });

  it('가능 시간 슬롯이 없으면 CRM parent_timezone으로 대신한다', async () => {
    results.slots = ok([]);
    expect((await loadStudentMessageContext('stu-1')).timezone).toBe('America/Chicago');
  });

  it('SFv2 프로필이 없으면 링크는 null이고 시간대·언어는 CRM 값을 쓴다', async () => {
    results.student = ok({ preferred_language: 'korean', parent_timezone: 'Asia/Tokyo', sfv2_profile_id: null });
    expect(await loadStudentMessageContext('stu-1')).toEqual({ language: 'korean', timezone: 'Asia/Tokyo', schedule_url: null });
  });

  it('링크 조회가 실패해도 나머지는 내려준다', async () => {
    results.link = fail();
    const ctx = await loadStudentMessageContext('stu-1');
    expect(ctx.schedule_url).toBeNull();
    expect(ctx.timezone).toBe('America/New_York');
  });

  it('회수되지 않은 링크가 없으면 null', async () => {
    results.link = ok([]);
    expect((await loadStudentMessageContext('stu-1')).schedule_url).toBeNull();
  });

  it('알 수 없는 시간대 문자열은 버리고 null (잘못된 값이 Intl 오류를 내지 않게)', async () => {
    results.slots = ok([{ tz: 'Not/AZone' }]);
    results.student = ok({ preferred_language: 'korean', parent_timezone: 'also bad', sfv2_profile_id: 'prof-1' });
    expect((await loadStudentMessageContext('stu-1')).timezone).toBeNull();
  });

  it('학생 조회가 DB 오류로 실패하면 "학생 없음"으로 숨기지 않고 던진다', async () => {
    results.student = fail();
    await expect(loadStudentMessageContext('stu-1')).rejects.toThrow('boom');
  });

  it('SFv2 시간대가 잘못된 값이면 CRM parent_timezone으로 대신한다', async () => {
    results.slots = ok([{ tz: 'Not/AZone' }]);
    expect((await loadStudentMessageContext('stu-1')).timezone).toBe('America/Chicago');
  });

  it('학생을 못 찾으면 모두 null', async () => {
    results.student = ok(null);
    expect(await loadStudentMessageContext('stu-1')).toEqual({ language: null, timezone: null, schedule_url: null });
  });
});
