import { describe, it, expect } from 'vitest';
import { isPatchFailure, parsePatchInput } from '../_lib/patch-input';

// 검증 순서(= 에러 우선순위)와 코드·메시지를 고정한다. 라우트 테스트가 HTTP 계층을 덮는다.

function failure(body: Record<string, unknown>) {
  const r = parsePatchInput(body);
  if (!isPatchFailure(r)) throw new Error('expected failure');
  return r;
}

describe('parsePatchInput', () => {
  it('빈 본문은 NO_UPDATABLE_FIELDS', () => {
    expect(failure({})).toEqual({ code: 'NO_UPDATABLE_FIELDS', message: '변경할 필드가 없습니다.', status: 400 });
  });

  it('stage 가 유효하지 않으면 INVALID_STAGE (다른 오류보다 먼저)', () => {
    expect(failure({ stage: '9', outcome_quality: 'nope' }).code).toBe('INVALID_STAGE');
    expect(failure({ stage: 3 }).code).toBe('INVALID_STAGE');
  });

  it('품질은 null 또는 허용 값만', () => {
    expect(failure({ outcome_quality: 'nope' }).code).toBe('INVALID_OUTCOME_QUALITY');
    expect(isPatchFailure(parsePatchInput({ outcome_quality: null }))).toBe(false);
  });

  it('사유 태그는 문자열 또는 null', () => {
    expect(failure({ outcome_reason_tag: 5 })).toMatchObject({ code: 'INVALID_OUTCOME_REASON', message: '유효하지 않은 사유입니다.' });
  });

  it('메모는 문자열 또는 null, 1000자 초과 불가 (공백 제거 후 길이)', () => {
    expect(failure({ memo: 1 }).code).toBe('INVALID_MEMO');
    expect(failure({ memo: 'a'.repeat(1001) })).toMatchObject({ code: 'MEMO_TOO_LONG', message: '메모는 1000자까지 가능합니다.' });
    expect(isPatchFailure(parsePatchInput({ memo: `  ${'a'.repeat(1000)}  ` }))).toBe(false);
  });

  it('예정일은 YYYY-MM-DD, 빈 문자열, null 만 허용', () => {
    expect(failure({ next_contact_date: '2026/01/01' }).code).toBe('INVALID_CONTACT_DATE');
    expect(failure({ next_contact_date: 20260101 }).code).toBe('INVALID_CONTACT_DATE');
    expect(isPatchFailure(parsePatchInput({ next_contact_date: '' }))).toBe(false);
    expect(isPatchFailure(parsePatchInput({ next_contact_date: null }))).toBe(false);
  });

  it('통과하면 존재 여부와 정리된 값을 돌려준다', () => {
    const r = parsePatchInput({ memo: '  hi ', outcome_reason_note: ' note ', stage: '4' });
    expect(r).toMatchObject({
      hasStage: true, stage: '4', hasMemo: true, memoText: 'hi', reasonNote: 'note',
      hasQuality: false, hasReason: false, hasContactDate: false,
    });
  });
});
