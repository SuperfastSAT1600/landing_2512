import { describe, it, expect } from 'vitest';
import {
  isNicknameLike,
  stripOperatorTags,
  buildStudentMatchIndex,
  resolveResultOwner,
  planFunnelBackfill,
  DIAGNOSTIC_DONE_STAGE,
  type BackfillStudent,
  type BackfillResult,
  type BackfillToken,
} from '../diagnostic-backfill';

const students: BackfillStudent[] = [
  { id: 's1', name: '손호원', parent_phone: '010-1111-2222', diagnostic_funnel_stage: null },
  { id: 's2', name: '김경빈', parent_phone: '010-3333-4444', diagnostic_funnel_stage: 3 },
  { id: 's3', name: '이미완', parent_phone: null, diagnostic_funnel_stage: 5 },
  { id: 's4', name: 'Joseph', parent_phone: null, diagnostic_funnel_stage: null },
  { id: 's5', name: 'Joseph', parent_phone: null, diagnostic_funnel_stage: null },
];
const index = buildStudentMatchIndex(students);

const result = (over: Partial<BackfillResult>): BackfillResult => ({
  id: 'r1',
  token_id: null,
  student_id: null,
  student_name: null,
  submitted_at: '2026-05-01T00:00:00Z',
  test_id: 't1',
  ...over,
});

describe('stripOperatorTags', () => {
  it('운영자가 붙인 꼬리표를 떼어낸다', () => {
    expect(stripOperatorTags('손호원 수정')).toBe('손호원');
    expect(stripOperatorTags('김한비 재시험')).toBe('김한비');
    expect(stripOperatorTags('노우현(2차)')).toBe('노우현');
    expect(stripOperatorTags('나혜령(공부하는 아이들)')).toBe('나혜령');
  });

  it('멀쩡한 이름은 건드리지 않는다', () => {
    expect(stripOperatorTags('Connor Shon')).toBe('Connor Shon');
  });
});

describe('isNicknameLike — 이름만으로 확정하기 위험한 표기', () => {
  it('성 없는 한글 2자·라틴 단일 토큰은 위험하다', () => {
    expect(isNicknameLike('준오')).toBe(true);
    expect(isNicknameLike('하늘')).toBe(true);
    expect(isNicknameLike('Chris')).toBe(true);
    expect(isNicknameLike('eunice')).toBe(true);
  });

  it('성+이름 형태는 위험하지 않다', () => {
    expect(isNicknameLike('김경빈')).toBe(false);
    expect(isNicknameLike('Connor Shon')).toBe(false);
    expect(isNicknameLike('Elise kim')).toBe(false);
  });
});

describe('resolveResultOwner — 증거가 강한 순서로 본다', () => {
  it('결과에 박힌 student_id가 최우선', () => {
    expect(resolveResultOwner(result({ student_id: 's2' }), null, index)).toMatchObject({
      student_id: 's2',
      how: 'result.student_id',
    });
  });

  it('토큰 전화번호로 학생을 찾는다 (표기 달라도 숫자만 비교)', () => {
    const token: BackfillToken = { id: 'k1', student_name: null, phone_number: '01011112222' };
    expect(resolveResultOwner(result({ token_id: 'k1' }), token, index)).toMatchObject({
      student_id: 's1',
      how: 'phone',
    });
  });

  it('이름이 유일하게 일치하면 매칭', () => {
    expect(resolveResultOwner(result({ student_name: '손호원' }), null, index)).toMatchObject({
      student_id: 's1',
      how: 'name-unique',
    });
  });

  it('꼬리표를 떼면 찾아지는 경우를 회수한다', () => {
    expect(resolveResultOwner(result({ student_name: '손호원 수정' }), null, index)).toMatchObject({
      student_id: 's1',
      how: 'name-stripped',
    });
  });

  it('동명이인은 확정하지 않는다', () => {
    expect(resolveResultOwner(result({ student_name: 'Joseph' }), null, index)).toMatchObject({
      student_id: null,
      how: 'name-ambiguous(2)',
    });
  });

  it('CRM에 없는 이름은 no-candidate', () => {
    expect(resolveResultOwner(result({ student_name: '없는사람' }), null, index).how).toBe(
      'no-candidate'
    );
  });

  it('이름이 비면 no-name (시드/데모 제출물)', () => {
    expect(resolveResultOwner(result({ student_name: '' }), null, index).how).toBe('no-name');
  });
});

describe('planFunnelBackfill', () => {
  const tokens: BackfillToken[] = [{ id: 'k1', student_name: null, phone_number: '01011112222' }];

  it('미제출 결과는 완료로 보지 않는다', () => {
    const plan = planFunnelBackfill(
      [result({ student_id: 's1', submitted_at: null })],
      tokens,
      students
    );
    expect(plan.updates).toHaveLength(0);
  });

  it('퍼널이 비었거나 3 이하인 학생만 갱신 대상이다', () => {
    const plan = planFunnelBackfill(
      [
        result({ id: 'r1', student_id: 's1' }),
        result({ id: 'r2', student_id: 's2' }),
        result({ id: 'r3', student_id: 's3' }),
      ],
      tokens,
      students
    );
    expect(plan.updates.map((u) => u.student_id).sort()).toEqual(['s1', 's2']);
    expect(plan.alreadyDone).toBe(1);
    expect(plan.updates.every((u) => u.to === DIAGNOSTIC_DONE_STAGE)).toBe(true);
    expect(plan.updates.find((u) => u.student_id === 's2')!.from).toBe(3);
  });

  it('같은 학생의 여러 응시는 최초 응시일로 한 건만 남긴다', () => {
    const plan = planFunnelBackfill(
      [
        result({ id: 'r1', student_id: 's1', submitted_at: '2026-05-10T00:00:00Z' }),
        result({ id: 'r2', student_id: 's1', submitted_at: '2026-04-01T00:00:00Z' }),
      ],
      tokens,
      students
    );
    expect(plan.updates).toHaveLength(1);
    expect(plan.updates[0].submitted_at).toBe('2026-04-01T00:00:00Z');
  });

  it('닉네임형 이름은 이름만으로 확정하지 않고 수기 확인으로 넘긴다', () => {
    const nickname: BackfillStudent[] = [
      { id: 'n1', name: '하늘', parent_phone: null, diagnostic_funnel_stage: null },
    ];
    const plan = planFunnelBackfill([result({ student_name: '하늘' })], [], nickname);
    expect(plan.updates).toHaveLength(0);
    expect(plan.manual[0]).toMatchObject({ how: 'name-nickname-review' });
  });

  it('닉네임이어도 전화번호로 잡혔으면 그대로 반영한다', () => {
    const nickname: BackfillStudent[] = [
      { id: 'n1', name: '하늘', parent_phone: '010-9999-8888', diagnostic_funnel_stage: null },
    ];
    const tok: BackfillToken[] = [{ id: 'k9', student_name: '하늘', phone_number: '01099998888' }];
    const plan = planFunnelBackfill([result({ token_id: 'k9' })], tok, nickname);
    expect(plan.updates).toHaveLength(1);
    expect(plan.updates[0].how).toBe('phone');
  });

  it('매칭 못 한 건은 사람이 볼 수 있게 분리해 내보낸다', () => {
    const plan = planFunnelBackfill(
      [result({ id: 'r1', student_name: 'Joseph' }), result({ id: 'r2', student_name: '' })],
      tokens,
      students
    );
    expect(plan.manual.map((m) => m.how)).toContain('name-ambiguous(2)');
    expect(plan.unnamed).toBe(1);
    expect(plan.manual.some((m) => m.how === 'no-name')).toBe(false);
  });
});
