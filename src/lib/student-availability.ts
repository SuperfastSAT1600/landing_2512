// SFv2 scheduled_availability_slots(학생 현지 시간) -> KST 변환.
// .claude/skills/student-availability/scripts/student-availability.py 와 같은 규칙: DST 전환이 유효 기간 안에 있으면 구간을 나눈다.

export interface AvailabilitySlot {
  weekday: number; // 0 = 월요일
  start_minute_local: number;
  end_minute_local: number;
  tz: string | null;
  effective_from: string | null;
  effective_until: string | null;
  notes: string | null;
}

export interface AvailabilityLine {
  weekdayKst: number;
  start: string;
  end: string;
  weekdayLocal: number;
  startLocal: string;
  endLocal: string;
  /** 오늘(KST) 이후 가장 가까운 해당 요일의 날짜(YYYY-MM-DD). 유효 기간 안에 없으면 null */
  dateKst: string | null;
  dateLocal: string | null;
  notes: string | null;
}

export interface AvailabilityBlock {
  period: string;
  lines: AvailabilityLine[];
}

export interface AvailabilitySummary {
  studentTz: string;
  blocks: AvailabilityBlock[];
}

const FALLBACK_TZ = 'America/Los_Angeles';
const KST_OFFSET_MIN = 9 * 60;
const DAY_MIN = 24 * 60;
const DAY_MS = DAY_MIN * 60_000;
// DST 분할은 시작일부터 1년까지만 본다 — 종료일이 2099처럼 멀면 구간이 수백 개로 쪼개지고 서버 렌더가 느려진다
const DST_SCAN_DAYS = 366;

const mod = (n: number, m: number) => ((n % m) + m) % m;
const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const isoDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const dayMs = (iso: string) => Date.parse(`${iso.slice(0, 10)}T00:00:00Z`);

function resolveTz(tz: string | null): string {
  const name = tz || FALLBACK_TZ;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: name });
    return name;
  } catch {
    return FALLBACK_TZ;
  }
}

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatter(tz: string, style: 'longOffset' | 'short'): Intl.DateTimeFormat {
  const key = `${tz}|${style}`;
  let f = formatters.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: style });
    formatters.set(key, f);
  }
  return f;
}

function zoneName(tz: string, utcMs: number, style: 'longOffset' | 'short'): string {
  return formatter(tz, style).formatToParts(new Date(utcMs)).find((p) => p.type === 'timeZoneName')?.value ?? '';
}

function offsetAt(tz: string, utcMs: number): number {
  const m = /GMT([+-])(\d{1,2})(?::?(\d{2}))?/.exec(zoneName(tz, utcMs, 'longOffset'));
  if (!m) return 0;
  return (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3] ?? 0));
}

// 해당 날짜의 현지 정오 시각(UTC ms) — DST 전환일에도 안전
function localNoonMs(tz: string, midnightUtcMs: number): number {
  const guess = midnightUtcMs + 12 * 60 * 60_000;
  return guess - offsetAt(tz, guess) * 60_000;
}

const utcLabel = (offsetMin: number) => `UTC${offsetMin >= 0 ? '+' : '-'}${Math.abs(offsetMin / 60)}`;

// EDT/PST 같은 약어가 있으면 그대로, 없는 시간대(Intl이 "GMT+9"로 주는 곳)는 UTC 오프셋으로 표기
function zoneAbbr(tz: string, noonMs: number): string {
  const short = zoneName(tz, noonMs, 'short');
  return /^GMT/.test(short) ? utcLabel(offsetAt(tz, noonMs)) : short;
}

interface Segment { from: string | null; until: string | null; diff: number; abbr: string }

function splitByDst(tz: string, effFrom: string | null, effUntil: string | null, today: Date): Segment[] {
  const start = effFrom ? dayMs(effFrom) : dayMs(isoDay(today.getTime()));
  const end = effUntil ? dayMs(effUntil) : start; // 종료일 미입력 -> 시작일 한 구간만
  const segmentAt = (ms: number): Segment => {
    const noon = localNoonMs(tz, ms);
    return { from: isoDay(ms), until: null, diff: KST_OFFSET_MIN - offsetAt(tz, noon), abbr: zoneAbbr(tz, noon) };
  };

  const segments = [segmentAt(start)];
  const scanEnd = Math.min(end, start + DST_SCAN_DAYS * DAY_MS);
  for (let d = start + DAY_MS; d <= scanEnd; d += DAY_MS) {
    const seg = segmentAt(d);
    const last = segments[segments.length - 1];
    if (seg.diff !== last.diff) {
      last.until = isoDay(d - DAY_MS);
      segments.push(seg);
    }
  }
  segments[0].from = effFrom ? effFrom.slice(0, 10) : null;
  segments[segments.length - 1].until = effUntil ? effUntil.slice(0, 10) : null;
  return segments;
}

