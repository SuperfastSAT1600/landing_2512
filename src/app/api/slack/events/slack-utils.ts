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

export async function getTodayTopics(): Promise<Topic[]> {
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

export type DraftMeta = { ghostId: string; landingId: string; title: string };

export async function getDraftFromThread(
  channel: string, threadTs: string
): Promise<DraftMeta | null> {
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
