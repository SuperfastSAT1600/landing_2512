import { describe, it, expect } from 'vitest';
import type { RenewalTarget } from '@/types/crm';
import { findHiddenCandidates, matchHidden } from '../renewal-hidden-candidates';

function target(studentId: string, over: Partial<RenewalTarget> = {}): RenewalTarget {
  return {
    id: `t-${studentId}-${over.week_start ?? '2026-10-19'}`,
    student_id: studentId,
    week_start: '2026-10-19',
    stage: '1',
    stage_updated_at: '2026-10-19T00:00:00Z',
    converted_payment_id: null,
    drop_reason: null,
    memo: null,
    next_contact_date: null,
    outcome_quality: null,
    outcome_reason_tag: null,
    outcome_reason_note: null,
    carried_to_week: null,
    carried_from_week: null,
    created_by: null,
    created_at: '2026-10-19T00:00:00Z',
    updated_at: '2026-10-19T00:00:00Z',
    student: { id: studentId, name: `이름-${studentId}` } as RenewalTarget['student'],
    ...over,
  };
}

const entry = (id: string) => ({ student: { id } });

describe('findHiddenCandidates', () => {
  it('열린 타깃은 진행 중으로 — 주차 라벨·단계·단계명을 담는다', () => {
    const hidden = findHiddenCandidates({
      listedProfileIds: [],
      entries: [entry('a')],
      openTargets: [target('a', { stage: '1' })],
      enrolled: [],
    });
    expect(hidden).toEqual([
      {
        studentId: 'a',
        name: '이름-a',
        reason: 'in_pipeline',
        detail: '26년 10월 04주차 1단계(최초 컨택 전)',
      },
    ]);
  });

  it('이월된 행·종결 단계는 진행 중이 아니다', () => {
    const hidden = findHiddenCandidates({
      listedProfileIds: [],
      entries: [entry('a'), entry('b')],
      openTargets: [target('a', { carried_to_week: '2026-10-26' }), target('b', { stage: '4' })],
      enrolled: [],
    });
    expect(hidden).toEqual([]);
  });

  it('CRM 수강인데 후보에 없으면 — SRM 계정이 없으면 미연결, 있으면 결제 미등록', () => {
    const hidden = findHiddenCandidates({
      listedProfileIds: [],
      entries: [entry('in-list')],
      openTargets: [],
      enrolled: [
        { id: 'in-list', name: '목록에있음', sfv2_profile_id: 'p0' },
        { id: 'x', name: 'Claire', sfv2_profile_id: null },
        { id: 'y', name: 'Lauren', sfv2_profile_id: 'p1' },
      ],
    });
    expect(hidden.map((h) => [h.name, h.reason])).toEqual([
      ['Claire', 'no_srm_link'],
      ['Lauren', 'no_srm_payment'],
    ]);
  });

  it('같은 SRM 계정을 쓰는 CRM 중복 행은 결제 미등록이 아니다 — 계정이 후보 소스에 있으면 숨은 학생이 아니다', () => {
    const hidden = findHiddenCandidates({
      listedProfileIds: ['p1'],
      entries: [entry('twin-a')],
      openTargets: [],
      enrolled: [
        { id: 'twin-a', name: '쌍둥이A', sfv2_profile_id: 'p1' },
        { id: 'twin-b', name: '쌍둥이B', sfv2_profile_id: 'p1' },
      ],
    });
    expect(hidden).toEqual([]);
  });

  it('한 학생은 한 번만 — 진행 중이 우선한다', () => {
    const hidden = findHiddenCandidates({
      listedProfileIds: [],
      entries: [],
      openTargets: [target('y'), target('y', { week_start: '2026-10-12', id: 'old' })],
      enrolled: [{ id: 'y', name: 'Lauren', sfv2_profile_id: 'p1' }],
    });
    expect(hidden).toHaveLength(1);
    expect(hidden[0].reason).toBe('in_pipeline');
  });

  it('조인된 학생 이름이 없으면 CRM 수강 목록 이름으로 대체한다', () => {
    const hidden = findHiddenCandidates({
      listedProfileIds: [],
      entries: [],
      openTargets: [target('y', { student: undefined })],
      enrolled: [{ id: 'y', name: 'Lauren', sfv2_profile_id: 'p1' }],
    });
    expect(hidden[0].name).toBe('Lauren');
  });
});

describe('matchHidden', () => {
  const list = [
    { studentId: 'a', name: '박주람', reason: 'in_pipeline' as const, detail: '' },
    { studentId: 'b', name: 'Lauren Park', reason: 'no_srm_payment' as const, detail: '' },
  ];
  it('대소문자·앞뒤 공백 무시, 빈 검색어면 전부', () => {
    expect(matchHidden(list, ' lauren ').map((h) => h.studentId)).toEqual(['b']);
    expect(matchHidden(list, '주람').map((h) => h.studentId)).toEqual(['a']);
    expect(matchHidden(list, '')).toHaveLength(2);
  });
});
