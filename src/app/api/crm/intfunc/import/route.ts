/**
 * IF internal dataset으로 코퍼스 전송 (REQ-205).
 *
 * external dataset 시절의 이 자리에는 잡이 있었다 — 파일을 만들고, 올리고, 폴링했다.
 * internal dataset에는 잡이 없다: 데이터셋을 확인하고 행을 import하면 끝이고,
 * 학습(pack 빌드)은 콘솔에서 이 데이터셋을 대상으로 돈다.
 *
 * 디스크를 거치지 않는 것이 이 경로의 성질이다. 상담 원문이 `/tmp`에 떨어지지 않으므로
 * 지울 것도 없다.
 */
import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/server-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { intfuncClient } from '@/lib/intfunc/client';
import { exportCorpus } from '@/lib/intfunc/export-corpus';
import { ensureDataset, importCorpus } from '@/lib/intfunc/import-corpus';
import { describeSendFailure } from '@/lib/intfunc/send-failure';

// 전량 조회 + 청크 단위 import. 청크는 순차로 나가므로 행이 많으면 오래 걸린다.
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { limit?: unknown; dry_run?: unknown } = {};
  try {
    body = await request.json();
  } catch {
    // 본문 없이 호출해도 기본값으로 동작한다.
  }
  const limit = typeof body.limit === 'number' && body.limit > 0 ? Math.floor(body.limit) : null;
  const dryRun = body.dry_run === true;

  try {
    const { rows, stats } = await exportCorpus(supabaseAdmin, limit);
    if (dryRun) return NextResponse.json({ data: { dryRun: true, stats } });
    if (rows.length === 0) {
      return NextResponse.json({ error: '내보낼 행이 없습니다.' }, { status: 400 });
    }

    const client = intfuncClient();
    await ensureDataset(client);
    const summary = await importCorpus(client, rows);

    return NextResponse.json({ data: { ...summary, stats } });
  } catch (e) {
    // 전문은 여기 남는다. 화면으로는 우리가 쓴 문장과 code만 나간다 (REQ-208).
    console.error('[crm/intfunc/import POST]', e);
    const failure = describeSendFailure(e);
    return NextResponse.json(
      { error: failure.message, code: failure.code, rows: failure.rows },
      { status: failure.status }
    );
  }
}
