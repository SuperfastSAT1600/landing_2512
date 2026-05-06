export interface TimezoneOption {
  country: string;
  iana: string;
  label: string;
}

export const TIMEZONE_OPTIONS: TimezoneOption[] = [
  { country: '한국', iana: 'Asia/Seoul', label: '한국 표준시' },
  { country: '미국', iana: 'America/New_York', label: '동부 시간 (ET)' },
  { country: '미국', iana: 'America/Chicago', label: '중부 시간 (CT)' },
  { country: '미국', iana: 'America/Denver', label: '산지 시간 (MT)' },
  { country: '미국', iana: 'America/Los_Angeles', label: '태평양 시간 (PT)' },
  { country: '캐나다', iana: 'America/Toronto', label: '동부 시간 (토론토)' },
  { country: '캐나다', iana: 'America/Vancouver', label: '태평양 시간 (밴쿠버)' },
  { country: '일본', iana: 'Asia/Tokyo', label: '일본 표준시' },
  { country: '영국', iana: 'Europe/London', label: '영국 시간' },
];

// Groups timezones by country for optgroup rendering
export function getTimezonesByCountry(): Record<string, TimezoneOption[]> {
  return TIMEZONE_OPTIONS.reduce<Record<string, TimezoneOption[]>>((acc, tz) => {
    if (!acc[tz.country]) acc[tz.country] = [];
    acc[tz.country].push(tz);
    return acc;
  }, {});
}

/**
 * Convert a datetime-local string interpreted in `timezone` to a UTC ISO string.
 * Does NOT rely on `new Date(datetimeLocal)` which uses browser local timezone.
 *
 * Algorithm:
 * 1. Parse the datetime-local string directly to get Y/M/D/H/min
 * 2. Create a "naive UTC" Date treating local values as UTC
 * 3. Format this naive UTC in the target timezone → get the local time it represents
 * 4. offset = naiveUTC(ms) - localFromNaive(ms)
 * 5. actualUTC = naiveUTC + offset
 */
export function localToUTC(datetimeLocal: string, timezone: string): string {
  // Parse "YYYY-MM-DDTHH:mm" without relying on Date constructor interpretation
  const match = datetimeLocal.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!match) throw new Error(`Invalid datetime-local value: ${datetimeLocal}`);
  const [, y, mo, d, h, min] = match.map(Number);

  const naiveUTC = new Date(Date.UTC(y, mo - 1, d, h, min, 0, 0));

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(naiveUTC);
  const get = (type: string) => Number(parts.find((p) => p.type === type)!.value);

  let hour = get('hour');
  // Intl can return 24 for midnight
  if (hour === 24) hour = 0;

  const localFromNaive = new Date(Date.UTC(get('year'), get('month') - 1, get('day'), hour, get('minute'), 0, 0));

  const offsetMs = naiveUTC.getTime() - localFromNaive.getTime();
  return new Date(naiveUTC.getTime() + offsetMs).toISOString();
}

/**
 * Convert a UTC ISO string to a datetime-local string in the given timezone.
 * Returns "YYYY-MM-DDTHH:mm" format suitable for datetime-local inputs.
 */
export function utcToLocal(utcIso: string, timezone: string): string {
  const date = new Date(utcIso);

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)!.value;

  let hour = get('hour');
  if (hour === '24') hour = '00';

  return `${get('year')}-${get('month')}-${get('day')}T${hour}:${get('minute')}`;
}

/**
 * Get the short timezone abbreviation (e.g. "KST", "EST", "PDT").
 */
export function getTimezoneAbbr(timezone: string, date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    timeZoneName: 'short',
  }).formatToParts(date);
  return parts.find((p) => p.type === 'timeZoneName')?.value ?? timezone;
}

/**
 * Get UTC offset label, e.g. "UTC+9" or "UTC-5".
 */
export function getUTCOffsetLabel(timezone: string, date: Date = new Date()): string {
  // Use 'sv' locale which formats as "YYYY-MM-DD HH:mm:ss" — ISO-like, easy to parse
  const localStr = date.toLocaleString('sv', { timeZone: timezone });
  const localAsUTC = new Date(localStr.replace(' ', 'T') + 'Z');
  const offsetMs = localAsUTC.getTime() - date.getTime();
  const offsetHours = offsetMs / (1000 * 60 * 60);
  const sign = offsetHours >= 0 ? '+' : '-';
  const abs = Math.abs(offsetHours);
  const h = Math.floor(abs);
  const m = Math.round((abs - h) * 60);
  if (m === 0) return `UTC${sign}${h}`;
  return `UTC${sign}${h}:${String(m).padStart(2, '0')}`;
}
