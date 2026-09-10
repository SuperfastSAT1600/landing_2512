import { NextRequest, NextResponse } from 'next/server';
import { computeCrmStats } from '@/lib/crm-stats-service';
import { listGlobalSales } from '@/lib/global-sales-service';
import {
  lastCompletedWeek,
  splitLeadsBySource,
  summarizeGlobalSales,
  formatBusinessReport,
  type ReportSegment,
  type GlobalReportSummary,
} from '@/lib/weekly-business-report';

export const runtime = 'nodejs';
export const maxDuration = 60;

/** 슬랙 00_방향맞추기 채널 — 주간 비즈니스 현황 발송처. */
const SLACK_CHANNEL = 'C07L25RNWCX';

// Business 페이지 탭 위계와 맞춘다: 한국비즈니스(B2C+B2B 합산)가 첫 번째 —
// formatBusinessReport가 이 순서(segments[0]=한국비즈니스 전체)로 "전체" 합산을 계산한다.
const SEGMENTS: { key: 'all' | 'b2c' | 'b2b'; label: string }[] = [
  { key: 'all', label: '한국비즈니스' },
  { key: 'b2c', label: 'B2C' },
  { key: 'b2b', label: 'B2B' },
];

const EMPTY_GLOBAL: GlobalReportSummary = {
  totalUsd: 0, totalCount: 0, firstUsd: 0, firstCount: 0, repeatUsd: 0, repeatCount: 0,
};

/** 슬랙 발송. 성공 여부만 돌려준다. */
async function postToSlack(token: string, text: string): Promise<boolean> {
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
      return false;
    }
    return true;
  } catch (e) {
    console.error('[cron/weekly-business-report] 슬랙 발송 예외:', e);
    return false;
  }
}

/**
 * 실패를 채널에 알린다.
 *
 * 이 알림이 있는 이유: 이전 구현은 실패 시 `{ sent: false }` + 200을 반환해서
 * 2주 동안 아무도 미발송을 알아채지 못했다. 실패는 반드시 눈에 보여야 한다.
 */
async function reportFailure(reason: string, detail: string, weekLabel?: string) {
  const token = process.env.SLACK_BOT_TOKEN;
  const head = weekLabel ? `주간 비즈니스 현황(${weekLabel})` : '주간 비즈니스 현황';
  console.error(`[cron/weekly-business-report] ${reason}: ${detail}`);
  if (token) {
    await postToSlack(token, `:warning: ${head} 자동 발송 실패 — ${reason}: ${detail}`);
  }
  return NextResponse.json({ sent: false, reason, detail, week: weekLabel }, { status: 500 });
}

/**
 * GET /api/cron/weekly-business-report
 * Vercel Cron — 매주 월요일 04:00 KST (= 일요일 19:00 UTC).
 *
 * 직전에 완결된 주차(월~일)의 CRM 통계를 한국비즈니스/B2C/B2B로 집계해 슬랙에 발송한다.
 *
 * 집계는 HTTP 자기호출이 아니라 in-process 호출이다. Vercel 크론은 SSO로 보호된
 * 배포 URL(https://*.vercel.app)로 요청하므로 request.nextUrl.origin 으로 자기 API를
 * 되부르면 SSO 페이지(HTTP 200 + HTML)를 받아 조용히 실패한다.
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED' } }, { status: 401 });
  }

  if (!process.env.SLACK_BOT_TOKEN) {
    // 알릴 통로 자체가 없다 — 조용히 200을 주지 말고 크론 실행을 실패로 남긴다.
    console.error('[cron/weekly-business-report] SLACK_BOT_TOKEN 미설정');
    return NextResponse.json({ sent: false, reason: 'SLACK_TOKEN_MISSING' }, { status: 500 });
  }

  const week = lastCompletedWeek(new Date());
  if (!week) {
    return reportFailure('WEEK_NOT_FOUND', 'WEEK_DEFINITIONS 범위 밖 — 주차 표 갱신 필요');
  }

  let segments: ReportSegment[];
  try {
    const results = await Promise.all(
      SEGMENTS.map(({ key }) => computeCrmStats({ from: week.start, to: week.end, segment: key })),
    );

    const failed = results.findIndex((r) => !r.ok);
    if (failed !== -1) {
      const r = results[failed] as { code: string; message: string };
      return reportFailure('STATS_FAILED', `${SEGMENTS[failed].key} — ${r.message}`, week.label);
    }

    segments = results.map((r, i) => {
      const { overview, by_source } = (r as { data: { overview: ReportSegment['overview']; by_source: { source: string; leads: number }[] } }).data;
      const { ig, other } = splitLeadsBySource(by_source);
      return { label: SEGMENTS[i].label, overview, igLeads: ig, otherLeads: other };
    });
  } catch (e) {
    return reportFailure('STATS_FAILED', e instanceof Error ? e.message : String(e), week.label);
  }

  // 글로벌(USD) 매출 — 날짜 필터가 없는 조회라 전체 이력을 받아 주차 범위로 직접 걸러 집계한다.
  // 튜터링 통계와 달리 이 라인이 실패해도 리포트 자체를 막지 않는다(신규 소규모 라인이라 0으로 대체).
  let globalSummary = EMPTY_GLOBAL;
  try {
    const global = await listGlobalSales();
    if (global.ok) globalSummary = summarizeGlobalSales(global.data, week);
  } catch (e) {
    console.error('[cron/weekly-business-report] global-sales 예외:', e);
  }

  const text = formatBusinessReport(week, segments, globalSummary);

  if (!(await postToSlack(process.env.SLACK_BOT_TOKEN, text))) {
    return NextResponse.json(
      { sent: false, reason: 'SLACK_FAILED', week: week.label },
      { status: 500 },
    );
  }

  console.log(`[cron/weekly-business-report] ${week.label} 발송 완료`);
  return NextResponse.json({ sent: true, week: week.label, from: week.start, to: week.end });
}
