import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { verifyWebhookSignature } from '@/lib/phone-call';
import { processCallRecording } from '@/lib/phone-call-process';

export const runtime = 'nodejs';
// 전사·요약을 인라인으로 수행하므로 여유를 둔다.
export const maxDuration = 300;

/**
 * POST /api/webhooks/daily
 * Daily 웹훅 수신. recording.ready-to-download 시 녹음을 전사·요약해 상담 메모를 자동 생성한다.
 * 인증: X-Webhook-Signature HMAC (DAILY_WEBHOOK_SECRET).
 * 웹훅 등록 검증 핑(type 없음)은 즉시 200.
 */
export async function POST(request: NextRequest) {
  const raw = await request.text();
  const secret = process.env.DAILY_WEBHOOK_SECRET;

  // 서명 검증 (시크릿 설정 시). raw 바디 그대로 검증해야 함.
  if (secret) {
    const ok = verifyWebhookSignature({
      rawBody: raw,
      timestamp: request.headers.get('X-Webhook-Timestamp'),
      signature: request.headers.get('X-Webhook-Signature'),
      secret,
    });
    if (!ok) return NextResponse.json({ error: 'invalid signature' }, { status: 401 });
  }

  let event: { type?: string; payload?: { recording_id?: string; room_name?: string; duration?: number } };
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: true }); // 검증 핑 등 비-JSON
  }

  // 등록 검증 핑이나 관심 없는 이벤트는 즉시 ack
  if (event.type !== 'recording.ready-to-download') {
    return NextResponse.json({ ok: true });
  }

  const { recording_id, room_name, duration } = event.payload ?? {};
  if (!recording_id || !room_name) return NextResponse.json({ ok: true });

  const { data: session } = await supabaseAdmin
    .from('call_sessions')
    .select('id, timeline_entry_id')
    .eq('room_name', room_name)
    .single();
  if (!session) {
    console.warn('[webhooks/daily] room_name 매칭 세션 없음:', room_name);
    return NextResponse.json({ ok: true });
  }
  if (session.timeline_entry_id) return NextResponse.json({ ok: true }); // 이미 처리됨

  await supabaseAdmin
    .from('call_sessions')
    .update({ status: 'processing', recording_id, duration_sec: duration ?? null })
    .eq('id', session.id);

  await processCallRecording(session.id);

  return NextResponse.json({ ok: true });
}
