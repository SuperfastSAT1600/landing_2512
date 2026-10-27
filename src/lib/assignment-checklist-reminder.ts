/** 미완료 배정 체크리스트 DM 알림: 대상 선별과 문구 (순수) + 전송 */
import { ASSIGNMENT_TASKS } from '@/lib/slack-assignment-checklist';

/** 알림 받을 담당자 (2017newshcoach, minjae.lee90) */
export const REMINDER_RECIPIENTS = ['U07FK6LSK7C', 'U07FMTVHYBX'];

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

export function pickDueChecklists(rows: OpenChecklist[], now: Date): OpenChecklist[] {
  return rows.filter((r) => now.getTime() - new Date(r.last_reminded_at ?? r.created_at).getTime() >= REMIND_AFTER_MS);
}

function describe(row: OpenChecklist): string {
  const remaining = ASSIGNMENT_TASKS.filter((t) => !row.checked_ids.includes(t.id)).map((t) => `• ${t.label}`);
  const title = row.request_text.split('\n')[0].slice(0, 80) || '(요청 글)';
  const link = `https://slack.com/archives/${row.channel}/p${row.message_ts.replace('.', '')}`;
  return `*${title}*\n${remaining.join('\n')}\n<${link}|스레드 보기>`;
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
