import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import crypto from 'crypto';
import Anthropic from '@anthropic-ai/sdk';
import { marked } from 'marked';

export const runtime = 'nodejs';
export const maxDuration = 300;

const BLOG_CHANNEL = 'C0A28EJQA7P';

// ─── Slack 유틸 ───────────────────────────────────────────────────────────────

async function verifySlackRequest(req: NextRequest, body: string): Promise<boolean> {
  const secret = process.env.SLACK_SIGNING_SECRET;
  if (!secret) return true;
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
  } catch { return false; }
}

async function postSlack(channel: string, text: string, threadTs?: string): Promise<void> {
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
  if (!data.ok) console.error('[slack/events] postMessage 실패:', data.error);
}

// ─── 주제 파싱 ────────────────────────────────────────────────────────────────

type Topic = { n?: number; title: string; rationale: string; point: string };

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

async function writeBlog(topic: Topic): Promise<string> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
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
      content: `제목: ${topic.title}\n근거: ${topic.rationale || '없음'}\n핵심 포인트: ${topic.point || '없음'}\n\n위 주제로 블로그 포스팅을 작성해주세요.`,
    }],
  });
  return response.content[0].type === 'text' ? response.content[0].text : '';
}

// ─── Ghost ────────────────────────────────────────────────────────────────────

const CTA_HTML = `<div style="text-align:center;margin-top:32px;">
  <a href="https://superfastsat.com/api/kakao-redirect?source=ghost" target="_blank" rel="noopener noreferrer"
    style="display:inline-block;padding:14px 22px;border-radius:10px;background:#071be9;color:#ffffff;font-weight:600;text-decoration:none;">
    카카오톡으로 수업 상담 신청하기🖐️
  </a>
</div>`;

function titleToSlug(title: string): string {
  return title.toLowerCase().replace(/[^\w\s가-힣]/g, '').trim()
    .replace(/\s+/g, '-').slice(0, 60) + '-' + Date.now().toString(36);
}

function makeGhostJwt(ghostAdminKey: string): string {
  const [ghostId, ghostSecret] = ghostAdminKey.split(':');
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', kid: ghostId, typ: 'JWT' })).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(JSON.stringify({ iat: now, exp: now + 300, aud: '/admin/' })).toString('base64url');
  const sig = crypto.createHmac('sha256', Buffer.from(ghostSecret, 'hex')).update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${sig}`;
}

async function saveGhostDraft(title: string, html: string, slug: string): Promise<{ id: string; url: string }> {
  const jwt = makeGhostJwt(process.env.GHOST_ADMIN_KEY!);
  const res = await fetch(`${process.env.GHOST_URL}/ghost/api/admin/posts/?source=html`, {
    method: 'POST',
    headers: { Authorization: `Ghost ${jwt}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      posts: [{ title, html: html + CTA_HTML, slug, status: 'draft', tags: [{ name: 'SAT' }, { name: 'blog-agent' }] }],
    }),
  });
  const data = await res.json() as { posts?: { id: string; url: string }[] };
  if (!data.posts?.[0]) throw new Error(`Ghost draft 실패: ${JSON.stringify(data)}`);
  return { id: data.posts[0].id, url: data.posts[0].url };
}

