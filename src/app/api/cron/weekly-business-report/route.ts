import { NextRequest, NextResponse } from 'next/server';
import {
  lastCompletedWeek,
  splitLeadsBySource,
  formatBusinessReport,
  type ReportSegment,
  type ReportOverview,
} from '@/lib/weekly-business-report';

/** 슬랙 00_방향맞추기 채널 — 주간 비즈니스 현황 발송처. */
const SLACK_CHANNEL = 'C07L25RNWCX';

const SEGMENTS: { key: 'all' | 'b2c' | 'b2b'; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'b2c', label: 'B2C' },
  { key: 'b2b', label: 'B2B' },
];

/**
 * GET /api/cron/weekly-business-report
 * Vercel Cron — 매주 월요일 04:00 KST (= 일요일 19:00 UTC).
 *
 * 직전에 완결된 주차(월~일)의 CRM 통계를 전체/B2C/B2B로 조회해 슬랙에 발송한다.
 * 집계는 화면과 동일한 기준을 쓰기 위해 /api/crm/stats를 그대로 호출한다
 * (기존 /api/crm/weekly-plan 라우트와 같은 내부 호출 방식).
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED' } }, { status: 401 });
  }

  const week = lastCompletedWeek(new Date());
  if (!week) {
    console.error('[cron/weekly-business-report] 주차 정의 범위 밖 — WEEK_DEFINITIONS 갱신 필요');
    return NextResponse.json({ sent: false, reason: 'WEEK_NOT_FOUND' });
  }

  const adminKey = process.env.ADMIN_SECRET_KEY;
  if (!adminKey) {
    console.error('[cron/weekly-business-report] ADMIN_SECRET_KEY 미설정');
    return NextResponse.json({ sent: false, reason: 'ADMIN_KEY_MISSING', week: week.label });
  }

  const origin = request.nextUrl.origin;
  const segments: ReportSegment[] = [];

  for (const { key, label } of SEGMENTS) {
    const url = `${origin}/api/crm/stats?from=${week.start}&to=${week.end}&segment=${key}`;
    try {
      const res = await fetch(url, { headers: { 'x-admin-key': adminKey } });
      if (!res.ok) {
        console.error(`[cron/weekly-business-report] stats ${key} 실패: ${res.status}`);
        return NextResponse.json({ sent: false, reason: 'STATS_FAILED', week: week.label });
      }
      const json = (await res.json()) as {
        data?: { overview?: ReportOverview; by_source?: { source: string; leads: number }[] };
      };
      const overview = json.data?.overview;
      if (!overview) {
        console.error(`[cron/weekly-business-report] stats ${key} 응답에 overview 없음`);
        return NextResponse.json({ sent: false, reason: 'STATS_FAILED', week: week.label });
      }
      const { ig, other } = splitLeadsBySource(json.data?.by_source ?? []);
      segments.push({ label, overview, igLeads: ig, otherLeads: other });
    } catch (e) {
      console.error(`[cron/weekly-business-report] stats ${key} 예외:`, e);
      return NextResponse.json({ sent: false, reason: 'STATS_FAILED', week: week.label });
    }
  }

  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) {
    console.error('[cron/weekly-business-report] SLACK_BOT_TOKEN 미설정 — 발송 생략');
    return NextResponse.json({ sent: false, reason: 'SLACK_TOKEN_MISSING', week: week.label });
  }

  const text = formatBusinessReport(week, segments);

  try {
    const res = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify({ channel: SLACK_CHANNEL, text }),
    });
    const json = (await res.json()) as { ok?: boolean; error?: string };
    if (!json.ok) {
      console.error('[cron/weekly-business-report] 슬랙 발송 실패:', json.error);
      return NextResponse.json({ sent: false, reason: 'SLACK_FAILED', week: week.label });
    }
  } catch (e) {
    console.error('[cron/weekly-business-report] 슬랙 발송 예외:', e);
    return NextResponse.json({ sent: false, reason: 'SLACK_FAILED', week: week.label });
  }

  console.log(`[cron/weekly-business-report] ${week.label} 발송 완료`);
  return NextResponse.json({ sent: true, week: week.label, from: week.start, to: week.end });
}
