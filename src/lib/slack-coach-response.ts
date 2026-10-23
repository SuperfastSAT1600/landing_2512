/**
 * 코치 준비 응답(수업 수락/거절) 슬랙 알림.
 * 상담 메모 알림(slack-memo)과 채널이 달라 별도 모듈로 둔다. 전송 실패는 삼켜서 응답 저장에 영향을 주지 않는다.
 */
import { formatKst, lessonOptions } from '@/lib/coach-prep-request';
import type { LessonTimes } from '@/types/coach-prep';

export const COACH_RESPONSE_CHANNEL = 'C0C9B0DEGDN';

export interface CoachResponseNotice {
  studentName: string;
  coachName: string;
  action: 'accept' | 'decline';
  lessons?: LessonTimes | null;
  reason?: string | null;
  deadlineAt: string;
  /** 학생 IANA 시간대. 있으면 수업 시간 옆에 학생 현지 시각을 함께 보여 준다 */
  studentTimezone?: string | null;
}

/** "10/25(일) 22:30 PDT" — 학생 현지 시각(DST 반영) */
export function formatInZone(iso: string, timeZone: string): string {
  const d = new Date(iso);
  const part = (locale: string, opts: Intl.DateTimeFormatOptions, type: string) =>
    new Intl.DateTimeFormat(locale, { timeZone, hourCycle: 'h23', ...opts }).formatToParts(d).find((x) => x.type === type)?.value ?? '';
  const ko = (opts: Intl.DateTimeFormatOptions, type: string) => part('ko-KR', opts, type);
  const time = `${ko({ hour: '2-digit' }, 'hour')}:${ko({ minute: '2-digit' }, 'minute')}`;
  // 요일은 한글, 시간대 약어(PDT 등)는 영문이 읽기 쉽다
  return `${ko({ month: 'numeric' }, 'month')}/${ko({ day: 'numeric' }, 'day')}(${ko({ weekday: 'short' }, 'weekday')}) ${time} ${part('en-US', { timeZoneName: 'short' }, 'timeZoneName')}`;
}

export function buildCoachResponseText(n: CoachResponseNotice): string {
  const head = n.action === 'accept' ? '✅ *코치 수업 수락*' : '🙅 *코치 수업 어려움*';
  const lines = [`${head}`, `*학생:* ${n.studentName}  |  *코치:* ${n.coachName}`];
  if (n.action === 'accept' && n.lessons) {
    const tz = n.studentTimezone;
    for (const o of lessonOptions(n.lessons)) {
      lines.push(`*${o.label}:* 첫 수업 ${formatKst(o.first)} / 두 번째 수업 ${formatKst(o.second)} (KST)`);
      if (tz) lines.push(`      학생 시간(${tz}): 첫 수업 ${formatInZone(o.first, tz)} / 두 번째 수업 ${formatInZone(o.second, tz)}`);
    }
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
