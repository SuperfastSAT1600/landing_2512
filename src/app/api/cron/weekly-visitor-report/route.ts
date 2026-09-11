import { NextRequest, NextResponse } from 'next/server';
import {
  reportDateRange,
  buildVisitorsQuery,
  buildSourcesQuery,
  parseQueryResult,
  parseSources,
  formatVisitorReport,
  type DailyVisitors,
} from '@/lib/visitor-report';

export const runtime = 'nodejs';
export const maxDuration = 60;

const POSTHOG_PROJECT_ID = '397582';
const POSTHOG_BASE_URL = 'https://us.posthog.com';

/** 슬랙 m1_26년-3분기-2억-1마케팅 채널 — 주간 방문 리포트 발송처. */
const SLACK_CHANNEL = 'C0A28EJQA7P';

async function queryPostHog(apiKey: string, query: string): Promise<string[][]> {
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
    throw new Error(`PostHog query failed (${res.status}): ${text.slice(0, 200)}`);
  }
  return parseQueryResult(await res.json());
}

async function postToSlack(token: string, text: string): Promise<boolean> {
  try {
    const res = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ channel: SLACK_CHANNEL, text }),
    });
    const json = (await res.json()) as { ok?: boolean; error?: string };
    if (!json.ok) {
      console.error('[cron/weekly-visitor-report] 슬랙 발송 실패:', json.error);
      return false;
    }
    return true;
  } catch (e) {
    console.error('[cron/weekly-visitor-report] 슬랙 발송 예외:', e);
    return false;
  }
}

/**
 * GET /api/cron/weekly-visitor-report
 * Vercel Cron — 매주 수요일 04:00 KST (= 화요일 19:00 UTC).
 *
 * 직전 7일(화~화)의 tutoring.superfastsat.com 방문자 현황을 슬랙에 발송한다.
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED' } }, { status: 401 });
  }

  const posthogKey = process.env.POSTHOG_PERSONAL_API_KEY;
  if (!posthogKey) {
    console.error('[cron/weekly-visitor-report] POSTHOG_PERSONAL_API_KEY 미설정');
    return NextResponse.json({ sent: false, reason: 'POSTHOG_KEY_MISSING' }, { status: 500 });
  }

  const slackToken = process.env.SLACK_BOT_TOKEN;
  if (!slackToken) {
    console.error('[cron/weekly-visitor-report] SLACK_BOT_TOKEN 미설정');
    return NextResponse.json({ sent: false, reason: 'SLACK_TOKEN_MISSING' }, { status: 500 });
  }

  const { start, end } = reportDateRange(new Date());

  let dailyVisitors: DailyVisitors[];
  let sourcesRows: string[][];
  try {
    const [visitorsRows, srcRows] = await Promise.all([
      queryPostHog(posthogKey, buildVisitorsQuery(start, end)),
      queryPostHog(posthogKey, buildSourcesQuery(start, end)),
    ]);
    dailyVisitors = visitorsRows.map(([date, count]) => ({ date, visitors: Number(count) }));
    sourcesRows = srcRows;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[cron/weekly-visitor-report] PostHog 쿼리 실패:', msg);
    if (slackToken) {
      await postToSlack(slackToken, `:warning: 주간 방문 리포트(${start}~${end}) 자동 발송 실패 — POSTHOG_QUERY_FAILED: ${msg.slice(0, 100)}`);
    }
    return NextResponse.json({ sent: false, reason: 'POSTHOG_QUERY_FAILED', detail: msg }, { status: 500 });
  }

  const dailySources = parseSources(sourcesRows);
  const text = formatVisitorReport({ start, end, dailyVisitors, dailySources });

  if (!(await postToSlack(slackToken, text))) {
    return NextResponse.json({ sent: false, reason: 'SLACK_FAILED' }, { status: 500 });
  }

  console.log(`[cron/weekly-visitor-report] ${start}~${end} 발송 완료`);
  return NextResponse.json({ sent: true, from: start, to: end });
}
