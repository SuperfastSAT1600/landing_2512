import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { handleBlogWrite, handleTopicSuggest } from '../../slack/events/handlers';
import { BLOG_CHANNEL } from '../../slack/events/slack-utils';

export const runtime = 'nodejs';
export const maxDuration = 300;

function isAuthorized(req: NextRequest) {
  return req.headers.get('x-admin-key') === process.env.ADMIN_SECRET_KEY;
}

/**
 * POST /api/admin/blog-trigger
 *
 * 주제 추천:
 *   { "action": "suggest", "n": 5 }
 *
 * 블로그 직접 작성:
 *   { "action": "write", "topic": "SAT 준비 전략", "rationale": "...", "point": "..." }
 */
export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json() as {
    action: 'suggest' | 'write';
    n?: number;
    topic?: string;
    rationale?: string;
    point?: string;
  };

  const threadTs = String(Date.now() / 1000);

  if (body.action === 'suggest') {
    const n = Math.min(body.n ?? 5, 10);
    after(() =>
      handleTopicSuggest(n, BLOG_CHANNEL, threadTs).catch(err =>
        console.error('[blog-trigger] suggest 오류:', err)
      )
    );
    return NextResponse.json({ ok: true, action: 'suggest', n });
  }

  if (body.action === 'write') {
    if (!body.topic?.trim()) {
      return NextResponse.json({ error: 'topic 필드가 필요합니다' }, { status: 400 });
    }
    const topic = {
      title: body.topic.trim(),
      rationale: body.rationale ?? '',
      point: body.point ?? '',
    };
    after(() =>
      handleBlogWrite(topic, BLOG_CHANNEL, threadTs).catch(err =>
        console.error('[blog-trigger] write 오류:', err)
      )
    );
    return NextResponse.json({ ok: true, action: 'write', topic: topic.title });
  }

  return NextResponse.json(
    { error: 'action은 "suggest" 또는 "write"이어야 합니다' },
    { status: 400 }
  );
}
