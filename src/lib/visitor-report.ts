/**
 * 주간 방문 리포트 — PostHog HogQL 쿼리 + 슬랙 메시지 포맷.
 * I/O 없음(PostHog API 호출은 크론 라우트에서 담당).
 */

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface DailyVisitors {
  date: string; // 'YYYY-MM-DD'
  visitors: number;
}

export interface DailySource {
  date: string;
  rank: number;
  label: string;
  count: number;
}

/** 크론 실행 시각 기준 KST 날짜 문자열. */
export function kstDate(at: Date): string {
  return new Date(at.getTime() + KST_OFFSET_MS).toISOString().slice(0, 10);
}

/** 리포트 날짜 범위: end = 어제(KST), start = 7일 전. */
export function reportDateRange(now: Date): { start: string; end: string } {
  const end = new Date(now.getTime() + KST_OFFSET_MS - DAY_MS);
  const start = new Date(end.getTime() - 6 * DAY_MS);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

/** $referrer 도메인 → 한국어 레이블. */
export function sourceLabel(referrer: string | null): string {
  if (!referrer || referrer === '$direct') return '직접접속';
  if (referrer.includes('instagram.com')) return 'Instagram';
  if (referrer.includes('google.com')) return 'Google';
  if (referrer.includes('bing.com')) return 'Bing';
  if (referrer.includes('youtube.com')) return 'YouTube';
  if (referrer.includes('naver.com')) return 'Naver';
  if (referrer.includes('facebook.com') || referrer.includes('fb.com')) return 'Facebook';
  if (referrer.includes('t.co') || referrer.includes('twitter.com')) return 'Twitter';
  // 도메인만 추출
  try {
    return new URL(referrer.startsWith('http') ? referrer : `https://${referrer}`).hostname.replace(/^www\./, '');
  } catch {
    return referrer;
  }
}

/** HogQL — 일별 unique 세션 수 */
export function buildVisitorsQuery(start: string, end: string): string {
  return `
SELECT
  toDate(toTimezone(timestamp, 'Asia/Seoul')) AS date,
  count(DISTINCT properties.\`$session_id\`) AS visitors
FROM events
WHERE event = '$pageview'
  AND properties.\`$host\` = 'tutoring.superfastsat.com'
  AND toDate(toTimezone(timestamp, 'Asia/Seoul')) >= '${start}'
  AND toDate(toTimezone(timestamp, 'Asia/Seoul')) <= '${end}'
GROUP BY date
ORDER BY date
`.trim();
}

/** HogQL — 일별 유입 소스별 세션 수(상위 집계용) */
export function buildSourcesQuery(start: string, end: string): string {
  return `
SELECT
  toDate(toTimezone(timestamp, 'Asia/Seoul')) AS date,
  ifNull(properties.\`$referring_domain\`, '$direct') AS referring_domain,
  count(DISTINCT properties.\`$session_id\`) AS visitors
FROM events
WHERE event = '$pageview'
  AND properties.\`$host\` = 'tutoring.superfastsat.com'
  AND toDate(toTimezone(timestamp, 'Asia/Seoul')) >= '${start}'
  AND toDate(toTimezone(timestamp, 'Asia/Seoul')) <= '${end}'
GROUP BY date, referring_domain
ORDER BY date, visitors DESC
`.trim();
}

/** PostHog Query API 응답에서 rows 추출. */
export function parseQueryResult(json: unknown): string[][] {
  const res = json as { results?: unknown[][] };
  return (res.results ?? []).map((row) => row.map(String));
}

/** 막대 그래프 생성 (12칸 블록). */
function bar(value: number, max: number, width = 12): string {
  if (max === 0) return '░'.repeat(width);
  const filled = Math.round((value / max) * width);
  return '█'.repeat(filled) + '░'.repeat(width - filled);
}

/** 날짜 범위의 모든 날짜 배열 생성. */
function dateRange(start: string, end: string): string[] {
  const dates: string[] = [];
  let cur = new Date(`${start}T00:00:00Z`);
  const endDate = new Date(`${end}T00:00:00Z`);
  while (cur <= endDate) {
    dates.push(cur.toISOString().slice(0, 10));
    cur = new Date(cur.getTime() + DAY_MS);
  }
  return dates;
}

export interface ReportData {
  start: string;
  end: string;
  dailyVisitors: DailyVisitors[];
  dailySources: DailySource[];
}

/** 슬랙 메시지 본문 생성. */
export function formatVisitorReport({ start, end, dailyVisitors, dailySources }: ReportData): string {
  const total = dailyVisitors.reduce((s, r) => s + r.visitors, 0);
  const max = Math.max(...dailyVisitors.map((r) => r.visitors), 1);

  const lines: string[] = [
    `*tutoring.superfastsat.com — 주간 방문 리포트*`,
    `${start} ~ ${end} (KST) | 합계 ${total}명`,
    '',
    '*방문자 추이*',
  ];

  const allDates = dateRange(start, end);
  const visitorByDate = Object.fromEntries(dailyVisitors.map((r) => [r.date, r.visitors]));

  for (const date of allDates) {
    const v = visitorByDate[date] ?? 0;
    const label = date.slice(5); // MM-DD
    lines.push(`${label} ${bar(v, max)} ${v}명`);
  }

  // 유입 경로 1·2위
  const sourceByDate: Record<string, DailySource[]> = {};
  for (const s of dailySources) {
    (sourceByDate[s.date] ??= []).push(s);
  }

  lines.push('', '*유입 경로 1·2위*');
  for (const date of allDates) {
    const label = date.slice(5);
    const top = (sourceByDate[date] ?? []).slice(0, 2);
    if (top.length === 0) {
      lines.push(`${label} 데이터 없음`);
    } else if (top.length === 1) {
      lines.push(`${label} 1위 ${top[0].label}(${top[0].count}명)`);
    } else {
      lines.push(`${label} 1위 ${top[0].label}(${top[0].count}명)  /  2위 ${top[1].label}(${top[1].count}명)`);
    }
  }

  return lines.join('\n');
}

/** sources 쿼리 결과 rows → DailySource[] */
export function parseSources(rows: string[][]): DailySource[] {
  const byDate: Record<string, { label: string; count: number }[]> = {};
  for (const [date, domain, count] of rows) {
    (byDate[date] ??= []).push({ label: sourceLabel(domain), count: Number(count) });
  }
  const result: DailySource[] = [];
  for (const [date, sources] of Object.entries(byDate)) {
    sources.sort((a, b) => b.count - a.count);
    for (let i = 0; i < sources.length; i++) {
      result.push({ date, rank: i + 1, ...sources[i] });
    }
  }
  return result;
}
