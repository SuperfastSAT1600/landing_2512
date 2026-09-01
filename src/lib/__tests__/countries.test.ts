import { describe, it, expect } from 'vitest';
import {
  COUNTRIES,
  findCountry,
  countryFlag,
  countryLabel,
  countryLabelFull,
  searchCountries,
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

  it('countryLabelFull은 한글·영문을 병기한다', () => {
    expect(countryLabelFull('PK')).toBe('🇵🇰 파키스탄 · Pakistan');
    expect(countryLabelFull(null)).toBe('미지정');
  });

  it('여섯 대륙이 모두 채워져 있다', () => {
    const continents = new Set(COUNTRIES.map((c) => c.continent));
    expect(continents.size).toBe(6);
    expect(continents.has('아시아')).toBe(true);
  });
});

describe('searchCountries', () => {
  const codes = (q: string) => searchCountries(q).map((c) => c.code);

  it('영문명으로 찾는다(대소문자 무시)', () => {
    expect(codes('pakistan')).toContain('PK');
    expect(codes('PaKiStAn')).toContain('PK');
    expect(codes('united arab')).toContain('AE');
  });

  it('한글명으로 찾는다(부분 일치)', () => {
    expect(codes('파키')).toContain('PK');
    expect(codes('아랍')).toContain('AE');
  });

  it('국가 코드로 찾는다', () => {
    expect(codes('pk')[0]).toBe('PK');
    expect(codes('KR')[0]).toBe('KR');
  });

  it('앞글자 일치를 부분 일치보다 앞에 둔다', () => {
    // "in"은 India(앞글자)와 Argentina(중간 포함) 모두에 걸린다.
    const result = codes('in');
    expect(result.indexOf('IN')).toBeLessThan(result.indexOf('AR'));
  });

  it('빈 검색어는 자주 쓰는 국가를 앞세운 전체 목록을 준다', () => {
    const all = searchCountries('');
    expect(all.length).toBe(COUNTRIES.length);
    expect(all[0].code).toBe('PK');
  });

  it('매치가 없으면 빈 배열', () => {
    expect(searchCountries('존재하지않는나라이름')).toEqual([]);
  });

  it('공백만 있는 검색어는 빈 검색어와 같게 다룬다', () => {
    expect(searchCountries('   ').length).toBe(COUNTRIES.length);
  });
});
