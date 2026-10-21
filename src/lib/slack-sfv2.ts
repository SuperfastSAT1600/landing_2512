/**
 * sfv2(SRM) 운영 채널 Slack 알림 헬퍼.
 * 채널: #006_학습현황_출석률 (C0BNF23DQ5R)
 */

import type { EndingSoon, HoursBucket } from '@/app/api/cron/schedule-input-status/route';

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
  endingSoon: EndingSoon[];
  hoursBuckets: HoursBucket[];
  recentStudyHallVocabNames: Set<string>;
  recentCoachRoomNames: Set<string>;
  scheduledMinutesByName: Map<string, { studyHall: number; vocab: number }>;
  windowLabel: string;
}): Promise<void> {
  const { endingSoon, hoursBuckets, recentStudyHallVocabNames, recentCoachRoomNames, scheduledMinutesByName, windowLabel } = params;

  const nowKST = new Date(Date.now() + 9 * 60 * 60 * 1000)
    .toISOString().slice(5, 16).replace('T', ' ');

  const totalNeedingAttention = hoursBuckets.reduce((s, b) =>
    s +
    b.noCoach.reduce((s2, e) => s2 + e.students.length, 0) +
    b.hasCoach.reduce((s2, e) => s2 + e.students.length, 0), 0);

  // ── 레전드 ──
  const legendText = `📋 *스케줄 현황 브리핑* — ${nowKST} KST\n기간: ${windowLabel}\n\n🏫 수업(코치룸)　　📚 스터디홀　　📝 보캡　　🔔 스터디홀/보캡 신규 입력　　🆕 코치룸 신규 입력\n이름 옆 괄호 = 등록된 미래 일정 시간 (앞 숫자: 스터디홀 / 뒤 숫자: 보캡)`;

  // ── 종료 임박 ──
  let endingSoonText: string;
  if (endingSoon.length === 0) {
    endingSoonText = '🟠 *종료 임박: 0명*';
  } else {
    const lines = [`🟠 *종료 임박: ${endingSoon.length}명* _(마지막 스터디홀/보캡이 내일까지인 학생)_`];
    for (const s of endingSoon) {
      lines.push(`• *${s.studentName}* — 마지막 일정 ${s.lastDate}`);
    }
    endingSoonText = lines.join('\n');
  }

  // ── 잔여 시간별 현황 ──
  function subLabel(hasStudyHall: boolean, hasVocab: boolean): string {
    return `📚${hasStudyHall ? '✓' : '✗'} 📝${hasVocab ? '✓' : '✗'}`;
  }

  function formatHours(minutes: number): string {
    return `${Number((minutes / 60).toFixed(1))}h`;
  }

  function scheduledHoursLabel(name: string): string {
    const m = scheduledMinutesByName.get(name);
    if (!m) return '';
    return ` (${formatHours(m.studyHall)}/${formatHours(m.vocab)})`;
  }

  function renderEntries(entries: import('@/app/api/cron/schedule-input-status/route').ScheduleStatusEntry[]): string[] {
    return entries.map(entry => {
      const names = entry.students.map(n => {
        const marks = `${recentStudyHallVocabNames.has(n) ? '🔔' : ''}${recentCoachRoomNames.has(n) ? '🆕' : ''}`;
        return `${n}${scheduledHoursLabel(n)}${marks ? ` ${marks}` : ''}`;
      }).join(', ');
      return `　　${subLabel(entry.hasStudyHall, entry.hasVocab)}　${names}`;
    });
  }

  const blocks: object[] = [
    { type: 'section', text: { type: 'mrkdwn', text: legendText } },
    { type: 'divider' },
    { type: 'section', text: { type: 'mrkdwn', text: endingSoonText } },
    { type: 'divider' },
  ];

  if (hoursBuckets.length === 0) {
    blocks.push({ type: 'section', text: { type: 'mrkdwn', text: '✅ *모든 학생 스케줄 완비* — 조치 필요 없음' } });
  } else {
    blocks.push({ type: 'section', text: { type: 'mrkdwn', text: `*잔여 수업 시간별 현황 — 조치 필요 ${totalNeedingAttention}명*` } });

    for (const bucket of hoursBuckets) {
      const totalInBucket =
        bucket.noCoach.reduce((s, e) => s + e.students.length, 0) +
        bucket.hasCoach.reduce((s, e) => s + e.students.length, 0);
      const lines = [`${bucket.emoji} *잔여 ${bucket.label} (${totalInBucket}명)*`];

      if (bucket.noCoach.length > 0) {
        const count = bucket.noCoach.reduce((s, e) => s + e.students.length, 0);
        lines.push(`🏫✗ 코치룸 없음 (${count}명)`);
        lines.push(...renderEntries(bucket.noCoach));
      }
      if (bucket.hasCoach.length > 0) {
        const count = bucket.hasCoach.reduce((s, e) => s + e.students.length, 0);
        lines.push(`🏫✓ 코치룸 있음 (${count}명)`);
        lines.push(...renderEntries(bucket.hasCoach));
      }

      blocks.push({ type: 'section', text: { type: 'mrkdwn', text: lines.join('\n') } });
    }
  }

  const fallbackText = `📋 스케줄 현황 — 조치 필요 ${totalNeedingAttention}명`;
  await post(SCHEDULE_STATUS_CHANNEL, fallbackText, blocks);
}
