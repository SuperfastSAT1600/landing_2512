import { NextRequest, NextResponse } from 'next/server';
import { refreshAllPlaudAccounts } from '@/lib/plaud-keepalive';

/**
 * GET /api/cron/plaud-token-keepalive
 * Vercel Cron — 매일 10:00 KST(01:00 UTC).
 * Plaud refresh_token(7일 만료)을 전 계정 갱신해 녹음을 안 쓰는 기간에도 연결이 끊기지 않게 한다.
 * 실패 계정이 있으면 502로 응답해 크론 로그에 실패로 남긴다.
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 });
  }

  const results = await refreshAllPlaudAccounts();
  const failed = results.filter((r) => !r.ok);
  if (failed.length) {
    console.error('[cron/plaud-token-keepalive] 갱신 실패:', failed);
  }
  return NextResponse.json({ data: { results } }, { status: failed.length ? 502 : 200 });
}
