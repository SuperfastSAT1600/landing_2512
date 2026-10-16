import { describe, it, expect } from 'vitest';
import { buildCoachRoster, type RosterInput } from '../coach-roster';

const coach = (slug: string, name: string, v2: string | null, extra: Partial<RosterInput['coaches'][number]> = {}) =>
  ({ slug, name, v2_user_id: v2, is_active: true, sort_order: null, created_at: '2026-05-01T00:00:00Z', ...extra });

function input(over: Partial<RosterInput> = {}): RosterInput {
  return {
    coaches: [coach('ben', 'Ben', 't-ben'), coach('julie', 'Julie', 't-julie')],
    matchings: [
      { id: 'm1', status: 'active', subject: 'SAT' },
      { id: 'm2', status: 'active', subject: 'SAT' },
      { id: 'm3', status: 'inactive', subject: 'SAT' },
    ],
    matchingTeachers: [
      { matching_id: 'm1', teacher_id: 't-ben', response: 'accepted' },
      { matching_id: 'm2', teacher_id: 't-julie', response: 'accepted' },
      { matching_id: 'm3', teacher_id: 't-ben', response: 'accepted' },
    ],
    matchingStudents: [
      { matching_id: 'm1', student_id: 'p-a' },
      { matching_id: 'm2', student_id: 'p-b' },
      { matching_id: 'm3', student_id: 'p-c' },
    ],
    lastEventTeacher: {},
    payments: [
      { student_id: 'p-a', subject: 'SAT', management_status: 'active' },
      { student_id: 'p-b', subject: 'SAT', management_status: 'paused' },
      { student_id: 'p-c', subject: 'SAT', management_status: 'active' },
    ],
    profileNames: { 'p-a': 'Alice', 'p-b': 'Bob', 'p-c': 'Carol' },
    crmStudents: [{ id: 'crm-a', name: '앨리스', sfv2_profile_id: 'p-a' }],
    ...over,
  };
}

