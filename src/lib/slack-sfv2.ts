/**
 * sfv2(SRM) 운영 채널 Slack 알림 헬퍼.
 * 채널: #006_학습현황_출석률 (C0BNF23DQ5R)
 */

import type { Briefing, BriefingEntry } from '@/app/api/cron/schedule-input-status/classify';
import type { CoachRatio, StudentRatio } from '@/app/api/cron/schedule-input-status/coach-ratio';

const SCHEDULE_STATUS_CHANNEL = 'C0BNF23DQ5R';

async function post(channel: string, text: string, blocks: object[], threadTs?: string): Promise<string | undefined> {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) {
    console.warn('[slack-sfv2] SLACK_BOT_TOKEN not set — skipping');
    return undefined;
  }

  const res = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ channel, text, blocks, thread_ts: threadTs }),
  });

  const data = await res.json() as { ok: boolean; error?: string; ts?: string };
  if (!data.ok) throw new Error(`Slack API error (${channel}): ${data.error}`);
  return data.ts;
}

function formatHours(minutes: number): string {
  return `${Number((minutes / 60).toFixed(1))}h`;
}

function formatKSTDate(date: Date): string {
  const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return `${kst.getUTCMonth() + 1}/${kst.getUTCDate()}`;
}

function remainingLabel(e: BriefingEntry): string {
  return `잔여 수업 ${Number(e.remainingHours.toFixed(1))}h`;
}

function endingSoonLine(e: BriefingEntry): string {
  const last = e.lastDate ? `마지막 ${formatKSTDate(e.lastDate)}` : '';
  return `• *${e.name}* (${formatHours(e.studyHallMinutes)}/${formatHours(e.vocabMinutes)}) — ${last} · ${remainingLabel(e)}`;
}

function plainLine(e: BriefingEntry): string {
  return `• *${e.name}*${e.isNew ? ' `new`' : ''} — ${remainingLabel(e)}`;
}

function listSection(title: string, entries: BriefingEntry[], line: (e: BriefingEntry) => string): object {
  const text = entries.length
    ? [`${title} *${entries.length}명*`, ...entries.map(line)].join('\n')
    : `${title} *0명*`;
  return { type: 'section', text: { type: 'mrkdwn', text } };
}

function formatDelta(deltaPp: number | null): string {
  if (deltaPp === null) return '-';
  if (Math.abs(deltaPp) < 0.05) return '변동 없음';
  return `${deltaPp > 0 ? '▲' : '▼'}${Math.abs(deltaPp).toFixed(1)}%p`;
}

function coachRatioLine(c: CoachRatio): string {
  const hours = `예약 ${Number(c.scheduledHours.toFixed(1))}h / 잔여 ${Number(c.remainingHours.toFixed(1))}h`;
  const ratio = c.ratio === null ? '-' : `${Math.round(c.ratio)}%`;
  return `• *${c.name}* (${c.studentCount}명) — ${hours} = *${ratio}* · 전일 대비 ${formatDelta(c.deltaPp)}`;
}

function studentRatioLine(s: StudentRatio): string {
  const ratio = s.ratio === null ? '-' : `${Math.round(s.ratio)}%`;
  return `• ${s.name} — 예약 ${Number(s.scheduledHours.toFixed(1))}h / 잔여 ${Number(s.remainingHours.toFixed(1))}h = *${ratio}*`;
}

const THREAD_BLOCKS_PER_MESSAGE = 45;

// Slack section 텍스트 한도(3000자) 안쪽
const SECTION_TEXT_LIMIT = 2800;

function coachThreadBlocks(ratios: CoachRatio[]): object[] {
  const blocks: object[] = [];
  for (const c of ratios) {
    const header = `*${c.name}* (${c.studentCount}명) — 학생별 예약 비율 _(낮은 순)_`;
    let lines = [header];
    for (const s of c.students) {
      const line = studentRatioLine(s);
      if (lines.join('\n').length + line.length + 1 > SECTION_TEXT_LIMIT) {
        blocks.push({ type: 'section', text: { type: 'mrkdwn', text: lines.join('\n') } });
        lines = [`*${c.name}* _(이어서)_`];
      }
      lines.push(line);
    }
    blocks.push({ type: 'section', text: { type: 'mrkdwn', text: lines.join('\n') } });
  }
  return blocks;
}

function coachSection(ratios: CoachRatio[]): object {
  const title = '👥 *코치별 코치룸 예약 비율* _(재원·온보딩 학생의 예약된 코치룸 시간 ÷ 잔여 수업권)_';
  const text = ratios.length ? [title, ...ratios.map(coachRatioLine)].join('\n') : `${title}\n해당 코치 없음`;
  return { type: 'section', text: { type: 'mrkdwn', text } };
}

export async function notifyScheduleInputStatus(briefing: Briefing, coachRatios: CoachRatio[], now: Date): Promise<void> {
  const nowKST = new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(5, 16).replace('T', ' ');
  const legendText = [
    `📋 *스터디홀/보캡 스케줄 현황 브리핑* — ${nowKST} KST`,
    '발송 시각 이후의 스터디홀/보캡 일정만 집계합니다 (코치룸 제외). 각 목록은 잔여 수업 시간이 적은 순입니다.',
    '`new` = 코치룸 1회차 수업을 아직 받지 않은 학생',
    '종료 임박 목록의 괄호 = 남은 일정 시간 (앞 숫자: 스터디홀 / 뒤 숫자: 보캡)',
  ].join('\n');

  const blocks: object[] = [
    { type: 'section', text: { type: 'mrkdwn', text: legendText } },
    { type: 'divider' },
    listSection('🟠 *스터디홀/보캡 스케줄 종료 임박* _(마지막 일정이 내일까지)_', briefing.endingSoon, endingSoonLine),
    { type: 'divider' },
    listSection('🔴 *지금 스터디홀/보캡 스케줄 없음* _(예정된 일정 0건)_', briefing.noSchedule, plainLine),
    { type: 'divider' },
    listSection('⚪ *스터디홀/보캡 스케줄이 한 번도 없음*', briefing.neverScheduled, plainLine),
    { type: 'divider' },
    coachSection(coachRatios),
  ];

  const fallbackText = `📋 스터디홀/보캡 스케줄 현황 — 종료 임박 ${briefing.endingSoon.length} / 없음 ${briefing.noSchedule.length} / 한 번도 없음 ${briefing.neverScheduled.length}`;
  const ts = await post(SCHEDULE_STATUS_CHANNEL, fallbackText, blocks);
  if (!ts || !coachRatios.length) return;

  // 쓰레드: 코치별 학생 비율. 한 메시지의 블록 한도(50개) 안으로 나눠 보낸다.
  const threadBlocks = coachThreadBlocks(coachRatios);
  for (let i = 0; i < threadBlocks.length; i += THREAD_BLOCKS_PER_MESSAGE) {
    await post(SCHEDULE_STATUS_CHANNEL, '코치별 학생 예약 비율', threadBlocks.slice(i, i + THREAD_BLOCKS_PER_MESSAGE), ts);
  }
}
