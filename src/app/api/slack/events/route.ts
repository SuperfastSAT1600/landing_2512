import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import crypto from 'crypto';
import Anthropic from '@anthropic-ai/sdk';
import { marked } from 'marked';

export const runtime = 'nodejs';
export const maxDuration = 300;

const BLOG_CHANNEL = 'C0A28EJQA7P';

// ─── Slack ───────────────────────────────────────────────────────────────────

async function verifySlackRequest(req: NextRequest, body: string): Promise<boolean> {
  const secret = process.env.SLACK_SIGNING_SECRET;
  if (!secret) return true; // 미설정 시 검증 생략 (개발용)

  const timestamp = req.headers.get('x-slack-request-timestamp');
  const signature = req.headers.get('x-slack-signature');
  if (!timestamp || !signature) return false;

  if (Math.abs(Date.now() / 1000 - parseInt(timestamp)) > 300) return false;

  const expected = 'v0=' + crypto
    .createHmac('sha256', secret)
    .update(`v0:${timestamp}:${body}`)
    .digest('hex');

  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

async function postSlack(channel: string, text: string, threadTs?: string) {
  const body: Record<string, string> = { channel, text };
  if (threadTs) body.thread_ts = threadTs;

  const res = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const data = await res.json() as { ok: boolean; error?: string };
  if (!data.ok) console.error('[slack/events] chat.postMessage 실패:', data.error);
}

// ─── 주제 파싱 ────────────────────────────────────────────────────────────────

type Topic = { n: number; title: string; rationale: string; point: string };

async function getTodayTopics(): Promise<Topic[]> {
  const res = await fetch(
    `https://slack.com/api/conversations.history?channel=${BLOG_CHANNEL}&limit=30`,
    { headers: { Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}` } }
  );
  const data = await res.json() as { messages?: { text: string; bot_id?: string }[] };

  const todayKST = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
  });

  const topicMsg = data.messages?.find(
    m => m.bot_id && m.text?.includes('[오늘의 블로그 주제 제안') && m.text?.includes(todayKST)
  );
  if (!topicMsg) return [];

  const topics: Topic[] = [];
  let current: Topic | null = null;

  for (const line of topicMsg.text.split('\n')) {
    const match = line.match(/^(\d+)\.\s+(.+)/);
    if (match) {
      if (current) topics.push(current);
      current = { n: parseInt(match[1]), title: match[2].trim(), rationale: '', point: '' };
    } else if (current) {
      if (line.includes('근거:')) current.rationale = line.replace(/^\s*근거:\s*/, '').trim();
      else if (line.includes('포인트:')) current.point = line.replace(/^\s*포인트:\s*/, '').trim();
    }
  }
  if (current) topics.push(current);
  return topics;
}

// ─── 블로그 작성 ──────────────────────────────────────────────────────────────

async function writeBlog(topic: Topic, anthropicKey: string): Promise<string> {
  const client = new Anthropic({ apiKey: anthropicKey });

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 6000,
    system: `당신은 SuperfastSAT의 블로그 작성 전문가입니다.

## 핵심 구조: C→R→E→I
- C (Confusion): 독자가 자신의 혼란 장면을 인식
- R (Recognition): 데이터/패턴으로 혼란의 실체 확인
- E (Explanation): 왜 그런지 인과 메커니즘 (주어: CB/출제 설계/문법 규칙)
- I (Inevitability): 독자가 달리 행동하지 않을 수 없음

## 작성 규칙
- 독자: SAT 수험생 학부모와 학생
- 한국어, 1500-2000자
- 마크다운 (## 소제목 사용)
- 금지 표현: "살펴보겠습니다", "중요합니다", "~해야 합니다" 반복, "실전에서는"
- SAT College Board 출제 원칙과 실제 패턴 언급
- 마지막 단락에서 SuperfastSAT 학습 방식으로 자연스럽게 연결
- AI 티 없이 사람이 쓴 것처럼`,
    messages: [{
      role: 'user',
      content: `제목: ${topic.title}\n근거: ${topic.rationale}\n핵심 포인트: ${topic.point}\n\n위 주제로 블로그 포스팅을 작성해주세요.`,
    }],
  });

  return response.content[0].type === 'text' ? response.content[0].text : '';
}

const CTA_HTML = `<div style="text-align:center;margin-top:32px;">
  <a href="https://superfastsat.com/api/kakao-redirect?source=ghost" target="_blank" rel="noopener noreferrer"
    style="display:inline-block;padding:14px 22px;border-radius:10px;background:#071be9;color:#ffffff;font-weight:600;text-decoration:none;">
    카카오톡으로 수업 상담 신청하기🖐️
  </a>
</div>`;

function titleToSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s가-힣]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 80) + '-' + Date.now().toString(36);
}

// ─── Ghost 발행 ───────────────────────────────────────────────────────────────

async function publishToGhost(title: string, markdown: string, ghostUrl: string, ghostAdminKey: string): Promise<{ url: string; html: string; slug: string }> {
  const [ghostId, ghostSecret] = ghostAdminKey.split(':');

  const header = Buffer.from(JSON.stringify({ alg: 'HS256', kid: ghostId, typ: 'JWT' })).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(JSON.stringify({ iat: now, exp: now + 300, aud: '/admin/' })).toString('base64url');
  const sig = crypto
    .createHmac('sha256', Buffer.from(ghostSecret, 'hex'))
    .update(`${header}.${payload}`)
    .digest('base64url');
  const jwt = `${header}.${payload}.${sig}`;

  const html = typeof markdown === 'string' && markdown.startsWith('<') ? markdown : await marked(markdown);
  const slug = titleToSlug(title);

  const res = await fetch(`${ghostUrl}/ghost/api/admin/posts/?source=html`, {
    method: 'POST',
    headers: { Authorization: `Ghost ${jwt}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      posts: [{
        title,
        html: html + CTA_HTML,
        slug,
        status: 'draft',
        tags: [{ name: 'SAT' }, { name: 'blog-agent' }],
      }],
    }),
  });

  const data = await res.json() as { posts?: { url: string }[] };
  return { url: data.posts?.[0]?.url ?? `${ghostUrl}/ghost/#/editor`, html, slug };
}

