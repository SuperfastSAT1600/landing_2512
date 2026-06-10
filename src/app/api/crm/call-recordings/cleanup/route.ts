import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/server-auth';
import { purgeExpiredRecordings } from '@/lib/call-recording-store';

export const runtime = 'nodejs';

/**
 * POST /api/crm/call-recordings/cleanup
 * 보관 기간이 지난 원본 오디오를 삭제(관리자 수동 호출용). 자동 스케줄은 /api/cron/call-recording-cleanup.
 */
export async function POST(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: '인증이 필요합니다.' } }, { status: 401 });
  }
  try {
    const purged = await purgeExpiredRecordings();
    return NextResponse.json({ data: { purged } });
  } catch (e) {
    console.error('[call-recordings/cleanup]', e);
    return NextResponse.json({ error: { code: 'CLEANUP_FAILED', message: '정리에 실패했습니다.' } }, { status: 500 });
  }
}