function formatPeriod(from: string | null, until: string | null): string {
  if (from && until) return `${from} ~ ${until}`;
  if (from) return `${from} ~`;
  return '기간 미지정';
}

function tzLabel(tz: string, effFrom: string | null, today: Date): string {
  const noon = localNoonMs(tz, effFrom ? dayMs(effFrom) : dayMs(isoDay(today.getTime())));
  const abbr = zoneAbbr(tz, noon);
  const utc = utcLabel(offsetAt(tz, noon));
  return abbr === utc ? `${tz} (${utc})` : `${tz} (${abbr}, ${utc})`;
}

interface Converted extends AvailabilityLine { tz: string; abbr: string; from: string | null; until: string | null }

const weekdayOf = (ms: number) => mod(new Date(ms).getUTCDay() + 6, 7); // 0 = 월요일

// 유효 기간(from/until)은 학생 현지 달력이다. 현지 날짜 공간에서 센 뒤 KST로 옮긴다.
// 오늘(KST) 이후이면서 유효 시작일 이후인 첫 해당 요일의 현지 날짜를 찾고, 유효 종료일을 넘으면 null.
function nextDatesMs(today: Date, from: string | null, until: string | null, weekdayLocal: number, dayShift: number) {
  const todayKst = dayMs(isoDay(today.getTime() + KST_OFFSET_MIN * 60_000));
  const start = Math.max(todayKst - dayShift * DAY_MS, from ? dayMs(from) : -Infinity);
  const local = start + mod(weekdayLocal - weekdayOf(start), 7) * DAY_MS;
  if (until && local > dayMs(until)) return null;
  return { local, kst: local + dayShift * DAY_MS };
}

function convert(slot: AvailabilitySlot, today: Date): Converted[] {
  const tz = resolveTz(slot.tz);
  return splitByDst(tz, slot.effective_from, slot.effective_until, today).map((seg) => {
    const startKst = slot.start_minute_local + seg.diff;
    const endKst = slot.end_minute_local + seg.diff;
    const dayShift = Math.floor(startKst / DAY_MIN);
    const weekdayKst = mod(slot.weekday + dayShift, 7);
    const weekdayLocal = mod(slot.weekday, 7);
    const dates = nextDatesMs(today, seg.from, seg.until, weekdayLocal, dayShift);
    return {
      tz, abbr: seg.abbr, from: seg.from, until: seg.until,
      weekdayKst,
      dateKst: dates ? isoDay(dates.kst) : null,
      dateLocal: dates ? isoDay(dates.local) : null,
      start: hhmm(mod(startKst, DAY_MIN)),
      end: hhmm(mod(endKst, DAY_MIN)),
      weekdayLocal,
      startLocal: hhmm(slot.start_minute_local),
      endLocal: hhmm(slot.end_minute_local),
      notes: slot.notes,
    };
  });
}

export function buildAvailability(slots: AvailabilitySlot[], today: Date = new Date()): AvailabilitySummary {
  const converted = slots.flatMap((s) => convert(s, today));
  converted.sort((a, b) => (a.from ?? '').localeCompare(b.from ?? '') || a.weekdayKst - b.weekdayKst || a.start.localeCompare(b.start));
  if (converted.length === 0) return { studentTz: '', blocks: [] };

  const multiPeriod = new Set(converted.map((c) => `${c.from}|${c.until}`)).size > 1;
  const byPeriod = new Map<string, AvailabilityLine[]>();
  for (const { tz: _tz, abbr, from, until, ...line } of converted) {
    const key = formatPeriod(from, until) + (multiPeriod ? ` · ${abbr}` : '');
    byPeriod.set(key, [...(byPeriod.get(key) ?? []), line]);
  }

  const tzs = [...new Set(converted.map((c) => c.tz))].sort();
  return {
    studentTz: tzs.map((tz) => tzLabel(tz, converted[0].from, today)).join(', '),
    blocks: [...byPeriod].map(([period, lines]) => ({ period, lines })),
  };
}
