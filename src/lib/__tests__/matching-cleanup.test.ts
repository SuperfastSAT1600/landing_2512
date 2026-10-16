import { describe, it, expect } from 'vitest';
import { buildMatchingCleanup, type CleanupInput } from '../matching-cleanup';
import type { RosterInput } from '../coach-roster';

const CUT = '2026-09-18T00:00:00Z';

function roster(over: Partial<RosterInput> = {}): RosterInput {
  return {
    coaches: [
      { slug: 'ben', name: 'Ben', v2_user_id: 't-ben', is_active: true, sort_order: 0, created_at: '2026-05-01' },
      { slug: 'julie', name: 'Julie', v2_user_id: 't-julie', is_active: true, sort_order: 1, created_at: '2026-05-01' },
    ],
    matchings: [
      { id: 'm1', status: 'active', subject: 'SAT' },
      { id: 'm2', status: 'active', subject: 'SAT' },
      { id: 'm3', status: 'active', subject: 'SAT' },
      { id: 'm4', status: 'active', subject: 'SAT' },
    ],
    matchingTeachers: [
      { matching_id: 'm1', teacher_id: 't-ben', response: 'accepted' },
      { matching_id: 'm2', teacher_id: 't-julie', response: 'accepted' },
      { matching_id: 'm3', teacher_id: 't-x', response: 'accepted' },
      { matching_id: 'm4', teacher_id: 't-ben', response: 'accepted' },
    ],
    // p-a: m1·m2·m3 (SAT 3건), p-b: m4 1건
    matchingStudents: [
      { matching_id: 'm1', student_id: 'p-a' },
      { matching_id: 'm2', student_id: 'p-a' },
      { matching_id: 'm3', student_id: 'p-a' },
      { matching_id: 'm4', student_id: 'p-b' },
    ],
    lastEventTeacher: {},
    payments: [
      { student_id: 'p-a', subject: 'SAT', management_status: 'active' },
      { student_id: 'p-b', subject: 'SAT', management_status: 'active' },
    ],
    profileNames: { 'p-a': 'Alice', 'p-b': 'Bob', 't-x': '외부 교사' },
    crmStudents: [{ id: 'crm-a', name: '앨리스', sfv2_profile_id: 'p-a' }],
    ...over,
  };
}

const meta: CleanupInput['meta'] = {
  m1: { activated_at: '2026-05-31T00:00:00Z', entry_code: 'AAA' },
  m2: { activated_at: '2026-06-12T00:00:00Z', entry_code: 'BBB' },
  m3: { activated_at: '2026-06-18T00:00:00Z', entry_code: 'CCC' },
  m4: { activated_at: '2026-06-18T00:00:00Z', entry_code: 'DDD' },
};

const run = (over: Partial<CleanupInput> = {}) => buildMatchingCleanup({ input: roster(), lessons: {}, meta, recentCutoff: CUT, ...over });

