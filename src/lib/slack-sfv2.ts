/**
 * sfv2(SRM) 운영 채널 Slack 알림 헬퍼.
 * 채널: #006_학습현황_출석률 (C0BNF23DQ5R)
 */

import type { ScheduleEntry } from '@/app/api/cron/schedule-input-status/route';

const SCHEDULE_STATUS_CHANNEL = 'C0BNF23DQ5R';

async function post(channel: string, text: string, blocks: object[]): Promise<void> {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) {
    console.warn('[slack-sfv2] SLACK_BOT_TOKEN not set — skipping');
    return;
  }

  const res = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ channel, text, blocks }),
  });

  const data = await res.json() as { ok: boolean; error?: string };
  if (!data.ok) throw new Error(`Slack API error (${channel}): ${data.error}`);
}

const TYPE_EMOJI: Record<ScheduleEntry['activityType'], string> = {
  'Study Hall': '📚',
  'Vocab': '📝',
  'Test Center': '🎯',
};

export async function notifyScheduleInputStatus(params: {
  scheduled: ScheduleEntry[];
  unscheduled: string[];
  windowLabel: string;
}): Promise<void> {
  const { scheduled, unscheduled, windowLabel } = params;

  const nowKST = new Date(Date.now() + 9 * 60 * 60 * 1000)
    .toISOString().slice(5, 16).replace('T', ' ');

  const headerText = `📅 *학습 일정 신규 입력 현황* — ${nowKST} KST\n기간: ${windowLabel}`;

  // ── 신규 입력 섹션 ──
  const scheduledByStudent = new Map<string, ScheduleEntry[]>();
  for (const e of scheduled) {
    const list = scheduledByStudent.get(e.studentName) ?? [];
    list.push(e);
    scheduledByStudent.set(e.studentName, list);
  }

  let scheduledText: string;
  if (scheduledByStudent.size === 0) {
    scheduledText = '✅ *신규 입력 학생: 0명*\n없음';
  } else {
    const lines = [`✅ *신규 입력 학생: ${scheduledByStudent.size}명*`];
    for (const [name, entries] of scheduledByStudent) {
      for (const e of entries) {
        lines.push(`• *${name}* — ${TYPE_EMOJI[e.activityType]} ${e.activityType}  ${e.scheduledTime}`);
      }
    }
    scheduledText = lines.join('\n');
  }

  // ── 미입력 섹션 ──
  let unscheduledText: string;
  if (unscheduled.length === 0) {
    unscheduledText = '🎉 *미입력 학생: 0명*\n전원 스케줄 입력 완료!';
  } else {
    unscheduledText = `⚠️ *미입력 학생: ${unscheduled.length}명*\n${unscheduled.join(', ')}`;
  }

  const blocks = [
    {
      type: 'section',
      text: { type: 'mrkdwn', text: headerText },
    },
    { type: 'divider' },
    {
      type: 'section',
      text: { type: 'mrkdwn', text: scheduledText },
    },
    { type: 'divider' },
    {
      type: 'section',
      text: { type: 'mrkdwn', text: unscheduledText },
    },
  ];

  const fallbackText = `📅 학습 일정 신규 입력 현황 — 입력 ${scheduledByStudent.size}명 / 미입력 ${unscheduled.length}명`;
  await post(SCHEDULE_STATUS_CHANNEL, fallbackText, blocks);
}
