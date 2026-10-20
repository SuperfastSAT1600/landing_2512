/**
 * 코치 준비 응답(수업 수락/거절) 슬랙 알림.
 * 상담 메모 알림(slack-memo)과 채널이 달라 별도 모듈로 둔다. 전송 실패는 삼켜서 응답 저장에 영향을 주지 않는다.
 */
import { formatKst } from '@/lib/coach-prep-request';

export const COACH_RESPONSE_CHANNEL = 'C0C9B0DEGDN';

export interface CoachResponseNotice {
  studentName: string;
  coachName: string;
  action: 'accept' | 'decline';
  firstLessonAt?: string | null;
  reason?: string | null;
  deadlineAt: string;
}

export function buildCoachResponseText(n: CoachResponseNotice): string {
  const head = n.action === 'accept' ? '✅ *코치 수업 수락*' : '🙅 *코치 수업 어려움*';
  const lines = [`${head}`, `*학생:* ${n.studentName}  |  *코치:* ${n.coachName}`];
  if (n.action === 'accept' && n.firstLessonAt) {
    lines.push(`*첫 수업:* ${formatKst(n.firstLessonAt)} (KST)`);
  }
  if (n.action === 'decline') {
    lines.push(`*사유:* ${n.reason?.trim() || '사유 없음'}`);
  }
  lines.push(`*응답 마감:* ${formatKst(n.deadlineAt)} (KST)`);
  return lines.join('\n');
}

export async function notifyCoachResponseToSlack(notice: CoachResponseNotice): Promise<void> {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) return;

  try {
    const res = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ channel: COACH_RESPONSE_CHANNEL, text: buildCoachResponseText(notice) }),
      signal: AbortSignal.timeout(5000), // Slack이 멈춰도 코치 응답 요청이 같이 매달리지 않게
    });
    const body = (await res.json()) as { ok?: boolean; error?: string };
    if (!body.ok) console.error('[slack-coach-response]', body.error);
  } catch (e) {
    console.error('[slack-coach-response]', e);
  }
}
