import { describe, it, expect } from 'vitest';
import { redact } from '../redact';

describe('redact — REQ-005 원문 비식별', () => {
  it('휴대폰 번호를 표기 형태와 무관하게 가린다', () => {
    for (const raw of ['010-1234-5678', '010 1234 5678', '01012345678', '010.1234.5678']) {
      const { text } = redact(`연락처는 ${raw} 입니다`, { studentName: '김민준' });
      expect(text).toBe('연락처는 [전화번호] 입니다');
    }
  });

  it('지역번호 유선전화도 가린다', () => {
    const { text } = redact('02-555-1234로 전화주세요', { studentName: '김민준' });
    expect(text).toBe('[전화번호]로 전화주세요');
  });

  it('이메일을 가린다', () => {
    const { text } = redact('parent@example.co.kr 로 보내주세요', { studentName: '김민준' });
    expect(text).toBe('[이메일] 로 보내주세요');
  });

  it('카드번호와 계좌번호를 결제정보로 가린다', () => {
    const { text } = redact('카드 5327-1234-5678-9012 로 결제', { studentName: '김민준' });
    expect(text).toBe('카드 [결제정보] 로 결제');
  });

  it('학생 이름을 성명·이름·이-접미사 모두 가린다', () => {
    const opts = { studentName: '김민준' };
    expect(redact('김민준 학생은', opts).text).toBe('[학생] 학생은');
    expect(redact('민준이가 왔어요', opts).text).toBe('[학생]가 왔어요');
    expect(redact('민준 점수가', opts).text).toBe('[학생] 점수가');
  });

  it('학부모 호칭은 학생이 아니라 학부모로 가린다', () => {
    const opts = { studentName: '김민준' };
    expect(redact('민준이 어머니께서', opts).text).toBe('[학부모]께서');
    expect(redact('김민준 아버님이', opts).text).toBe('[학부모]이');
  });

  it('이름 없는 일반 호칭은 식별정보가 아니므로 남긴다', () => {
    const { text } = redact('어머니께서 말씀하시길', { studentName: '김민준' });
    expect(text).toBe('어머니께서 말씀하시길');
  });

  it('치환 건수를 센다', () => {
    const { count } = redact('김민준 010-1234-5678', { studentName: '김민준' });
    expect(count).toBe(2);
  });

  it('가릴 것이 없으면 원문 그대로 0건을 돌려준다', () => {
    const { text, count } = redact('상담사: 안녕하세요', { studentName: '김민준' });
    expect(text).toBe('상담사: 안녕하세요');
    expect(count).toBe(0);
  });

  it('학생 이름이 비어 있어도 연락처 비식별은 동작한다', () => {
    const { text } = redact('010-1234-5678', { studentName: '' });
    expect(text).toBe('[전화번호]');
  });
});
