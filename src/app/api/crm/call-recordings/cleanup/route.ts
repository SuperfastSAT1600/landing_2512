import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAuthenticated } from '@/lib/server-auth';

export const runtime = 'nodejs';

const BUCKET = 'call-recordings';

/**
 * POST /api/crm/call-recordings/cleanup
 * 보관 기간(expires_at)이 지난 원본 오디오를 Storage에서 삭제하고 행을 purged 처리한다.
 * 수동/크론 호출용. (자동 스케줄은 Phase 2)
 */
export async function POST(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: '인증이 필요합니다.' } }, { status: 401 });
  }

  const nowIso = new Date().toISOString();
  const { data: expired, error } = await supabaseAdmin
    .from('call_recordings')
    .select('id, storage_path')
    .is('purged_at', null)
    .lte('expires_at', nowIso)
    .limit(1000);

  if (error) {
    console.error('[call-recordings/cleanup] query failed:', error);
    return NextResponse.json({ error: { code: 'QUERY_FAILED', message: '조회에 실패했습니다.' } }, { status: 500 });
  }
  if (!expired?.length) {
    return NextResponse.json({ data: { purged: 0 } });
  }

  const paths = expired.map((r) => r.storage_path);
  const { error: rmErr } = await supabaseAdmin.storage.from(BUCKET).remove(paths);
  if (rmErr) {
    console.error('[call-recordings/cleanup] storage remove failed:', rmErr);
    return NextResponse.json({ error: { code: 'REMOVE_FAILED', message: '삭제에 실패했습니다.' } }, { status: 500 });
  }

  const ids = expired.map((r) => r.id);
  await supabaseAdmin
    .from('call_recordings')
    .update({ status: 'purged', purged_at: nowIso })
    .in('id', ids);

  return NextResponse.json({ data: { purged: ids.length } });
}
