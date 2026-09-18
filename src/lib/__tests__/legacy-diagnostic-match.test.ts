import { describe, it, expect } from 'vitest';
import {
  normalizeName,
  nameKeys,
  normalizeGrade,
  buildStudentIndex,
  matchAttempt,
  buildReviewRows,
  validateManualMatches,
  type StudentRow,
} from '../legacy-diagnostic-match';

const students: StudentRow[] = [
  { id: 's1', name: '김지인', grade: '11th', inquiry_date: '2025-07-01T00:00:00' },
  { id: 's2', name: '김연준/Roy Kim', grade: '12th', inquiry_date: '2025-06-20T00:00:00' },
  { id: 's3', name: '김재연', grade: '12th', inquiry_date: '2025-07-05T00:00:00' },
  { id: 's4', name: '김재연', grade: '10th', inquiry_date: '2024-11-01T00:00:00' },
];
const index = buildStudentIndex(students);

describe('normalizeName / nameKeys (REQ-005)', () => {
  it('공백·구두점·대소문자를 흡수한다', () => {
    expect(normalizeName(' 김 지인 ')).toBe('김지인');
    expect(normalizeName('Roy  Kim')).toBe('roykim');
    expect(normalizeName('김-지인')).toBe('김지인');
  });

  it('병기명은 양쪽 모두 키가 된다', () => {
    expect(nameKeys('김연준/Roy Kim').sort()).toEqual(['roykim', '김연준']);
    expect(nameKeys('김연준(Roy)').sort()).toEqual(['roy', '김연준']);
  });

  it('빈 이름은 키가 없다', () => {
    expect(nameKeys('  ')).toEqual([]);
  });
});

describe('normalizeGrade (REQ-005)', () => {
  it('표기가 달라도 학년 숫자로 모은다', () => {
    expect(normalizeGrade('US12')).toBe('12');
    expect(normalizeGrade('12th')).toBe('12');
    expect(normalizeGrade('Grade 11')).toBe('11');
    expect(normalizeGrade('고1')).toBe('1');
  });

  it('값이 없거나 하이픈이면 null', () => {
    expect(normalizeGrade('-')).toBeNull();
    expect(normalizeGrade('')).toBeNull();
    expect(normalizeGrade(null)).toBeNull();
  });
});

describe('matchAttempt (REQ-005)', () => {
  it('유일 일치는 auto_exact/high', () => {
    const r = matchAttempt(
      {
        id: 'r1',
        student_name: '김지인',
        student_grade: 'US11',
        taken_at: '2025-07-05T01:00:00.000Z',
      },
      index
    );
    expect(r.student_id).toBe('s1');
    expect(r.match_method).toBe('auto_exact');
    expect(r.match_confidence).toBe('high');
  });

  it('병기명으로도 찾는다', () => {
    const r = matchAttempt(
      {
        id: 'r2',
        student_name: 'Roy Kim',
        student_grade: 'US12',
        taken_at: '2025-07-01T00:00:00.000Z',
      },
      index
    );
    expect(r.student_id).toBe('s2');
  });

  it('학년이 어긋나도 응시일이 문의일과 가까우면 확신한다 — CRM 학년은 신뢰할 수 없는 필드다', () => {
    // s1 김지인의 inquiry_date = 2025-07-01, 응시 2025-07-05 → 4일 차
    const r = matchAttempt(
      {
        id: 'r3',
        student_name: '김지인',
        student_grade: 'US9',
        taken_at: '2025-07-05T01:00:00.000Z',
      },
      index
    );
    expect(r.student_id).toBe('s1');
    expect(r.match_confidence).toBe('high');
    expect(r.match_note).toContain('응시일 근접');
  });

  it('학년도 어긋나고 응시일도 멀면 확신도를 낮춘다', () => {
    const r = matchAttempt(
      {
        id: 'r3b',
        student_name: '김지인',
        student_grade: 'US9',
        taken_at: '2026-07-05T01:00:00.000Z',
      },
      index
    );
    expect(r.student_id).toBe('s1');
    expect(r.match_confidence).toBe('medium');
    expect(r.match_note).toContain('학년 불일치');
  });

  it('동명이인은 학년+응시일 창으로 하나만 남을 때에만 확정한다', () => {
    const r = matchAttempt(
      {
        id: 'r4',
        student_name: '김재연',
        student_grade: 'US12',
        taken_at: '2025-07-09T00:00:00.000Z',
      },
      index
    );
    expect(r.student_id).toBe('s3');
    expect(r.match_method).toBe('auto_grade_window');
    expect(r.match_confidence).toBe('medium');
  });

  it('동명이인이라도 응시일 창에 한 명만 들면 학년 없이 확정한다', () => {
    // s3 김재연(문의 2025-07-05) vs s4 김재연(2024-11-01) — 학년 정보를 주지 않아도 갈린다
    const r = matchAttempt(
      {
        id: 'r4b',
        student_name: '김재연',
        student_grade: null,
        taken_at: '2025-07-09T00:00:00.000Z',
      },
      index
    );
    expect(r.student_id).toBe('s3');
    expect(r.match_note).toContain('응시일');
  });

  it('동명이인을 좁히지 못하면 미확정으로 남기고 후보를 보고한다', () => {
    const r = matchAttempt(
      { id: 'r5', student_name: '김재연', student_grade: null, taken_at: null },
      index
    );
    expect(r.student_id).toBeNull();
    expect(r.match_method).toBeNull();
    expect(r.candidates).toHaveLength(2);
  });

  it('응시일이 문의일에서 60일 넘게 떨어지면 창 밖이다', () => {
    const r = matchAttempt(
      {
        id: 'r6',
        student_name: '김재연',
        student_grade: 'US12',
        taken_at: '2026-01-01T00:00:00.000Z',
      },
      index
    );
    expect(r.student_id).toBeNull();
  });

  it('후보가 없으면 미확정', () => {
    const r = matchAttempt(
      { id: 'r7', student_name: 'sadg', student_grade: null, taken_at: null },
      index
    );
    expect(r.student_id).toBeNull();
    expect(r.candidates).toEqual([]);
    expect(r.match_note).toContain('후보 없음');
  });
});

