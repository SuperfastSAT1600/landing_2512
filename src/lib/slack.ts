/**
 * Slack notification utility
 * - Diagnosis notifications (submission, expiry) → Bot Token API → #02_진단테스트_현황
 * - Application notifications → Incoming Webhook (SLACK_APPLICATION_WEBHOOK_URL)
 */

async function postToDiagnosisChannel(blocks: object[], text: string): Promise<void> {
  const token = process.env.SLACK_BOT_TOKEN;
  const channelId = process.env.SLACK_DIAGNOSIS_CHANNEL_ID;

  if (!token || !channelId) {
    console.warn('[slack] SLACK_BOT_TOKEN or SLACK_DIAGNOSIS_CHANNEL_ID not set — skipping notification');
    return;
  }

  const res = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ channel: channelId, text, blocks }),
  });

  const data = await res.json() as { ok: boolean; error?: string };
  if (!data.ok) {
    throw new Error(`Slack API error: ${data.error}`);
  }
}

// ─── 테스트 제출 알림 ──────────────────────────────────────────────

export interface SubmissionNotificationData {
  studentName: string;
  studentEmail?: string | null;
  submittedAt: string;
  resultId: string;
}

export async function notifyTestSubmission(data: SubmissionNotificationData): Promise<void> {
  const { studentName, studentEmail, submittedAt, resultId } = data;
  const reportUrl = `https://tutoring.superfastsat.com/reports/${resultId}`;
  const submittedKST = new Date(submittedAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });

  const blocks = [
    {
      type: 'header',
      text: { type: 'plain_text', text: '✅ 진단테스트 제출 완료', emoji: true },
    },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*학생 이름*\n${studentName}` },
        { type: 'mrkdwn', text: `*이메일*\n${studentEmail ?? '미입력'}` },
        { type: 'mrkdwn', text: `*제출 시각*\n${submittedKST}` },
        { type: 'mrkdwn', text: `*결과 ID*\n${resultId}` },
      ],
    },
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: { type: 'plain_text', text: '리포트 보기 →', emoji: true },
          url: reportUrl,
          style: 'primary',
        },
      ],
    },
  ];

  await postToDiagnosisChannel(blocks, `✅ [진단테스트 제출] ${studentName}`);
}

// ─── 진단테스트 신청 알림 ──────────────────────────────────────────

export interface ApplicationNotificationData {
  name: string;
  phone: string;
  preferredDate: string;
  preferredTime: string;
}

export async function notifyDiagnosticApplication(data: ApplicationNotificationData): Promise<void> {
  const url = process.env.SLACK_APPLICATION_WEBHOOK_URL;
  if (!url) {
    console.warn('[slack] SLACK_APPLICATION_WEBHOOK_URL not set — skipping application notification');
    return;
  }

  const { name, phone, preferredDate, preferredTime } = data;

  const blocks = [
    {
      type: 'header',
      text: { type: 'plain_text', text: '📋 진단테스트 신청 접수', emoji: true },
    },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*이름*\n${name}` },
        { type: 'mrkdwn', text: `*연락처*\n${phone}` },
        { type: 'mrkdwn', text: `*희망 날짜*\n${preferredDate}` },
        { type: 'mrkdwn', text: `*희망 시간 (KST)*\n${preferredTime}` },
      ],
    },
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: { type: 'plain_text', text: '신청 목록 확인 →', emoji: true },
          url: 'https://tutoring.superfastsat.com/admin/diagnosis',
          style: 'primary',
        },
      ],
    },
  ];

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: `📋 [진단테스트 신청] ${name} (${phone})`, blocks }),
  });

  if (!res.ok) {
    console.error('[slack] Failed to send application notification:', res.status, await res.text());
    return;
  }

  const slackResponse = await res.json() as { ok?: boolean; error?: string };
  if (!slackResponse.ok) {
    console.error('[slack] Slack API error:', slackResponse.error);
    return;
  }
}

// ─── SRM 수업 알림 ────────────────────────────────────────────────

async function postToSrmOpsChannel(blocks: object[], text: string): Promise<void> {
  const token = process.env.SLACK_BOT_TOKEN;
  const channelId = process.env.SLACK_SRM_OPS_CHANNEL_ID;

  if (!token || !channelId) {
    console.warn('[slack] SLACK_BOT_TOKEN or SLACK_SRM_OPS_CHANNEL_ID not set — skipping SRM notification');
    return;
  }

  const res = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ channel: channelId, text, blocks }),
  });

  const data = await res.json() as { ok: boolean; error?: string };
  if (!data.ok) {
    throw new Error(`Slack API error: ${data.error}`);
  }
}

export interface ClassReminderEvent {
  id: string;
  type: 'coach_room' | 'study_hall';
  startsAt: string;
  students: string[];
  coaches: string[];
}

export async function notifyClassReminder(
  windowLabel: '45분 전' | '15분 전',
  events: ClassReminderEvent[],
): Promise<void> {
  if (events.length === 0) return;

  const header = `🔔 수업 ${windowLabel} 알림 — ${events.length}건`;

  const eventBlocks = events.flatMap((ev) => {
    const typeLabel = ev.type === 'coach_room' ? '코치룸' : '스터디홀';
    const startKST = new Date(ev.startsAt).toLocaleString('ko-KR', {
      timeZone: 'Asia/Seoul',
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    const studentText = ev.students.length > 0 ? ev.students.join(', ') : '(학생 없음)';
    const coachText = ev.coaches.length > 0 ? ev.coaches.join(', ') : '(코치 없음)';

    return [
      { type: 'divider' },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*유형*\n${typeLabel}` },
          { type: 'mrkdwn', text: `*시작*\n${startKST} KST` },
          { type: 'mrkdwn', text: `*학생*\n${studentText}` },
          { type: 'mrkdwn', text: `*코치*\n${coachText}` },
        ],
      },
    ];
  });

  const blocks = [
    {
      type: 'header',
      text: { type: 'plain_text', text: header, emoji: true },
    },
    ...eventBlocks,
    { type: 'divider' },
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: { type: 'plain_text', text: 'SRM 확인 →', emoji: true },
          url: 'https://tutoring.superfastsat.com/admin/srm',
          style: 'primary',
        },
      ],
    },
  ];

  await postToSrmOpsChannel(blocks, header);
}

// ─── 만료 미응시 알림 ──────────────────────────────────────────────

export interface ExpiredTokenData {
  id: string;
  token: string;
  studentName: string | null;
  studentEmail: string | null;
  expiresAt: string;
}

export async function notifyExpiredTokens(tokens: ExpiredTokenData[]): Promise<void> {
  if (tokens.length === 0) return;

  const lines = tokens.map((t) => {
    const expiredKST = new Date(t.expiresAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
    return `• *${t.studentName ?? '이름 없음'}* (${t.studentEmail ?? '이메일 없음'}) — 만료: ${expiredKST} | 코드: \`${t.token}\``;
  });

  const blocks = [
    {
      type: 'header',
      text: { type: 'plain_text', text: '⚠️ 미응시 토큰 만료 알림', emoji: true },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `오늘 만료됐지만 응시하지 않은 학생이 *${tokens.length}명* 있습니다.\n\n${lines.join('\n')}`,
      },
    },
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: { type: 'plain_text', text: '어드민에서 확인 →', emoji: true },
          url: 'https://tutoring.superfastsat.com/admin/diagnosis',
        },
      ],
    },
  ];

  await postToDiagnosisChannel(blocks, `⚠️ 미응시 만료 토큰 ${tokens.length}건`);
}
