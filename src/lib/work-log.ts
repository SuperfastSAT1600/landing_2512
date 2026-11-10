/** 운영 업무 채널의 글을 할 일로 읽는다. 상태는 Slack(태그·✅ 반응·삭제)이 원본이고 서버 전용이다 */
import { extractMentionedUserIds } from '@/lib/assignment-checklist-reminder';
import { ASSIGNMENT_CHANNEL } from '@/lib/slack-assignment-checklist';

export const WORK_CHANNEL = ASSIGNMENT_CHANNEL;
export const DONE_REACTION = 'white_check_mark';
const MAX_PAGES = 5;

export interface SlackWorkMessage {
  ts: string;
  text?: string;
  user?: string;
  subtype?: string;
  reply_count?: number;
  files?: unknown[];
  reactions?: { name: string; users?: string[] }[];
}

export interface WorkItem {
  messageTs: string;
  postedAt: string;
  text: string;
  authorName: string;
  assignees: string[];
  done: boolean;
  doneBy: string | null;
  /** 처음 ✅ 가 달린 시각. 반응 이벤트 기록이 있을 때만 */
  doneAt: string | null;
  permalink: string;
  replyCount: number;
  fileCount: number;
  student: { id: string; name: string } | null;
}

type Names = Record<string, string>;

/** 입장 알림·삭제 흔적을 뺀 글만 할 일이다 */
export function isWorkMessage(m: SlackWorkMessage): boolean {
  return !m.subtype || m.subtype === 'file_share' || m.subtype === 'bot_message';
}

function doneUserId(m: SlackWorkMessage): string | undefined {
  return m.reactions?.find((r) => r.name === DONE_REACTION)?.users?.[0];
}

export function formatSlackText(text: string, names: Names): string {
  return text
    .replace(/<@([UW][A-Z0-9]+)(?:\|[^>]*)?>/g, (_, id: string) => `@${names[id] ?? id}`)
    .replace(/<#C[A-Z0-9]+\|([^>]*)>/g, '#$1')
    .replace(/<!subteam\^[^|>]+\|([^>]+)>/g, '$1')
    .replace(/<!(here|channel|everyone)>/g, '@$1')
    .replace(/<(https?:[^>|]+)\|([^>]+)>/g, '$2')
    .replace(/<(https?:[^>]+)>/g, '$1')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
    .trim();
}

export function toWorkItem(m: SlackWorkMessage, names: Names): WorkItem {
  const text = m.text ?? '';
  const doneId = doneUserId(m);
  return {
    messageTs: m.ts,
    postedAt: new Date(Number(m.ts) * 1000).toISOString(),
    text: formatSlackText(text, names),
    authorName: (m.user && names[m.user]) || '알 수 없음',
    assignees: extractMentionedUserIds(text).map((id) => names[id] ?? id),
    done: Boolean(doneId),
    doneBy: doneId ? names[doneId] ?? doneId : null,
    doneAt: null,
    permalink: `https://slack.com/archives/${WORK_CHANNEL}/p${m.ts.replace('.', '')}`,
    replyCount: m.reply_count ?? 0,
    fileCount: m.files?.length ?? 0,
    student: null,
  };
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** 소요 시간: 하루 이상은 일·시간, 그 아래는 시간·분 */
export function formatDuration(ms: number): string {
  if (ms < MINUTE) return '1분 미만';
  const [big, bigUnit, small, smallUnit] = ms >= DAY
    ? [Math.floor(ms / DAY), '일', Math.floor((ms % DAY) / HOUR), '시간']
    : [Math.floor(ms / HOUR), '시간', Math.floor((ms % HOUR) / MINUTE), '분'];
  if (big === 0) return `${small}${smallUnit}`;
  return small === 0 ? `${big}${bigUnit}` : `${big}${bigUnit} ${small}${smallUnit}`;
}

function userIdsOf(messages: SlackWorkMessage[]): string[] {
  const ids = messages.flatMap((m) => [m.user, doneUserId(m), ...extractMentionedUserIds(m.text ?? '')]);
  return [...new Set(ids.filter((id): id is string => Boolean(id)))];
}

async function slackGet<T>(method: string, params: Record<string, string>): Promise<T> {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) throw new Error('SLACK_BOT_TOKEN not set');
  const res = await fetch(`https://slack.com/api/${method}?${new URLSearchParams(params)}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(8000),
  });
  const data = (await res.json()) as T & { ok?: boolean; error?: string };
  if (!data.ok) throw new Error(`Slack ${method}: ${data.error}`);
  return data;
}

async function fetchMessages(): Promise<SlackWorkMessage[]> {
  const messages: SlackWorkMessage[] = [];
  let cursor = '';
  for (let page = 0; page < MAX_PAGES; page++) {
    const data = await slackGet<{ messages?: SlackWorkMessage[]; response_metadata?: { next_cursor?: string } }>(
      'conversations.history', { channel: WORK_CHANNEL, limit: '200', ...(cursor ? { cursor } : {}) },
    );
    messages.push(...(data.messages ?? []));
    cursor = data.response_metadata?.next_cursor ?? '';
    if (!cursor) break;
  }
  return messages;
}

async function fetchNames(ids: string[]): Promise<Names> {
  const entries = await Promise.all(ids.map(async (id) => {
    type Info = { user?: { real_name?: string; name?: string; profile?: { display_name?: string } } };
    const info = await slackGet<Info>('users.info', { user: id }).catch(() => null);
    const name = info?.user?.profile?.display_name || info?.user?.real_name || info?.user?.name;
    return [id, name ?? id] as const;
  }));
  return Object.fromEntries(entries);
}

/** 최신 글부터 */
export async function fetchWorkItems(): Promise<WorkItem[]> {
  const messages = (await fetchMessages()).filter(isWorkMessage);
  const names = await fetchNames(userIdsOf(messages));
  return messages.map((m) => toWorkItem(m, names));
}

/** 지정한 글들만 하나씩 읽는다. 지워진 글은 빠진다. 최신 글부터 */
export async function fetchWorkItemsByTs(tsList: string[]): Promise<WorkItem[]> {
  if (!tsList.length) return [];
  const found = await Promise.all(tsList.map(async (ts) => {
    const data = await slackGet<{ messages?: SlackWorkMessage[] }>(
      'conversations.history', { channel: WORK_CHANNEL, latest: ts, oldest: ts, inclusive: 'true', limit: '1' },
    );
    return data.messages?.find((m) => m.ts === ts && isWorkMessage(m));
  }));
  const messages = found.filter((m): m is SlackWorkMessage => Boolean(m)).sort((a, b) => Number(b.ts) - Number(a.ts));
  const names = await fetchNames(userIdsOf(messages));
  return messages.map((m) => toWorkItem(m, names));
}
