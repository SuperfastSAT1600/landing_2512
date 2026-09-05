import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import { verifySlackRequest, postSlack, getTodayTopics, BLOG_CHANNEL } from './slack-utils';
import { handleBlogWrite, handlePublish, handleTopicSuggest, type Platform } from './handlers';
import type { Topic } from './blog-writer';

function parsePlatform(word: string | undefined): Platform {
  if (!word) return 'both';
  if (/랜딩|landing/i.test(word)) return 'landing';
  if (/고스트|ghost/i.test(word)) return 'ghost';
  return 'both';
}

function getTodayTopicsFromFile(): Topic[] {
  try {
    const data = JSON.parse(readFileSync(join(process.cwd(), 'blog-agent/data/today-topics.json'), 'utf-8'));
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' });
    if (data.date !== today) return [];
    return (data.topics ?? []) as Topic[];
  } catch { return []; }
}

export const runtime = 'nodejs';
export const maxDuration = 300;

type SlackEvent = {
  type: string;
  subtype?: string;
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
  if (!event || event.bot_id) {
    return NextResponse.json({ ok: true });
  }

  const isMention = event.type === 'app_mention';
  const isBlogChannelMsg = event.type === 'message'
    && event.channel === BLOG_CHANNEL
    && !event.subtype;
  if (!isMention && !isBlogChannelMsg) {
    return NextResponse.json({ ok: true });
  }

  const text = event.text ?? '';
  const channel = event.channel ?? BLOG_CHANNEL;
  const threadTs = event.thread_ts ?? event.ts!;

  // 0. 주제 N개 뽑아줘
  const topicCountMatch = text.match(/주제\s*(\d+)개\s*(?:뽑아줘|추천해줘|알려줘|추천)/);
  if (topicCountMatch) {
    const n = Math.min(parseInt(topicCountMatch[1]), 10);
    after(() => handleTopicSuggest(n, channel, threadTs).catch(async err => {
      await postSlack(channel, `주제 생성 오류: ${err.message}`, threadTs);
    }));
    return NextResponse.json({ ok: true });
  }

  // 0b. 주제 추천해줘 (개수 미지정 → 5개)
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

  // 2. N번 [랜딩|고스트|둘다] 써줘
  const nMatch = text.match(/(\d+)번\s*(랜딩|고스트|ghost|landing|둘\s*다|both)?\s*써줘/);
  if (nMatch) {
    const n = parseInt(nMatch[1]);
    const platform = parsePlatform(nMatch[2]);
    after(() => (async () => {
      const slackTopics = await getTodayTopics();
      const topic =
        slackTopics.find(t => t.n === n) ??
        getTodayTopicsFromFile().find(t => t.n === n);
      if (!topic) {
        await postSlack(channel, `오늘의 ${n}번 주제를 찾을 수 없습니다.`, threadTs);
        return;
      }
      await handleBlogWrite(topic, channel, threadTs, platform);
    })().catch(async err => {
      await postSlack(channel, `오류: ${err.message}`, threadTs);
    }));
    return NextResponse.json({ ok: true });
  }

  // 3. 따옴표 주제: "주제명" [랜딩|고스트] 써줘
  const quotedMatch = text.match(/[‘’“”"'](.+?)[‘’“”"']\s*(랜딩|고스트|ghost|landing|둘\s*다|both)?\s*(?:써줘|해줘|작성해줘|포스팅해줘)/);
  if (quotedMatch) {
    const title = quotedMatch[1].trim();
    const platform = parsePlatform(quotedMatch[2]);
    after(() => handleBlogWrite(
      { title, rationale: '', point: '' }, channel, threadTs, platform
    ).catch(async err => {
      await postSlack(channel, `오류: ${err.message}`, threadTs);
    }));
    return NextResponse.json({ ok: true });
  }

  // 4. 근거/포인트 블록 형식
  if (/(?:써줘|해줘|작성해줘|포스팅해줘)/.test(text) && /근거[:：]/.test(text)) {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const titleLine = lines.find(l =>
      !l.startsWith('근거') && !l.startsWith('포인트') &&
      !/써줘|해줘|작성해줘|포스팅해줘/.test(l) && !l.startsWith('@')
    );
    const rationaleLine = lines.find(l => /근거[:：]/.test(l));
    const pointLine = lines.find(l => /포인트[:：]/.test(l));
    if (titleLine) {
      const topic = {
        title: titleLine.replace(/^\d+\.\s*/, '').trim(),
        rationale: rationaleLine ? rationaleLine.replace(/근거[:：]\s*/, '').trim() : '',
        point: pointLine ? pointLine.replace(/포인트[:：]\s*/, '').trim() : '',
      };
      after(() => handleBlogWrite(topic, channel, threadTs).catch(async err => {
        await postSlack(channel, `오류: ${err.message}`, threadTs);
      }));
      return NextResponse.json({ ok: true });
    }
  }

  // 5. "이것/이거 써줘" — 스레드 상위 메시지에서 주제 파싱
  if (/(?:이것|이거|이걸)\s*(?:써줘|해줘|작성해줘|포스팅해줘)/.test(text)) {
    after(() => (async () => {
      const parentTs = event.thread_ts ?? null;
      if (!parentTs) {
        await postSlack(channel, '어떤 주제인지 알 수 없습니다. 스레드에서 답장하거나 주제를 직접 붙여넣어 주세요.', threadTs);
        return;
      }
      const res = await fetch(
        `https://slack.com/api/conversations.replies?channel=${channel}&ts=${parentTs}&limit=5`,
        { headers: { Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}` } }
      );
      const data = await res.json() as { messages?: { text: string }[] };
      const parentText = data.messages?.[0]?.text ?? '';
      const parentLines = parentText.split('\n').map((l: string) => l.trim()).filter(Boolean);
      const titleLine = parentLines.find((l: string) =>
        !l.startsWith('근거') && !l.startsWith('포인트') && !l.startsWith('@')
      );
      if (!titleLine) {
        await postSlack(channel, '상위 메시지에서 주제를 찾을 수 없습니다. 주제를 직접 입력해주세요.', threadTs);
        return;
      }
      const rationaleLine = parentLines.find((l: string) => /근거[:：]/.test(l));
      const pointLine = parentLines.find((l: string) => /포인트[:：]/.test(l));
      const topic = {
        title: titleLine.replace(/^\d+\.\s*/, '').trim(),
        rationale: rationaleLine ? rationaleLine.replace(/근거[:：]\s*/, '').trim() : '',
        point: pointLine ? pointLine.replace(/포인트[:：]\s*/, '').trim() : '',
      };
      await handleBlogWrite(topic, channel, threadTs);
    })().catch(async err => {
      await postSlack(channel, `오류: ${err.message}`, threadTs);
    }));
    return NextResponse.json({ ok: true });
  }

  // 6. 자유형: [주제] [랜딩|고스트] 써줘
  const cleanText = text.replace(/<@[A-Z0-9]+>/g, '').trim();
  const freeMatch = cleanText.match(/^(.+?)\s*(랜딩|고스트|ghost|landing|둘\s*다|both)?\s*(?:써줘|해줘|작성해줘|포스팅해줘)$/);
  if (freeMatch) {
    const title = freeMatch[1].trim();
    const platform = parsePlatform(freeMatch[2]);
    if (title.length >= 5) {
      after(() => handleBlogWrite(
        { title, rationale: '', point: '' }, channel, threadTs, platform
      ).catch(async err => {
        await postSlack(channel, `오류: ${err.message}`, threadTs);
      }));
      return NextResponse.json({ ok: true });
    }
  }

  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({ status: 'ok' });
}
