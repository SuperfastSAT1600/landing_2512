import { describe, it, expect } from 'vitest';
import { localToUTC, utcToLocal, getTimezoneAbbr, TIMEZONE_OPTIONS } from '@/lib/timezone-utils';

describe('TIMEZONE_OPTIONS', () => {
  it('has at least 9 entries', () => {
    expect(TIMEZONE_OPTIONS.length).toBeGreaterThanOrEqual(9);
  });

  it('includes Asia/Seoul as first entry', () => {
    expect(TIMEZONE_OPTIONS[0].iana).toBe('Asia/Seoul');
  });
});

describe('localToUTC', () => {
  it('converts Seoul midnight to UTC (UTC+9)', () => {
    // 2026-12-31 00:00 KST = 2026-12-30 15:00 UTC
    const result = localToUTC('2026-12-31T00:00', 'Asia/Seoul');
    expect(result).toBe('2026-12-30T15:00:00.000Z');
  });

  it('converts Seoul 23:59 to UTC', () => {
    // 2026-12-31 23:59 KST = 2026-12-31 14:59 UTC
    const result = localToUTC('2026-12-31T23:59', 'Asia/Seoul');
    expect(result).toBe('2026-12-31T14:59:00.000Z');
  });

  it('converts New York (EST, UTC-5) to UTC', () => {
    // 2026-12-31 23:59 EST = 2027-01-01 04:59 UTC
    const result = localToUTC('2026-12-31T23:59', 'America/New_York');
    expect(result).toBe('2027-01-01T04:59:00.000Z');
  });

  it('converts Los Angeles (PST, UTC-8) to UTC', () => {
    // 2026-12-31 23:59 PST = 2027-01-01 07:59 UTC
    const result = localToUTC('2026-12-31T23:59', 'America/Los_Angeles');
    expect(result).toBe('2027-01-01T07:59:00.000Z');
  });

  it('converts London (UTC+0 in winter) to UTC', () => {
    // 2026-12-31 23:59 GMT = 2026-12-31 23:59 UTC
    const result = localToUTC('2026-12-31T23:59', 'Europe/London');
    expect(result).toBe('2026-12-31T23:59:00.000Z');
  });

  it('handles New York DST (EDT, UTC-4) in summer', () => {
    // 2026-07-04 12:00 EDT = 2026-07-04 16:00 UTC
    const result = localToUTC('2026-07-04T12:00', 'America/New_York');
    expect(result).toBe('2026-07-04T16:00:00.000Z');
  });

  it('handles Los Angeles DST (PDT, UTC-7) in summer', () => {
    // 2026-06-01 09:00 PDT = 2026-06-01 16:00 UTC
    const result = localToUTC('2026-06-01T09:00', 'America/Los_Angeles');
    expect(result).toBe('2026-06-01T16:00:00.000Z');
  });

  it('handles London BST (UTC+1) in summer', () => {
    // 2026-07-01 12:00 BST = 2026-07-01 11:00 UTC
    const result = localToUTC('2026-07-01T12:00', 'Europe/London');
    expect(result).toBe('2026-07-01T11:00:00.000Z');
  });

  // DST boundary: US spring forward (2026: March 8)
  it('handles US spring-forward boundary (day before DST)', () => {
    // 2026-03-07 23:59 EST (UTC-5) = 2026-03-08 04:59 UTC
    const result = localToUTC('2026-03-07T23:59', 'America/New_York');
    expect(result).toBe('2026-03-08T04:59:00.000Z');
  });

  it('handles US spring-forward boundary (day after DST)', () => {
    // 2026-03-09 00:00 EDT (UTC-4) = 2026-03-09 04:00 UTC
    const result = localToUTC('2026-03-09T00:00', 'America/New_York');
    expect(result).toBe('2026-03-09T04:00:00.000Z');
  });

  // DST boundary: US fall back (2026: November 1)
  it('handles US fall-back boundary (day after fall-back)', () => {
    // 2026-11-02 10:00 EST (UTC-5) = 2026-11-02 15:00 UTC
    const result = localToUTC('2026-11-02T10:00', 'America/New_York');
    expect(result).toBe('2026-11-02T15:00:00.000Z');
  });

  it('does not depend on browser local timezone', () => {
    // Same input, different timezones → different UTC outputs
    const seoul = localToUTC('2026-12-31T12:00', 'Asia/Seoul');
    const newYork = localToUTC('2026-12-31T12:00', 'America/New_York');
    expect(seoul).not.toBe(newYork);
  });
});

describe('utcToLocal', () => {
  it('converts UTC to Seoul local time', () => {
    // 2026-12-31 14:59 UTC = 2026-12-31 23:59 KST
    const result = utcToLocal('2026-12-31T14:59:00.000Z', 'Asia/Seoul');
    expect(result).toBe('2026-12-31T23:59');
  });

  it('converts UTC to New York EST time', () => {
    // 2027-01-01 04:59 UTC = 2026-12-31 23:59 EST
    const result = utcToLocal('2027-01-01T04:59:00.000Z', 'America/New_York');
    expect(result).toBe('2026-12-31T23:59');
  });

  it('converts UTC to Los Angeles PST time', () => {
    // 2027-01-01 07:59 UTC = 2026-12-31 23:59 PST
    const result = utcToLocal('2027-01-01T07:59:00.000Z', 'America/Los_Angeles');
    expect(result).toBe('2026-12-31T23:59');
  });

  it('is inverse of localToUTC', () => {
    const input = '2026-09-15T14:30';
    const timezone = 'America/Chicago';
    const utc = localToUTC(input, timezone);
    const back = utcToLocal(utc, timezone);
    expect(back).toBe(input);
  });
});

describe('getTimezoneAbbr', () => {
  it('returns a non-empty string for Asia/Seoul', () => {
    const date = new Date('2026-12-31T00:00:00Z');
    const abbr = getTimezoneAbbr('Asia/Seoul', date);
    // Node.js may return 'GMT+9', browsers return 'KST' — both are valid
    expect(abbr).toBeTruthy();
    expect(['KST', 'GMT+9']).toContain(abbr);
  });

  it('returns EST for America/New_York in winter', () => {
    const date = new Date('2026-12-31T00:00:00Z');
    expect(getTimezoneAbbr('America/New_York', date)).toBe('EST');
  });

  it('returns EDT for America/New_York in summer', () => {
    const date = new Date('2026-07-04T00:00:00Z');
    expect(getTimezoneAbbr('America/New_York', date)).toBe('EDT');
  });

  it('returns a non-empty string for Asia/Tokyo', () => {
    const date = new Date('2026-12-31T00:00:00Z');
    const abbr = getTimezoneAbbr('Asia/Tokyo', date);
    // Node.js may return 'GMT+9', browsers return 'JST' — both are valid
    expect(abbr).toBeTruthy();
    expect(['JST', 'GMT+9']).toContain(abbr);
  });
});
