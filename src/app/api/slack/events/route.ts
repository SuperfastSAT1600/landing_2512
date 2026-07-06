import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { verifySlackRequest, postSlack, getTodayTopics, BLOG_CHANNEL } from './slack-utils';
import { handleBlogWrite, handlePublish, handleTopicSuggest } from './handlers';

export const runtime = 'nodejs';
export const maxDuration = 300;

type SlackEvent = {
  type: string;
  text?: string;
  channel?: string;
  ts?: string;
  thread_ts?: string;
  bot_id?: string;
};

type SlackPayload = {
  type: string;
  challenge?: string;
  event?: SlackEvent;
};

export async function POST(request: NextRequest) {
  const body = await request.text();
  if (!(await verifySlackRequest(request, body))) {
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 });
  }

  const payload = JSON.parse(body) as SlackPayload;

  if (payload.type === 'url_verification') {
    return NextResponse.json({ challenge: payload.challenge });
  }

  const event = payload.event;
  if (!event || event.type !== 'app_mention' || event.bot_id) {
    return NextResponse.json({ ok: true });
  }

  const text = event.text ?? '';
  const channel = event.channel ?? BLOG_CHANNEL;
  const threadTs = event.thread_ts ?? event.ts!;

  // 0. 주제 N개 뽑아줘 / 추천해줘 / 알려줘
  const topicCountMatch = text.match(/주제\s*(\d+)개\s*(?:뽑아줘|추천해줘|알려줘|추천)/);
  if (topicCountMatch) {
    const n = Math.min(parseInt(topicCountMatch[1]), 10);
    after(() => handleTopicSuggest(n, channel, threadTs).catch(async err => {
      await postSlack(channel, `주제 생성 오류: ${err.message}`, threadTs);
    }));
    return NextResponse.json({ ok: true });
  }

  // 0b. 주제 추천해줘 / 주제 뽑아줘 (개수 미지정 → 5개 기본)
  if (/주제\s*(?:추천해줘|뽑아줘|알려줘|추천)/.test(text) && !topicCountMatch) {
    after(() => handleTopicSuggest(5, channel, threadTs).catch(async err => {
      await postSlack(channel, `주제 생성 오류: ${err.message}`, threadTs);
    }));
    return NextResponse.json({ ok: true });
  }

  // 1. 발행 컨펌
  if (/발행할게요|발행해줘|publish/.test(text)) {
    after(() => handlePublish(channel, threadTs).catch(async err => {
      await postSlack(channel, `발행 중 오류: ${err.message}`, threadTs);
    }));
    return NextResponse.json({ ok: true });
  }

  // 2. N번 써줘
  const nMatch = text.match(/(\d+)번\s*써줘/);
  if (nMatch) {
    const n = parseInt(nMatch[1]);
    after(() => (async () => {
      const topics = await getTodayTopics();
      const topic = topics.find(t => t.n === n);
      if (!topic) {
        await postSlack(channel, `오늘의 ${n}번 주제를 찾을 수 없습니다.`, threadTs);
        return;
      }
      await handleBlogWrite(topic, channel, threadTs);
    })().catch(async err => {
      await postSlack(channel, `오류: ${err.message}`, threadTs);
    }));
    return NextResponse.json({ ok: true });
  }

  // 3. 직접 주제 입력: @landingpage '주제명' 써줘
  const directMatch = text.match(/['"'""](.+?)['"'""].*써줘/);
  if (directMatch) {
    const title = directMatch[1].trim();
    after(() => handleBlogWrite(
      { title, rationale: '', point: '' },
      channel,
      threadTs
    ).catch(async err => {
      await postSlack(channel, `오류: ${err.message}`, threadTs);
    }));
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({ status: 'ok' });
}
