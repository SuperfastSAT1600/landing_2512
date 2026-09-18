import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/server-auth';

export const runtime = 'nodejs';

const POSTHOG_PROJECT_ID = '597222';
const POSTHOG_BASE_URL = 'https://us.posthog.com';

export interface ActiveLearnerRow {
  date: string;   // 'YYYY-MM-DD' KST
  hour: number;   // 0-23 KST
  space: 'study_hall' | 'test_center' | 'vocab';
  users: number;
}

export interface ActiveLearnersResponse {
  data: ActiveLearnerRow[];
  from: string;
  to: string;
}

export async function GET(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED' } }, { status: 401 });
  }

  const apiKey = process.env.POSTHOG_PERSONAL_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: { code: 'POSTHOG_KEY_MISSING' } }, { status: 500 });
  }

  const params = request.nextUrl.searchParams;
  const from = params.get('from');
  const to = params.get('to');

  if (!from || !to || from > to) {
    return NextResponse.json({ error: { code: 'INVALID_PARAMS', message: 'from/to 날짜가 필요합니다' } }, { status: 400 });
  }

  // to는 inclusive이므로 다음 날 00:00:00 미만으로 필터
  const toExclusive = new Date(to);
  toExclusive.setDate(toExclusive.getDate() + 1);
  const toStr = toExclusive.toISOString().slice(0, 10);

  const query = `
    SELECT
      toString(toDate(toTimeZone(timestamp, 'Asia/Seoul'))) as date,
      toHour(toTimeZone(timestamp, 'Asia/Seoul')) as hour,
      properties.space as space,
      count(distinct person_id) as users
    FROM events
    WHERE
      event = 'space_entered'
      AND properties.tier = 'tutoring'
      AND timestamp >= '${from} 00:00:00'
      AND timestamp < '${toStr} 00:00:00'
    GROUP BY date, hour, space
    ORDER BY date, hour, space
  `;

  try {
    const res = await fetch(`${POSTHOG_BASE_URL}/api/projects/${POSTHOG_PROJECT_ID}/query`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: { kind: 'HogQLQuery', query } }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('[active-learners] PostHog 쿼리 실패:', text.slice(0, 200));
      return NextResponse.json({ error: { code: 'POSTHOG_QUERY_FAILED' } }, { status: 500 });
    }

    const json = await res.json();
    const rows: string[][] = json.results ?? [];

    const data: ActiveLearnerRow[] = rows.map(([date, hour, space, users]) => ({
      date: String(date),
      hour: Number(hour),
      space: String(space) as ActiveLearnerRow['space'],
      users: Number(users),
    }));

    return NextResponse.json({ data, from, to } satisfies ActiveLearnersResponse);
  } catch (e) {
    console.error('[active-learners] 오류:', e);
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR' } }, { status: 500 });
  }
}
