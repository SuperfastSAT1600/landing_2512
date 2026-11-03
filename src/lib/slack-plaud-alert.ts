/** Plaud 토큰 keep-alive 실패 알림. 크론이 실패 사실을 알 수 있도록 전송 실패 시 던진다. */
import type { PlaudKeepaliveResult } from '@/lib/plaud-keepalive';

/** 커밋-업데이트 채널(landingpage 봇 게시 가능) */
export const PLAUD_ALERT_CHANNEL = 'C09UT6DFUBY';

function buildText(failed: PlaudKeepaliveResult[]): string {
  const lines = failed.map((r) => `• *${r.label}* (${r.account}) — ${r.error ?? '알 수 없는 오류'}`);
  return [
    '⚠️ Plaud 연결 자동 갱신 실패',
    ...lines,
    '',
    '7일 안에 복구하지 않으면 CRM 상담메모에서 이 계정 녹음을 불러올 수 없습니다.',
    '재연결: 해당 직원이 Claude Code에서 Plaud 로그인 → `~/.plaud/tokens-mcp.json`의 refresh_token을 Supabase `integration_tokens`(provider=plaud)에 넣기',
  ].join('\n');
}

export async function postPlaudKeepaliveFailure(failed: PlaudKeepaliveResult[]): Promise<void> {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) throw new Error('SLACK_BOT_TOKEN not set');
  const res = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ channel: PLAUD_ALERT_CHANNEL, text: buildText(failed) }),
    signal: AbortSignal.timeout(5000),
  });
  // Slack 5xx·HTML 응답이면 JSON 파싱이 실패한다 — 상태 코드로 원인을 남긴다.
  const body = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
  if (!body.ok) throw new Error(`Slack API error: ${body.error ?? `HTTP ${res.status}`}`);
}
