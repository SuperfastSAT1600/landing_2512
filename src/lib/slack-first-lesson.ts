/** 첫 수업 잡힘 알림 전송. cron 이 실패 시 재시도하도록 실패하면 던진다. */
import { COACH_RESPONSE_CHANNEL } from '@/lib/slack-coach-response';

export async function postFirstLessonNotice(text: string): Promise<void> {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) throw new Error('SLACK_BOT_TOKEN not set');
  const res = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ channel: COACH_RESPONSE_CHANNEL, text }),
    signal: AbortSignal.timeout(5000),
  });
  const body = (await res.json()) as { ok?: boolean; error?: string };
  if (!body.ok) throw new Error(`Slack API error: ${body.error}`);
}
