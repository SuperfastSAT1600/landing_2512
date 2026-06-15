import { NextRequest, NextResponse } from 'next/server';
import { purgeExpiredRecordings } from '@/lib/call-recording-store';

export const runtime = 'nodejs';

/**
 * GET /api/cron/call-recording-cleanup
 * Vercel Cron — 매일 보관 만료(30일)된 통화 녹음 원본 오디오를 삭제한다.
 * 인증: Authorization: Bearer ${CRON_SECRET} (기존 cron 패턴과 동일)
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const purged = await purgeExpiredRecordings();
    console.log(`[cron/call-recording-cleanup] purged ${purged} recordings`);
    return NextResponse.json({ purged });
  } catch (e) {
    console.error('[cron/call-recording-cleanup]', e);
    return NextResponse.json({ error: 'Internal server error', detail: String(e) }, { status: 500 });
  }
}
