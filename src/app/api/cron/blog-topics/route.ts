import { NextRequest, NextResponse } from 'next/server';
import { generateTopics, buildTopicMessage } from '../../slack/events/topic-suggester';
import { postSlack, BLOG_CHANNEL } from '../../slack/events/slack-utils';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const topics = await generateTopics(5);
    if (!topics.length) {
      console.warn('[cron/blog-topics] 생성된 주제 없음');
      return NextResponse.json({ ok: true, message: '주제 없음' });
    }

    const message = buildTopicMessage(topics);
    await postSlack(BLOG_CHANNEL, message);

    console.log(`[cron/blog-topics] 주제 ${topics.length}개 Slack 발송 완료`);
    return NextResponse.json({ ok: true, count: topics.length });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[cron/blog-topics] 오류:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
