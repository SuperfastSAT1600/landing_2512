/** 미완료 배정 체크리스트 DM 알림: 대상 선별과 문구 (순수) + 전송 */
import { ASSIGNMENT_TASKS } from '@/lib/slack-assignment-checklist';

/** cron 이 3시간마다 도는 시각 오차를 감안해 3시간보다 조금 짧게 잡는다 */
const REMIND_AFTER_MS = 170 * 60 * 1000;

export interface OpenChecklist {
  channel: string;
  message_ts: string;
  request_text: string;
  checked_ids: string[];
  created_at: string;
  last_reminded_at: string | null;
}

/** 알릴 시점이 된 건. 받을 사람(태그된 사람)이 없는 건은 제외한다 */
export function pickDueChecklists(rows: OpenChecklist[], now: Date): OpenChecklist[] {
  return rows.filter((r) => recipientsOf(r).length > 0
    && now.getTime() - new Date(r.last_reminded_at ?? r.created_at).getTime() >= REMIND_AFTER_MS);
}

function describe(row: OpenChecklist): string {
  const remaining = ASSIGNMENT_TASKS.filter((t) => !row.checked_ids.includes(t.id)).map((t) => `• ${t.label}`);
  const title = row.request_text.replace(MENTION, '').split('\n').map((l) => l.trim()).find(Boolean)?.slice(0, 80) ?? '(요청 글)';
  const link = `https://slack.com/archives/${row.channel}/p${row.message_ts.replace('.', '')}`;
  return `*${title}*\n${remaining.join('\n')}\n<${link}|스레드 보기>`;
}

const MENTION = /<@([UW][A-Z0-9]+)(?:\|[^>]*)?>/g;

/** 요청 글에서 태그된 Slack 사용자 ID (순서 유지, 중복 제거) */
export function extractMentionedUserIds(text: string): string[] {
  return [...new Set([...text.matchAll(MENTION)].map((m) => m[1]))];
}

/** 알림 수신자: 요청 글에서 태그된 사용자뿐 (고정 수신자 없음) */
export function recipientsOf(row: OpenChecklist): string[] {
  return extractMentionedUserIds(row.request_text);
}

/** 수신자별로 자기가 받을 건만 모은다 (한 사람에게 DM 1통) */
export function groupByRecipient(rows: OpenChecklist[]): Map<string, OpenChecklist[]> {
  const groups = new Map<string, OpenChecklist[]>();
  for (const row of rows) {
    for (const userId of recipientsOf(row)) groups.set(userId, [...(groups.get(userId) ?? []), row]);
  }
  return groups;
}

export function buildReminderText(rows: OpenChecklist[]): string {
  return `⏰ 아직 끝나지 않은 학생 배정 업무 ${rows.length}건\n\n${rows.map(describe).join('\n\n')}`;
}

/** DM 전송. 실패하면 던져서 cron 이 알림 시각을 갱신하지 않게 한다 */
export async function sendDirectMessage(userId: string, text: string): Promise<void> {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) throw new Error('SLACK_BOT_TOKEN not set');
  const res = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ channel: userId, text }),
    signal: AbortSignal.timeout(5000),
  });
  const body = (await res.json()) as { ok?: boolean; error?: string };
  if (!body.ok) throw new Error(`Slack API error: ${body.error}`);
}