// REQ-001 (crm-matching-cleanup-panel)
describe('buildMatchingCleanup', () => {
  it('최근 수업이 있는 매칭이 있으면 나머지 매칭을 Deactivate 추천으로 낸다', () => {
    const r = run({ lessons: {
      m1: { last: '2026-10-10T00:00:00Z', next: '2026-10-20T00:00:00Z' },
      m2: { last: '2026-06-13T00:00:00Z', next: null },
      m3: { last: null, next: null },
    } });
    expect(r.stale).toEqual([
      { matchingId: 'm2', profileId: 'p-a', student: '앨리스', crmStudentId: 'crm-a', subject: 'SAT', status: 'active', coach: 'Julie', activatedAt: '2026-06-12T00:00:00Z', lastLesson: '2026-06-13T00:00:00Z', entryCode: 'BBB', keepCoaches: ['Ben'] },
      { matchingId: 'm3', profileId: 'p-a', student: '앨리스', crmStudentId: 'crm-a', subject: 'SAT', status: 'active', coach: '외부 교사', activatedAt: '2026-06-18T00:00:00Z', lastLesson: null, entryCode: 'CCC', keepCoaches: ['Ben'] },
    ]);
    expect(r.unclear).toEqual([]);
  });

  it('예정 수업만 있어도 수업 중인 매칭으로 본다', () => {
    const r = run({ lessons: { m2: { last: null, next: '2026-10-20T00:00:00Z' } } });
    expect(r.stale.map((s) => s.coach).sort()).toEqual(['Ben', '외부 교사']);
    expect(r.stale[0].keepCoaches).toEqual(['Julie']);
  });

  it('어느 매칭에도 최근·예정 수업이 없으면 확인 필요로 묶는다', () => {
    const r = run({ lessons: { m1: { last: '2026-08-01T00:00:00Z', next: null } } });
    expect(r.stale).toEqual([]);
    expect(r.unclear).toEqual([{
      profileId: 'p-a', student: '앨리스', crmStudentId: 'crm-a', subject: 'SAT', status: 'active',
      matchings: [
        { matchingId: 'm1', coach: 'Ben', activatedAt: '2026-05-31T00:00:00Z', lastLesson: '2026-08-01T00:00:00Z', entryCode: 'AAA' },
        { matchingId: 'm2', coach: 'Julie', activatedAt: '2026-06-12T00:00:00Z', lastLesson: null, entryCode: 'BBB' },
        { matchingId: 'm3', coach: '외부 교사', activatedAt: '2026-06-18T00:00:00Z', lastLesson: null, entryCode: 'CCC' },
      ],
    }]);
  });

  it('매칭이 1건뿐인 학생, 종료 학생, 비활성 매칭은 대상이 아니다', () => {
    const r = run({ input: roster({
      payments: [
        { student_id: 'p-a', subject: 'SAT', management_status: 'inactive' },
        { student_id: 'p-b', subject: 'SAT', management_status: 'active' },
      ],
    }) });
    expect(r).toEqual({ stale: [], unclear: [] });
    const r2 = run({ input: roster({ matchings: [
      { id: 'm1', status: 'active', subject: 'SAT' },
      { id: 'm2', status: 'inactive', subject: 'SAT' },
      { id: 'm3', status: 'inactive', subject: 'SAT' },
      { id: 'm4', status: 'active', subject: 'SAT' },
    ] }) });
    expect(r2).toEqual({ stale: [], unclear: [] });
  });

  it('과목이 다르면 따로 본다', () => {
    const r = run({ input: roster({ matchings: [
      { id: 'm1', status: 'active', subject: 'SAT' },
      { id: 'm2', status: 'active', subject: 'AP' },
      { id: 'm3', status: 'active', subject: 'ACT' },
      { id: 'm4', status: 'active', subject: 'SAT' },
    ] }), lessons: { m1: { last: '2026-10-10T00:00:00Z', next: null } } });
    expect(r).toEqual({ stale: [], unclear: [] });
  });

  it('수업 중인 매칭에 코치가 없으면 지금 수업을 (코치 없음)으로, 휴원 학생도 대상', () => {
    const r = run({
      input: roster({
        matchingTeachers: [{ matching_id: 'm2', teacher_id: 't-julie', response: 'accepted' }],
        payments: [{ student_id: 'p-a', subject: 'SAT', management_status: 'paused' }],
      }),
      lessons: { m1: { last: CUT, next: null } },
    });
    expect(r.stale.find((s) => s.matchingId === 'm2')).toMatchObject({ status: 'paused', keepCoaches: ['(코치 없음)'] });
  });

  it('두 학생이 같은 옛 매칭을 쓰면 학생마다 한 줄씩(profileId로 구분)', () => {
    const r = run({
      input: roster({
        matchingStudents: [
          { matching_id: 'm1', student_id: 'p-a' }, { matching_id: 'm2', student_id: 'p-a' },
          { matching_id: 'm1', student_id: 'p-b' }, { matching_id: 'm2', student_id: 'p-b' },
        ],
      }),
      lessons: { m1: { last: '2026-10-10T00:00:00+00:00', next: null } },
    });
    expect(r.stale.map((s) => [s.matchingId, s.profileId]).sort()).toEqual([['m2', 'p-a'], ['m2', 'p-b']]);
  });
});
