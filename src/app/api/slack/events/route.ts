import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { verifySlackRequest, postSlack, getTodayTopics, BLOG_CHANNEL } from './slack-utils';
import { handleBlogWrite, handlePublish, handleTopicSuggest } from './handlers';

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

  // app_mention 또는 BLOG_CHANNEL의 일반 사용자 메시지만 처리
  // message_changed / message_deleted / bot_message 등 subtype은 무시
  const isMention = event.type === 'app_mention';
  const isBlogChannelMsg = event.type === 'message'
    && event.channel === BLOG_CHANNEL
    && !event.subtype;  // subtype 없는 순수 사용자 메시지만
  if (!isMention && !isBlogChannelMsg) {
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

  // 3. 직접 주제 입력: @landingpage '주제명' 써줘 / 해줘 / 작성해줘
  const directMatch = text.match(/[''""'""](.+?)[''""'""].*(?:써줘|해줘|작성해줘|포스팅해줘)/);
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

  // 4. 근거/포인트 블록 형식 — 주제 추천 목록을 붙여넣고 작성해줘
  // 예: "8월 SAT 20일 전 점검 리스트\n   근거: ...\n   포인트: ...\n작성해줘"
  if (/(?:써줘|해줘|작성해줘|포스팅해줘)/.test(text) && /근거[:：]/.test(text)) {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const titleLine = lines.find(l => !l.startsWith('근거') && !l.startsWith('포인트') && !/써줘|해줘|작성해줘|포스팅해줘/.test(l) && !l.startsWith('@'));
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

  // 5. "이것 작성해줘" / "이거 써줘" — 스레드 상위 메시지에서 주제 파싱
  if (/(?:이것|이거|이걸)\s*(?:써줘|해줘|작성해줘|포스팅해줘)/.test(text)) {
    after(() => (async () => {
      // 스레드가 있으면 부모 메시지, 없으면 채널 직전 메시지에서 파싱
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
      const titleLine = parentLines.find((l: string) => !l.startsWith('근거') && !l.startsWith('포인트') && !l.startsWith('@'));
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

  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({ status: 'ok' });
}