async function publishGhostPost(ghostId: string): Promise<string> {
  const jwt = makeGhostJwt(process.env.GHOST_ADMIN_KEY!);

  // updated_at 필드 먼저 조회 (Ghost PUT에 필수)
  const getRes = await fetch(`${process.env.GHOST_URL}/ghost/api/admin/posts/${ghostId}/`, {
    headers: { Authorization: `Ghost ${jwt}` },
  });
  const getData = await getRes.json() as { posts?: { updated_at: string; url: string }[] };
  const updatedAt = getData.posts?.[0]?.updated_at;

  const putRes = await fetch(`${process.env.GHOST_URL}/ghost/api/admin/posts/${ghostId}/`, {
    method: 'PUT',
    headers: { Authorization: `Ghost ${jwt}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ posts: [{ status: 'published', updated_at: updatedAt }] }),
  });
  const putData = await putRes.json() as { posts?: { url: string }[] };
  return putData.posts?.[0]?.url ?? `${process.env.GHOST_URL}/ghost/#/editor/post/${ghostId}`;
}

// ─── 랜딩 페이지 ──────────────────────────────────────────────────────────────

async function saveLandingDraft(title: string, html: string, slug: string, topic: Topic): Promise<string> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const today = new Date().toISOString().split('T')[0];

  const res = await fetch(`${supabaseUrl}/rest/v1/posts`, {
    method: 'POST',
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify({
      id: slug,
      title,
      content: html,
      excerpt: (topic.rationale || title).slice(0, 120),
      description: (topic.rationale || title).slice(0, 120),
      featured_image: null,
      category: 'SAT',
      tags: ['SAT', 'blog-agent'],
      author: 'SuperfastSAT',
      date: today,
      focus_keyword: title.split(' ').slice(0, 3).join(' '),
      cta_featured: false,
      is_published: false,
    }),
  });

  if (res.status !== 201) {
    const err = await res.text();
    throw new Error(`랜딩 draft 실패: ${res.status} ${err}`);
  }
  const data = await res.json() as { id: string }[];
  return data[0]?.id ?? slug;
}

async function publishLandingPost(landingId: string): Promise<string> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const res = await fetch(`${supabaseUrl}/rest/v1/posts?id=eq.${encodeURIComponent(landingId)}`, {
    method: 'PATCH',
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify({ is_published: true }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`랜딩 발행 실패: ${res.status} ${err}`);
  }
  return `https://superfastsat.com/blog/${landingId}`;
}

// ─── 스레드 메타데이터 파싱 ───────────────────────────────────────────────────

type DraftMeta = { ghostId: string; landingId: string; title: string };

async function getDraftFromThread(channel: string, threadTs: string): Promise<DraftMeta | null> {
  const res = await fetch(
    `https://slack.com/api/conversations.replies?channel=${channel}&ts=${threadTs}&limit=20`,
    { headers: { Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}` } }
  );
  const data = await res.json() as { messages?: { text: string; bot_id?: string }[] };
  for (const msg of data.messages ?? []) {
    if (!msg.bot_id) continue;
    const match = msg.text?.match(/\[blog-agent: ghost_id=([^|]+)\|landing_id=([^|]+)\|title=([^\]]+)\]/);
    if (match) return { ghostId: match[1], landingId: match[2], title: decodeURIComponent(match[3]) };
  }
  return null;
}

// ─── 메인 핸들러 ──────────────────────────────────────────────────────────────

async function handleBlogWrite(topic: Topic, channel: string, threadTs: string) {
  await postSlack(channel, `블로그 작성을 시작합니다.\n\n제목: ${topic.title}\n\n작성이 완료되면 요약본을 보여드리겠습니다.`, threadTs);

  const markdown = await writeBlog(topic);
  const html = await marked(markdown);
  const slug = titleToSlug(topic.title);

  const [ghostResult, landingResult] = await Promise.allSettled([
    saveGhostDraft(topic.title, html, slug),
    saveLandingDraft(topic.title, html, slug, topic),
  ]);

  if (ghostResult.status === 'rejected') {
    await postSlack(channel, `Ghost 저장 실패: ${ghostResult.reason?.message}`, threadTs);
    return;
  }
  if (landingResult.status === 'rejected') {
    await postSlack(channel, `랜딩 저장 실패: ${landingResult.reason?.message}`, threadTs);
    return;
  }

  const { id: ghostId } = ghostResult.value;
  const landingId = landingResult.value;

  // 요약본 추출 (첫 200자)
  const excerpt = markdown.replace(/#{1,3} .+\n/g, '').replace(/\n+/g, ' ').trim().slice(0, 200);

  // 메타데이터 포함 요약본 게시
  const meta = `[blog-agent: ghost_id=${ghostId}|landing_id=${landingId}|title=${encodeURIComponent(topic.title)}]`;
  await postSlack(
    channel,
    `${meta}\n\n*블로그 초안 완성 — 확인해주세요*\n\n*제목:* ${topic.title}\n\n*요약:*\n${excerpt}...\n\n> 발행하려면 이 스레드에서 *@landingpage 발행할게요* 라고 입력해주세요.`,
    threadTs
  );
}

async function handlePublish(channel: string, threadTs: string) {
  const meta = await getDraftFromThread(channel, threadTs);
  if (!meta) {
    await postSlack(channel, '이 스레드에서 작성된 블로그 초안을 찾을 수 없습니다.', threadTs);
    return;
  }

  await postSlack(channel, `발행을 시작합니다. 잠시만 기다려주세요...`, threadTs);

  const [ghostResult, landingResult] = await Promise.allSettled([
    publishGhostPost(meta.ghostId),
    publishLandingPost(meta.landingId),
  ]);

  const ghostUrl = ghostResult.status === 'fulfilled'
    ? ghostResult.value
    : `(Ghost 발행 실패: ${ghostResult.reason?.message})`;
  const landingUrl = landingResult.status === 'fulfilled'
    ? landingResult.value
    : `(랜딩 발행 실패: ${landingResult.reason?.message})`;

  await postSlack(
    channel,
    `발행 완료!\n\n*제목:* ${meta.title}\nGhost: ${ghostUrl}\n랜딩: ${landingUrl}`,
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
    event?: {
      type: string;
      text?: string;
      channel?: string;
      ts?: string;
      thread_ts?: string;
      bot_id?: string;
    };
  };

  if (payload.type === 'url_verification') {
    return NextResponse.json({ challenge: payload.challenge });
  }

  const event = payload.event;
  if (!event || event.type !== 'app_mention' || event.bot_id) {
    return NextResponse.json({ ok: true });
  }

  const text = event.text ?? '';
  const channel = event.channel!;
  const threadTs = event.thread_ts ?? event.ts!;

  // ── 패턴 감지 ─────────────────────────────────────────────────────────────

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
    const anthropicKey = process.env.ANTHROPIC_API_KEY ?? '';
    if (!anthropicKey) {
      await postSlack(channel, 'ANTHROPIC_API_KEY가 설정되지 않았습니다.', threadTs);
      return NextResponse.json({ ok: true });
    }
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
  const check = (key: string) => !!process.env[key];
  return NextResponse.json({
    status: 'ok',
    env: {
      GHOST_URL: check('GHOST_URL'),
      GHOST_ADMIN_KEY: check('GHOST_ADMIN_KEY'),
      SUPABASE_URL: check('NEXT_PUBLIC_SUPABASE_URL'),
      SUPABASE_SERVICE_KEY: check('SUPABASE_SERVICE_ROLE_KEY'),
      ANTHROPIC_API_KEY: check('ANTHROPIC_API_KEY'),
      SLACK_BOT_TOKEN: check('SLACK_BOT_TOKEN'),
      SLACK_SIGNING_SECRET: check('SLACK_SIGNING_SECRET'),
    },
  });
}
