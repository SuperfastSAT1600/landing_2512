import { describe, it, expect } from 'vitest';
import {
  COUNTRIES,
  COUNTRIES_BY_CONTINENT,
  findCountry,
  countryFlag,
  countryLabel,
  isCountryCode,
  normalizeCountryCode,
} from '../countries';

describe('countries', () => {
  it('전 세계 국가를 200개 이상 담는다', () => {
    expect(COUNTRIES.length).toBeGreaterThanOrEqual(200);
  });

  it('코드 중복이 없고 모두 대문자 2자리다', () => {
    const codes = COUNTRIES.map((c) => c.code);
    expect(new Set(codes).size).toBe(codes.length);
    for (const code of codes) expect(code).toMatch(/^[A-Z]{2}$/);
  });

  it('모든 국가가 한글명·영문명·대륙을 가진다', () => {
    for (const c of COUNTRIES) {
      expect(c.ko.length).toBeGreaterThan(0);
      expect(c.en.length).toBeGreaterThan(0);
      expect(c.continent.length).toBeGreaterThan(0);
    }
  });

  it('findCountry는 코드로 국가를 찾는다', () => {
    expect(findCountry('PK')?.ko).toBe('파키스탄');
    expect(findCountry('KR')?.ko).toBe('대한민국');
    expect(findCountry('ZZ')).toBeUndefined();
  });

  it('countryFlag은 코드에서 국기 이모지를 만든다', () => {
    expect(countryFlag('US')).toBe('🇺🇸');
    expect(countryFlag('KR')).toBe('🇰🇷');
  });

  it('countryLabel은 국기와 한글명을 붙여준다', () => {
    expect(countryLabel('JP')).toBe('🇯🇵 일본');
  });

  it('알 수 없는 코드는 미지정으로 표시한다', () => {
    expect(countryLabel(null)).toBe('미지정');
    expect(countryLabel('ZZ')).toBe('미지정');
  });

  it('normalizeCountryCode는 소문자·공백을 정규화한다', () => {
    expect(normalizeCountryCode(' pk ')).toBe('PK');
    expect(normalizeCountryCode('')).toBeNull();
    expect(normalizeCountryCode(undefined)).toBeNull();
  });

  it('isCountryCode는 목록에 있는 코드만 통과시킨다', () => {
    expect(isCountryCode('AE')).toBe(true);
    expect(isCountryCode('ZZ')).toBe(false);
  });

  it('대륙별 그룹은 전체 국가를 빠짐없이 나눠 담는다', () => {
    const grouped = COUNTRIES_BY_CONTINENT.flatMap((g) => g.countries);
    expect(grouped.length).toBe(COUNTRIES.length);
    expect(COUNTRIES_BY_CONTINENT.map((g) => g.continent)).toContain('아시아');
  });
});
