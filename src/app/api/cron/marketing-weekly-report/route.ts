import { NextRequest, NextResponse } from 'next/server';
import { fetchWeeklyGoalRows } from '@/lib/marketing-goals';
import { lastCompletedWeekStart, formatMarketingGoalReport } from '@/lib/marketing-weekly-report';
import { weekEndOf, weekLabelOf } from '@/lib/marketing-week';

export const runtime = 'nodejs';
export const maxDuration = 60;

/** 슬랙 m1_26년-3분기-2억-1마케팅 채널 — 주간 마케팅 리드 리포트 발송처. */
const SLACK_CHANNEL = 'C0A28EJQA7P';

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
      console.error('[cron/marketing-weekly-report] 슬랙 발송 실패:', json.error);
      return false;
    }
    return true;
  } catch (e) {
    console.error('[cron/marketing-weekly-report] 슬랙 발송 예외:', e);
    return false;
  }
}

/**
 * 실패를 채널에 알린다.
 *
 * weekly-business-report 와 같은 규칙: 조용한 200 은 미발송을 아무도 알아채지 못하게 만든다.
 * 실패는 채널에 뜨고 크론 실행도 실패로 남는다.
 */
async function reportFailure(reason: string, detail: string, weekLabel: string) {
  const token = process.env.SLACK_BOT_TOKEN;
  console.error(`[cron/marketing-weekly-report] ${reason}: ${detail}`);
  if (token) {
    await postToSlack(token, `:warning: 마케팅 주간 리드(${weekLabel}) 자동 발송 실패 — ${reason}: ${detail}`);
  }
  return NextResponse.json({ sent: false, reason, detail, week: weekLabel }, { status: 500 });
}

/**
 * GET /api/cron/marketing-weekly-report
 * Vercel Cron — 매주 월요일 04:00 KST (= 일요일 19:00 UTC).
 *
 * 직전에 완결된 주차의 채널별 목표 대비 리드 실적을 슬랙에 발송한다.
 *
 * 집계는 HTTP 자기호출이 아니라 in-process 호출이다. Vercel 크론은 SSO 로 보호된
 * 배포 URL 로 요청하므로 자기 API 를 되부르면 SSO 페이지(HTTP 200 + HTML)를 받아 조용히 실패한다.
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED' } }, { status: 401 });
  }

  if (!process.env.SLACK_BOT_TOKEN) {
    // 알릴 통로 자체가 없다 — 조용히 200 을 주지 말고 크론 실행을 실패로 남긴다.
    console.error('[cron/marketing-weekly-report] SLACK_BOT_TOKEN 미설정');
    return NextResponse.json({ sent: false, reason: 'SLACK_TOKEN_MISSING' }, { status: 500 });
  }

  const weekStart = lastCompletedWeekStart(new Date());
  const weekLabel = weekLabelOf(weekStart);

  let row;
  try {
    [row] = await fetchWeeklyGoalRows([weekStart]);
  } catch (e) {
    return reportFailure('GOALS_FAILED', e instanceof Error ? e.message : String(e), weekLabel);
  }
  if (!row) {
    return reportFailure('GOALS_FAILED', `${weekStart} 집계 결과 없음`, weekLabel);
  }

  const text = formatMarketingGoalReport(row);

  if (!(await postToSlack(process.env.SLACK_BOT_TOKEN, text))) {
    return NextResponse.json({ sent: false, reason: 'SLACK_FAILED', week: weekLabel }, { status: 500 });
  }

  console.log(`[cron/marketing-weekly-report] ${weekLabel} 발송 완료`);
  return NextResponse.json({
    sent: true,
    week: weekLabel,
    from: weekStart,
    to: weekEndOf(weekStart),
  });
}