// REQ-001 (crm-coach-roster)
describe('buildCoachRoster', () => {
  it('활성 매칭의 수락 코치 아래에 학생을 두고 재원 수를 센다', () => {
    const r = buildCoachRoster(input());
    const ben = r.coaches.find((c) => c.name === 'Ben')!;
    expect(ben.activeCount).toBe(1);
    expect(ben.students).toEqual([
      { profileId: 'p-a', crmStudentId: 'crm-a', name: '앨리스', status: 'active', subjects: [{ subject: 'SAT', status: 'active' }] },
    ]);
    const julie = r.coaches.find((c) => c.name === 'Julie')!;
    expect(julie.activeCount).toBe(0);
    expect(julie.pausedCount).toBe(1);
    expect(julie.students[0]).toMatchObject({ name: 'Bob', crmStudentId: null, status: 'paused' });
  });

  it('비활성 매칭은 무시하고, 코치 없는 재원 학생은 미배정으로 모은다', () => {
    const r = buildCoachRoster(input());
    expect(r.coaches.flatMap((c) => c.students).some((s) => s.profileId === 'p-c')).toBe(false);
    expect(r.unassigned.map((s) => s.name)).toEqual(['Carol']);
  });

  it('종료·제외 학생은 명단에 넣지 않는다', () => {
    const r = buildCoachRoster(input({ payments: [
      { student_id: 'p-a', subject: 'SAT', management_status: 'inactive' },
      { student_id: 'p-b', subject: 'SAT', management_status: 'excluded' },
    ] }));
    expect(r.coaches.flatMap((c) => c.students)).toEqual([]);
    expect(r.unassigned).toEqual([]);
  });

  it('수락 코치가 없으면 최근 담당 코치로 대체한다', () => {
    const r = buildCoachRoster(input({
      matchingTeachers: [{ matching_id: 'm1', teacher_id: 't-julie', response: 'pending' }],
      lastEventTeacher: { m1: 't-ben' },
      matchingStudents: [{ matching_id: 'm1', student_id: 'p-a' }],
    }));
    expect(r.coaches.find((c) => c.name === 'Ben')!.activeCount).toBe(1);
    expect(r.coaches.find((c) => c.name === 'Julie')!.students).toEqual([]);
  });

  it('같은 코치와 과목이 둘이면 한 줄에 과목 칩으로 합치고, 과목 계정이 없으면 학생 롤업 상태를 쓴다', () => {
    const r = buildCoachRoster(input({
      matchings: [{ id: 'm1', status: 'active', subject: 'SAT' }, { id: 'm4', status: 'active', subject: 'AP' }],
      matchingTeachers: [{ matching_id: 'm1', teacher_id: 't-ben', response: 'accepted' }, { matching_id: 'm4', teacher_id: 't-ben', response: 'accepted' }],
      matchingStudents: [{ matching_id: 'm1', student_id: 'p-a' }, { matching_id: 'm4', student_id: 'p-a' }],
    }));
    const ben = r.coaches.find((c) => c.name === 'Ben')!;
    expect(ben.activeCount).toBe(1);
    expect(ben.students[0].subjects).toEqual([{ subject: 'AP', status: 'active' }, { subject: 'SAT', status: 'active' }]);
  });

  it('매칭 과목의 결제 계정이 없으면 학생의 롤업 상태를 쓴다', () => {
    const r = buildCoachRoster(input({
      matchings: [{ id: 'm4', status: 'active', subject: 'AP' }],
      matchingTeachers: [{ matching_id: 'm4', teacher_id: 't-ben', response: 'accepted' }],
      matchingStudents: [{ matching_id: 'm4', student_id: 'p-a' }],
      payments: [{ student_id: 'p-a', subject: 'SAT', management_status: 'paused' }],
    }));
    expect(r.coaches.find((c) => c.name === 'Ben')!.students[0].subjects).toEqual([{ subject: 'AP', status: 'paused' }]);
  });

  it('순서 없는 코치끼리는 등록순, 순서 있는 코치 뒤에 온다', () => {
    const r = buildCoachRoster(input({ coaches: [
      coach('c', 'C', null, { created_at: '2026-07-01T00:00:00Z' }),
      coach('b', 'B', null, { created_at: '2026-06-01T00:00:00Z' }),
      coach('a', 'A', null, { sort_order: 3, created_at: '2026-08-01T00:00:00Z' }),
    ] }));
    expect(r.coaches.filter((c) => c.registered).map((c) => c.name)).toEqual(['A', 'B', 'C']);
  });

  it('코치는 sort_order → 등록순, 학생은 재원 → 온보딩 → 휴원 → 이름순', () => {
    const r = buildCoachRoster(input({
      coaches: [
        coach('ben', 'Ben', 't-ben', { created_at: '2026-05-01T00:00:00Z' }),
        coach('julie', 'Julie', 't-julie', { created_at: '2026-06-01T00:00:00Z' }),
        coach('lina', 'Lina', 't-lina', { sort_order: 0, created_at: '2026-07-01T00:00:00Z' }),
      ],
      matchingTeachers: [
        { matching_id: 'm1', teacher_id: 't-ben', response: 'accepted' },
        { matching_id: 'm2', teacher_id: 't-ben', response: 'accepted' },
      ],
      payments: [
        { student_id: 'p-a', subject: 'SAT', management_status: 'onboarding' },
        { student_id: 'p-b', subject: 'SAT', management_status: 'active' },
      ],
    }));
    expect(r.coaches.map((c) => c.name)).toEqual(['Lina', 'Ben', 'Julie']);
    expect(r.coaches[1].students.map((s) => s.name)).toEqual(['Bob', '앨리스']);
    expect(r.coaches[1]).toMatchObject({ activeCount: 1, onboardingCount: 1 });
  });

  it('활동 중이 아닌 코치는 학생이 없으면 숨기고, CRM에 없는 SRM 교사는 맨 뒤 미등록 카드', () => {
    const r = buildCoachRoster(input({
      coaches: [coach('ben', 'Ben', 't-ben'), coach('old', 'Old', null, { is_active: false })],
      matchingTeachers: [
        { matching_id: 'm1', teacher_id: 't-ben', response: 'accepted' },
        { matching_id: 'm2', teacher_id: 't-x', response: 'accepted' },
      ],
      payments: [
        { student_id: 'p-a', subject: 'SAT', management_status: 'active' },
        { student_id: 'p-b', subject: 'SAT', management_status: 'active' },
      ],
      profileNames: { 'p-a': 'Alice', 'p-b': 'Bob', 't-x': '외부 교사' },
    }));
    expect(r.coaches.map((c) => [c.name, c.registered])).toEqual([['Ben', true], ['외부 교사', false]]);
  });

  it('CRM에 있지만 SRM 미연결인 활동 코치는 linked=false로 남긴다', () => {
    const r = buildCoachRoster(input({ coaches: [coach('ben', 'Ben', 't-ben'), coach('new', 'New', null)] }));
    expect(r.coaches.find((c) => c.slug === 'new')).toMatchObject({ linked: false, registered: true, students: [] });
  });
});

// REQ-001 (crm-coach-roster-matching-basis)
describe('buildCoachRoster — 매칭 기준', () => {
  it('진행 중 매칭이 여러 건이면 매칭마다의 코치 아래에 모두 나온다(정리는 SRM에서 Deactivate)', () => {
    const r = buildCoachRoster(input({
      matchingTeachers: [
        { matching_id: 'm1', teacher_id: 't-ben', response: 'accepted' },
        { matching_id: 'm2', teacher_id: 't-julie', response: 'accepted' },
      ],
      matchingStudents: [{ matching_id: 'm1', student_id: 'p-a' }, { matching_id: 'm2', student_id: 'p-a' }],
    }));
    expect(r.coaches.filter((c) => c.students.some((s) => s.profileId === 'p-a')).map((c) => c.name)).toEqual(['Ben', 'Julie']);
  });
});
