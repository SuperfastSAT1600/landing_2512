import { describe, it, expect } from 'vitest';
import { buildTimezoneOptions, getTimezoneLabel, QUICK_PICK_VALUES } from '@/lib/all-timezones';

describe('buildTimezoneOptions', () => {
  const options = buildTimezoneOptions();

  it('returns the full worldwide IANA zone list (300+)', () => {
    expect(options.length).toBeGreaterThan(300);
  });

  it('includes common and less-common zones', () => {
    const values = options.map((o) => o.iana);
    expect(values).toContain('Asia/Seoul');
    expect(values).toContain('Asia/Ho_Chi_Minh');
    expect(values).toContain('America/New_York');
  });

  it('has no duplicate zones', () => {
    const values = options.map((o) => o.iana);
    expect(new Set(values).size).toBe(values.length);
  });

  it('resolves Korean + English country names, city and offset', () => {
    const seoul = options.find((o) => o.iana === 'Asia/Seoul')!;
    expect(seoul.koCountry).toBe('대한민국');
    expect(seoul.enCountry).toBe('South Korea');
    expect(seoul.city).toBe('Seoul');
    expect(seoul.offsetLabel).toMatch(/UTC\+9/);

    const vn = options.find((o) => o.iana === 'Asia/Ho_Chi_Minh')!;
    expect(vn.koCountry).toBe('베트남');
    expect(vn.city).toBe('Ho Chi Minh');
  });

  it('builds lowercase keywords covering country, city, iana and offset', () => {
    const seoul = options.find((o) => o.iana === 'Asia/Seoul')!;
    expect(seoul.keywords).toBe(seoul.keywords.toLowerCase());
    expect(seoul.keywords).toContain('대한민국');
    expect(seoul.keywords).toContain('south korea');
    expect(seoul.keywords).toContain('seoul');
    expect(seoul.keywords).toContain('asia/seoul');
  });

  it('places quick-pick zones first, Asia/Seoul at the top', () => {
    expect(options[0].iana).toBe('Asia/Seoul');
    const leading = options.slice(0, QUICK_PICK_VALUES.length).map((o) => o.iana);
    expect(leading).toEqual([...QUICK_PICK_VALUES]);
  });
});

describe('getTimezoneLabel', () => {
  it('returns a human label for a known zone', () => {
    const label = getTimezoneLabel('Asia/Seoul');
    expect(label).toContain('대한민국');
    expect(label).toContain('Seoul');
  });

  it('falls back to the raw value for an unknown zone', () => {
    expect(getTimezoneLabel('Not/AZone')).toBe('Not/AZone');
  });

  it('returns empty string for empty input', () => {
    expect(getTimezoneLabel('')).toBe('');
  });
});
