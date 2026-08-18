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

// ─── 포털 도구 사용 신청 알림 ─────────────────────────────────────

const PORTAL_CHANNEL = 'C07FK85V9PD';

const TOOL_LABELS: Record<string, string> = {
  'vocab-counter': 'Vocab Counter',
  'math-web': 'Math Web',
};

export async function notifyPortalToolRequest(data: { studentName: string; toolId: string }): Promise<void> {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) {
    console.warn('[slack] SLACK_BOT_TOKEN not set — skipping portal tool request notification');
    return;
  }

  const toolLabel = TOOL_LABELS[data.toolId] ?? data.toolId;

  const blocks = [
    {
      type: 'header',
      text: { type: 'plain_text', text: `🔑 ${toolLabel} 사용 신청`, emoji: true },
    },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*학생*\n${data.studentName}` },
        { type: 'mrkdwn', text: `*도구*\n${toolLabel}` },
      ],
    },
  ];

  const res = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      channel: PORTAL_CHANNEL,
      text: `🔑 [${toolLabel} 사용 신청] ${data.studentName}`,
      blocks,
    }),
  });

  const result = await res.json() as { ok: boolean; error?: string };
  if (!result.ok) throw new Error(`Slack API error: ${result.error}`);
}

// ─── 포털 원장님 상담 신청 알림 ───────────────────────────────────

const PORTAL_CONSULT_CHANNEL = 'C07FK85V9PD';

export interface PortalConsultRequestData {
  studentName: string;
  preferredDate: string;
  preferredTime: string;
}

export async function notifyPortalConsultRequest(data: PortalConsultRequestData): Promise<void> {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) {
    console.warn('[slack] SLACK_BOT_TOKEN not set — skipping portal consult notification');
    return;
  }

  const { studentName, preferredDate, preferredTime } = data;

  const blocks = [
    {
      type: 'header',
      text: { type: 'plain_text', text: '📅 원장님 상담 신청', emoji: true },
    },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*학생*\n${studentName}` },
        { type: 'mrkdwn', text: `*희망 날짜*\n${preferredDate}` },
        { type: 'mrkdwn', text: `*희망 시간*\n${preferredTime}` },
      ],
    },
  ];

  const res = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      channel: PORTAL_CONSULT_CHANNEL,
      text: `📅 [원장님 상담 신청] ${studentName} — ${preferredDate} ${preferredTime}`,
      blocks,
    }),
  });

  const result = await res.json() as { ok: boolean; error?: string };
  if (!result.ok) {
    throw new Error(`Slack API error: ${result.error}`);
  }
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
