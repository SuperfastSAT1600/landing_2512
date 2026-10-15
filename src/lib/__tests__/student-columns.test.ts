import { describe, it, expect } from 'vitest';
import { STUDENT_COLUMN_LIST, STUDENT_COLUMNS } from '../student-columns';

describe('STUDENT_COLUMNS — CRM 학생 조회 컬럼', () => {
  it('embedding·passcode는 내려보내지 않는다', () => {
    for (const c of ['embedding', 'passcode_hash', 'passcode_attempts', 'passcode_locked_until']) {
      expect(STUDENT_COLUMN_LIST).not.toContain(c);
    }
  });
  it('화면이 쓰는 핵심·비타입 컬럼은 포함', () => {
    for (const c of ['id', 'name', 'consultation_timeline', 'sfv2_profile_id', 'service_status', 'comm_language', 'signup_token']) {
      expect(STUDENT_COLUMN_LIST).toContain(c);
    }
  });
  it('중복 없이 쉼표로 이어진 select 문자열', () => {
    expect(new Set(STUDENT_COLUMN_LIST).size).toBe(STUDENT_COLUMN_LIST.length);
    expect(STUDENT_COLUMNS.split(', ')).toEqual([...STUDENT_COLUMN_LIST]);
  });
});
