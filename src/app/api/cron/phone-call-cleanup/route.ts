import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { deleteRecording } from '@/lib/phone-call';

export const runtime = 'nodejs';

/**
 * GET /api/cron/phone-call-cleanup
 * Vercel Cron — 매일 보관 만료(30일)된 통화 녹음을 Daily에서 삭제하고 세션을 purged 처리.
 * 인증: Authorization: Bearer ${CRON_SECRET}
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const nowIso = new Date().toISOString();
    const { data: expired, error } = await supabaseAdmin
      .from('call_sessions')
      .select('id, recording_id')
      .is('purged_at', null)
      .lte('expires_at', nowIso)
      .limit(1000);
    if (error) throw new Error(error.message);
    if (!expired?.length) return NextResponse.json({ purged: 0 });

    let purged = 0;
    for (const s of expired) {
      if (s.recording_id) {
        try {
          await deleteRecording(s.recording_id);
        } catch (e) {
          // 이미 삭제됐거나 일시 오류 — 다음 실행에서 재시도되도록 purged 처리하지 않고 넘어감
          console.error(`[cron/phone-call-cleanup] delete failed for ${s.id}:`, e);
          continue;
        }
      }
      await supabaseAdmin
        .from('call_sessions')
        .update({ status: 'purged', purged_at: nowIso })
        .eq('id', s.id);
      purged += 1;
    }

    console.log(`[cron/phone-call-cleanup] purged ${purged} sessions`);
    return NextResponse.json({ purged });
  } catch (e) {
    console.error('[cron/phone-call-cleanup]', e);
    return NextResponse.json({ error: 'Internal server error', detail: String(e) }, { status: 500 });
  }
}