describe('buildReviewRows (REQ-006)', () => {
  it('사람이 채울 확정 열을 빈 칸으로 포함한다', () => {
    const attempt = { id: 'r5', student_name: '김재연', student_grade: null, taken_at: null };
    const [row] = buildReviewRows([{ attempt, score: 848, outcome: matchAttempt(attempt, index) }]);
    expect(row.record_id).toBe('r5');
    expect(row.confirm_student_id).toBe('');
    expect(row.confirm_is_internal).toBe('');
    expect(row.candidate_1).toContain('s3');
    expect(row.candidate_2).toContain('s4');
  });
});

describe('validateManualMatches (REQ-006)', () => {
  const validIds = new Set(['s1', 's3']);

  it('확정 열이 빈 행은 건너뛴다', () => {
    const { updates, errors } = validateManualMatches(
      [{ record_id: 'r1', confirm_student_id: '', confirm_is_internal: '' }],
      validIds
    );
    expect(updates).toHaveLength(0);
    expect(errors).toHaveLength(0);
  });

  it('존재하지 않는 student_id는 에러로 보고하고 반영하지 않는다', () => {
    const { updates, errors } = validateManualMatches(
      [{ record_id: 'r1', confirm_student_id: 'nope', confirm_is_internal: '' }],
      validIds
    );
    expect(updates).toHaveLength(0);
    expect(errors[0]).toContain('nope');
  });

  it('같은 학생에 두 응시를 붙이는 것은 허용한다(재응시)', () => {
    const { updates, errors } = validateManualMatches(
      [
        { record_id: 'r1', confirm_student_id: 's1', confirm_is_internal: '' },
        { record_id: 'r2', confirm_student_id: 's1', confirm_is_internal: '' },
      ],
      validIds
    );
    expect(updates).toHaveLength(2);
    expect(errors).toHaveLength(0);
  });

  it('같은 record_id가 두 번 나오면 에러', () => {
    const { errors } = validateManualMatches(
      [
        { record_id: 'r1', confirm_student_id: 's1', confirm_is_internal: '' },
        { record_id: 'r1', confirm_student_id: 's3', confirm_is_internal: '' },
      ],
      validIds
    );
    expect(errors[0]).toContain('r1');
  });

  it('"동일인 아님" 판정도 기록한다 — 기록하지 않으면 다음 실행 때 또 물어보게 된다', () => {
    const { updates, errors } = validateManualMatches(
      [{ record_id: 'r8', confirm_student_id: '', confirm_no_match: 'y' }],
      validIds
    );
    expect(errors).toHaveLength(0);
    expect(updates).toEqual([
      { record_id: 'r8', student_id: null, is_internal: false, no_match: true },
    ]);
  });

  it('학생을 지정하면서 동시에 "아님"을 표시하는 건 모순이라 거른다', () => {
    const { updates, errors } = validateManualMatches(
      [{ record_id: 'r8', confirm_student_id: 's1', confirm_no_match: 'y' }],
      validIds
    );
    expect(updates).toHaveLength(0);
    expect(errors[0]).toContain('r8');
  });

  it('내부 표시만 하고 학생은 비울 수 있다', () => {
    const { updates } = validateManualMatches(
      [{ record_id: 'r9', confirm_student_id: '', confirm_is_internal: 'y' }],
      validIds
    );
    expect(updates).toEqual([{ record_id: 'r9', student_id: null, is_internal: true }]);
  });
});

describe('로마자 표기 대조 (REQ-005)', () => {
  const romanIndex = buildStudentIndex([
    { id: 'k1', name: '정진서', grade: '10th', inquiry_date: '2025-09-11T00:00:00' },
    { id: 'k2', name: '성연아', grade: '11th', inquiry_date: '2025-09-09T00:00:00' },
  ]);

  it('영문으로 적은 응시자를 CRM 한글명과 잇는다', () => {
    const r = matchAttempt(
      {
        id: 'x1',
        student_name: 'Jinseo Chung',
        student_grade: 'US10',
        taken_at: '2025-09-12T00:00:00Z',
      },
      romanIndex
    );
    expect(r.student_id).toBe('k1');
    expect(r.match_note).toContain('로마자 표기 대조(정진서)');
  });

  it('영어식 순서(이름+성)도 잡는다', () => {
    const r = matchAttempt(
      {
        id: 'x2',
        student_name: 'Yuna Seong',
        student_grade: 'US11',
        taken_at: '2025-09-09T00:00:00Z',
      },
      romanIndex
    );
    expect(r.student_id).toBe('k2');
  });

  it('문자 그대로 일치한 건은 로마자 표기라고 적지 않는다', () => {
    const r = matchAttempt(
      { id: 'x3', student_name: '정진서', student_grade: 'US10', taken_at: '2025-09-12T00:00:00Z' },
      romanIndex
    );
    expect(r.match_note).toBe('이름 유일 일치');
  });
});
