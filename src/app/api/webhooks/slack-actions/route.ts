import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function verifySlackSignature(rawBody: string, signature: string, timestamp: string, secret: string): boolean {
  if (!signature.startsWith('v0=')) return false;
  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (age > 300) return false; // 5분 이상 지난 요청 거부
  const expected = 'v0=' + createHmac('sha256', secret).update(`v0:${timestamp}:${rawBody}`).digest('hex');
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  const signingSecret = process.env.SLACK_SIGNING_SECRET;
  const botToken = process.env.SLACK_BOT_TOKEN;
  if (!signingSecret) return NextResponse.json({ error: 'misconfigured' }, { status: 500 });

  const rawBody = await request.text();
  const signature = request.headers.get('x-slack-signature') ?? '';
  const timestamp = request.headers.get('x-slack-request-timestamp') ?? '';

  if (!verifySlackSignature(rawBody, signature, timestamp, signingSecret)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const payloadStr = new URLSearchParams(rawBody).get('payload');
  if (!payloadStr) return NextResponse.json({ ok: true });

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(payloadStr);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (payload.type !== 'block_actions') return NextResponse.json({ ok: true });

  const actions = payload.actions as { action_id: string; value: string }[] | undefined;
  const action = actions?.[0];
  if (!action || action.action_id !== 'reinquiry_restore') return NextResponse.json({ ok: true });

  const studentId = action.value;
  const channel = (payload.channel as { id?: string })?.id;
  const messageTs = (payload.message as { ts?: string })?.ts;
  const userName = (payload.user as { name?: string })?.name ?? '담당자';

  // REQ-BTN-03: DB 업데이트 — 리드 인입 복귀
  const now = new Date();
  const kst = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
  const { error } = await supabaseAdmin
    .from('students')
    .update({
      funnel_stage: '0',
      lead_status: 'active',
      inquiry_date: kst.toISOString().slice(0, 16) + ':00',
    })
    .eq('id', studentId);

  if (error) {
    console.error('[slack-actions] DB 업데이트 실패:', error);
    return NextResponse.json({ ok: true });
  }

  // REQ-BTN-04: 원본 Slack 메시지 완료 상태로 갱신
  if (botToken && channel && messageTs) {
    const originalBlocks = (payload.message as { blocks?: unknown[] })?.blocks ?? [];
    const sectionBlock = originalBlocks[0];
    await fetch('https://slack.com/api/chat.update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${botToken}` },
      body: JSON.stringify({
        channel,
        ts: messageTs,
        blocks: [
          sectionBlock,
          {
            type: 'section',
            text: { type: 'mrkdwn', text: `✅ *리드 인입 복귀 완료* — ${userName}` },
          },
        ],
      }),
    }).catch(e => console.error('[slack-actions] chat.update 실패:', e));
  }

  return NextResponse.json({ ok: true });
}