// ─── 랜딩 페이지 발행 ────────────────────────────────────────────────────────

async function publishToLanding(
  title: string,
  html: string,
  slug: string,
  topic: Topic
): Promise<string> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const excerpt = topic.rationale.slice(0, 120);
  const today = new Date().toISOString().split('T')[0];

  const body = JSON.stringify({
    id: slug,
    title,
    content: html,
    excerpt,
    description: excerpt,
    featured_image: null,
    category: 'SAT',
    tags: ['SAT', 'blog-agent'],
    author: 'SuperfastSAT',
    date: today,
    focus_keyword: topic.title.split(' ').slice(0, 3).join(' '),
    cta_featured: false,
    is_published: false,
  });

  const res = await fetch(`${supabaseUrl}/rest/v1/posts`, {
    method: 'POST',
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body,
  });

  if (res.status === 201) {
    const data = await res.json() as { id: string }[];
    return `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://superfastsat.com'}/blog/${data[0]?.id}`;
  }
  const err = await res.text();
  throw new Error(`랜딩 발행 실패: ${res.status} ${err}`);
}

// ─── 메인 처리 ────────────────────────────────────────────────────────────────

type EnvSnapshot = { anthropicKey: string; ghostUrl: string; ghostAdminKey: string; slackBotToken: string };

async function handleBlogRequest(n: number, channel: string, threadTs?: string, env?: EnvSnapshot) {
  const topics = await getTodayTopics();
  const topic = topics.find(t => t.n === n);

  if (!topic) {
    await postSlack(channel, `오늘의 ${n}번 주제를 찾을 수 없습니다. 주제 추천 메시지를 확인해주세요.`, threadTs);
    return;
  }

  await postSlack(
    channel,
    `${n}번 주제로 블로그 작성을 시작합니다.\n\n제목: ${topic.title}\n포인트: ${topic.point}\n\n작성이 완료되면 알려드리겠습니다.`,
    threadTs
  );

  const anthropicKey = env?.anthropicKey ?? process.env.ANTHROPIC_API_KEY ?? '';
  const ghostUrl = env?.ghostUrl ?? process.env.GHOST_URL ?? '';
  const ghostAdminKey = env?.ghostAdminKey ?? process.env.GHOST_ADMIN_KEY ?? '';

  const content = await writeBlog(topic, anthropicKey);
  const slug = titleToSlug(topic.title);
  const html = await marked(content);

  const [ghostResult, landingResult] = await Promise.allSettled([
    publishToGhost(topic.title, content, ghostUrl, ghostAdminKey),
    publishToLanding(topic.title, html, slug, topic),
  ]);

  const ghostUrl2 = ghostResult.status === 'fulfilled' ? ghostResult.value.url : '(Ghost 발행 실패)';
  const landingUrl = landingResult.status === 'fulfilled' ? landingResult.value : '(랜딩 발행 실패)';

  await postSlack(
    channel,
    `블로그 초안이 완성됐습니다.\n\n제목: ${topic.title}\nGhost 초안: ${ghostUrl2}\n랜딩 초안: ${landingUrl}`,
    threadTs
  );
}

// ─── Route handlers ───────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const body = await request.text();

  if (!(await verifySlackRequest(request, body))) {
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 });
  }

  const payload = JSON.parse(body) as {
    type: string;
    challenge?: string;
    event?: { type: string; text?: string; channel?: string; bot_id?: string };
  };

  // Slack URL 검증 챌린지 (앱 등록 시 1회)
  if (payload.type === 'url_verification') {
    return NextResponse.json({ challenge: payload.challenge });
  }

  const event = payload.event as {
    type: string;
    text?: string;
    channel?: string;
    ts?: string;
    thread_ts?: string;
    bot_id?: string;
  } | undefined;

  // 봇 자신의 메시지 무시
  if (!event || event.type !== 'app_mention' || event.bot_id) {
    return NextResponse.json({ ok: true });
  }

  const channel = event.channel!;
  const text = event.text ?? '';
  const threadTs = event.thread_ts ?? event.ts;

  const match = text.match(/(\d+)번\s*써줘/);
  if (!match) return NextResponse.json({ ok: true });

  const n = parseInt(match[1]);

  // after() 클로저 안에서 env 접근이 불안정할 수 있어 미리 캡처
  const anthropicKey = process.env.ANTHROPIC_API_KEY ?? '';
  const ghostUrl = process.env.GHOST_URL ?? '';
  const ghostAdminKey = process.env.GHOST_ADMIN_KEY ?? '';
  const slackBotToken = process.env.SLACK_BOT_TOKEN ?? '';

  if (!anthropicKey) {
    await postSlack(channel, 'ANTHROPIC_API_KEY가 설정되지 않았습니다.', threadTs);
    return NextResponse.json({ ok: true });
  }

  // Slack 3초 응답 제한 때문에 after()로 비동기 처리, 스레드로 응답
  after(() => handleBlogRequest(n, channel, threadTs, { anthropicKey, ghostUrl, ghostAdminKey, slackBotToken }).catch(async (err) => {
    console.error('[slack/events] 블로그 작성 오류:', err);
    await postSlack(channel, `블로그 작성 중 오류가 발생했습니다: ${err instanceof Error ? err.message : String(err)}`, threadTs);
  }));

  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({ status: 'ok' });
}
