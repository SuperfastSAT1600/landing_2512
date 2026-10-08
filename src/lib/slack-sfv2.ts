/**
 * sfv2(SRM) 운영 채널 Slack 알림 헬퍼.
 * 채널: #006_학습현황_출석률 (C0BNF23DQ5R)
 */

import type { StudentSummary, EndingSoon, NoScheduleGroup } from '@/app/api/cron/schedule-input-status/route';

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

export async function notifyScheduleInputStatus(params: {
  summaries: StudentSummary[];
  endingSoon: EndingSoon[];
  noScheduleGroups: NoScheduleGroup[];
  windowLabel: string;
}): Promise<void> {
  const { summaries, endingSoon, noScheduleGroups, windowLabel } = params;

  const nowKST = new Date(Date.now() + 9 * 60 * 60 * 1000)
    .toISOString().slice(5, 16).replace('T', ' ');

  const totalNoSchedule = noScheduleGroups.reduce((s, g) => s + g.students.length, 0);

  const legendText = `📋 *스케줄 입력 현황* — ${nowKST} KST\n기간: ${windowLabel}\n\n📚 Study Hall　　📝 Vocab　　🎯 Test Center`;

  // ── 신규 입력 (칭찬용) ──
  let scheduledText: string;
  if (summaries.length === 0) {
    scheduledText = '✅ *신규 입력: 0명*\n없음';
  } else {
    const lines = [`✅ *신규 입력: ${summaries.length}명*`];
    for (const s of summaries) {
      const icons = [
        s.studyHall > 0 ? `📚×${s.studyHall}` : '',
        s.vocab > 0 ? `📝×${s.vocab}` : '',
        s.testCenter > 0 ? `🎯×${s.testCenter}` : '',
      ].filter(Boolean).join('  ');
      const dateRange = s.firstDate === s.lastDate ? s.firstDate : `${s.firstDate}~${s.lastDate}`;
      lines.push(`• *${s.studentName}* — ${icons}  _${dateRange}_`);
    }
    scheduledText = lines.join('\n');
  }

  // ── 종료 임박 ──
  let endingSoonText: string;
  if (endingSoon.length === 0) {
    endingSoonText = '🟠 *종료 임박: 0명*';
  } else {
    const lines = [`🟠 *종료 임박: ${endingSoon.length}명* _(마지막 일정이 내일까지인 학생)_`];
    for (const s of endingSoon) {
      lines.push(`• *${s.studentName}* — 마지막 일정 ${s.lastDate}`);
    }
    endingSoonText = lines.join('\n');
  }

  // ── 예정 일정 없음 (잔여 시간별 그룹핑) ──
  const GROUP_EMOJI: Record<string, string> = {
    '0시간':     '🔴',
    '1~10시간':  '🟠',
    '11~20시간': '🟡',
    '21시간+':   '🟢',
  };

  let noScheduleText: string;
  if (totalNoSchedule === 0) {
    noScheduleText = '⚠️ *예정 일정 없음: 0명*\n전원 일정 입력 완료!';
  } else {
    const lines = [`⚠️ *예정 일정 없음: ${totalNoSchedule}명*`];
    for (const g of noScheduleGroups) {
      const emoji = GROUP_EMOJI[g.label] ?? '⚪';
      lines.push(`\n${emoji} *${g.label} (${g.students.length}명)*\n${g.students.join(', ')}`);
    }
    noScheduleText = lines.join('\n');
  }

  const blocks = [
    { type: 'section', text: { type: 'mrkdwn', text: legendText } },
    { type: 'divider' },
    { type: 'section', text: { type: 'mrkdwn', text: scheduledText } },
    { type: 'divider' },
    { type: 'section', text: { type: 'mrkdwn', text: endingSoonText } },
    { type: 'divider' },
    { type: 'section', text: { type: 'mrkdwn', text: noScheduleText } },
  ];

  const fallbackText = `📋 스케줄 입력 현황 — 신규 ${summaries.length}명 / 종료임박 ${endingSoon.length}명 / 예정없음 ${totalNoSchedule}명`;
  await post(SCHEDULE_STATUS_CHANNEL, fallbackText, blocks);
}
