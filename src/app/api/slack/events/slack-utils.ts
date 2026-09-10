import { NextRequest } from 'next/server';
import crypto from 'crypto';
import type { Topic } from './blog-writer';

export const BLOG_CHANNEL = 'C0A28EJQA7P';

export async function verifySlackRequest(req: NextRequest, body: string): Promise<boolean> {
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

export async function postSlack(channel: string, text: string, threadTs?: string): Promise<void> {
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

function todayKSTString(): string {
  // Vercel 서버는 UTC 기준 — 반드시 Asia/Seoul 지정
  return new Date().toLocaleDateString('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
  });
}

function parseTopicsFromMessage(text: string): Topic[] {
  const topics: Topic[] = [];
  let current: Topic | null = null;
  for (const line of text.split('\n')) {
    const match = line.match(/^(\d+)\.\s+(.+)/);
    if (match) {
      if (current) topics.push(current);
      current = { n: parseInt(match[1]), title: match[2].replace(/^\[.+?\]\s*/, '').trim(), rationale: '', point: '' };
    } else if (current) {
      if (line.includes('근거:')) current.rationale = line.replace(/^\s*근거:\s*/, '').trim();
      else if (line.includes('포인트:')) current.point = line.replace(/^\s*포인트:\s*/, '').trim();
    }
  }
  if (current) topics.push(current);
  return topics;
}

export async function getTodayTopics(): Promise<Topic[]> {
  const res = await fetch(
    // limit=50으로 늘려 채널이 바쁜 날에도 당일 주제 메시지를 찾을 수 있도록
    `https://slack.com/api/conversations.history?channel=${BLOG_CHANNEL}&limit=50`,
    { headers: { Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}` } }
  );
  const data = await res.json() as { messages?: { text: string; bot_id?: string }[] };
  const todayKST = todayKSTString();

  const topicMsg = data.messages?.find(
    m => m.bot_id && m.text?.includes('[오늘의 블로그 주제 제안') && m.text?.includes(todayKST)
  );
  if (!topicMsg) return [];
  return parseTopicsFromMessage(topicMsg.text);
}

export type DraftMeta = { ghostId: string; landingId: string; title: string };

function parseDraftMeta(text: string): DraftMeta | null {
  const match = text.match(/\[blog-agent: ghost_id=([^|]+)\|landing_id=([^|]+)\|title=([^\]]+)\]/);
  if (!match) return null;
  return { ghostId: match[1], landingId: match[2], title: decodeURIComponent(match[3]) };
}

export async function getDraftFromThread(
  channel: string, threadTs: string
): Promise<DraftMeta | null> {
  // 1. 현재 스레드에서 먼저 탐색
  const threadRes = await fetch(
    `https://slack.com/api/conversations.replies?channel=${channel}&ts=${threadTs}&limit=20`,
    { headers: { Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}` } }
  );
  const threadData = await threadRes.json() as { messages?: { text: string; bot_id?: string }[] };
  for (const msg of threadData.messages ?? []) {
    if (!msg.bot_id) continue;
    const meta = parseDraftMeta(msg.text ?? '');
    if (meta) return meta;
  }

  // 2. 스레드에 없으면 채널 최근 메시지에서 가장 최근 초안 탐색 (newest-first)
  const histRes = await fetch(
    `https://slack.com/api/conversations.history?channel=${channel}&limit=50`,
    { headers: { Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}` } }
  );
  const histData = await histRes.json() as { messages?: { text: string; bot_id?: string; reply_count?: number; ts?: string }[] };
  for (const msg of histData.messages ?? []) {
    // 최상위 봇 메시지에 직접 메타가 있는 경우 (admin trigger 등)
    if (msg.bot_id) {
      const meta = parseDraftMeta(msg.text ?? '');
      if (meta) return meta;
    }
    // 유저/봇 메시지 모두: 스레드가 있으면 그 안에서 탐색
    if ((msg.reply_count ?? 0) > 0 && msg.ts) {
      const repRes = await fetch(
        `https://slack.com/api/conversations.replies?channel=${channel}&ts=${msg.ts}&limit=20`,
        { headers: { Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}` } }
      );
      const repData = await repRes.json() as { messages?: { text: string; bot_id?: string }[] };
      for (const rep of repData.messages ?? []) {
        if (!rep.bot_id) continue;
        const repMeta = parseDraftMeta(rep.text ?? '');
        if (repMeta) return repMeta;
      }
    }
  }

  return null;
}
