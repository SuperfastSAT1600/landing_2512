import { describe, it, expect } from 'vitest';
import { romanizeName, romanizationsOf, matchesRomanized } from '../korean-romanization';

describe('romanizeName — 표준 표기', () => {
  it('기본 음절을 로마자로 편다', () => {
    expect(romanizeName('김도영')).toContain('kimdoyeong');
    expect(romanizeName('박나림')).toContain('baknarim');
  });
});

describe('romanizationsOf — 실제로 쓰이는 변형까지 포함', () => {
  it('성씨의 관용 표기를 포함한다', () => {
    expect(romanizationsOf('이재호')).toContain('leejaeho');
    expect(romanizationsOf('박서준')).toContain('parkseojun');
    expect(romanizationsOf('최민')).toContain('choimin');
    expect(romanizationsOf('정진서')).toContain('chungjinseo');
    expect(romanizationsOf('윤서연')).toContain('yoonseoyeon');
  });

  it('이름 순서가 뒤집힌 표기(given family)도 만든다', () => {
    expect(romanizationsOf('정진서')).toContain('jinseochung');
    expect(romanizationsOf('양하윤')).toContain('hayoonyang');
  });

  it('한글이 없으면 빈 집합', () => {
    expect(romanizationsOf('Chris').size).toBe(0);
  });
});

describe('matchesRomanized', () => {
  it('영문 표기와 한글 이름을 잇는다', () => {
    expect(matchesRomanized('Jinseo Chung', '정진서')).toBe(true);
    expect(matchesRomanized('Hayoon Yang', '양하윤')).toBe(true);
    expect(matchesRomanized('Jaeho Han', '한재호')).toBe(true);
  });

  it('다른 사람은 잇지 않는다', () => {
    expect(matchesRomanized('Jinseo Chung', '김도영')).toBe(false);
    expect(matchesRomanized('Sarah Lee', '박나림')).toBe(false);
  });

  it('영문 이름끼리·한글끼리는 대상이 아니다', () => {
    expect(matchesRomanized('Chris', 'Chris')).toBe(false);
    expect(matchesRomanized('김도영', '김도영')).toBe(false);
  });
});
