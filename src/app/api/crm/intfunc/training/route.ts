/**
 * IF 학습 시작 (REQ-010). 코퍼스를 내보내 업로드하고 잡을 띄운 뒤 즉시 돌아온다.
 *
 * 여기서 `wait()`를 부르지 않는 것이 요점이다. intfunc의 잡은 그쪽에서 비동기로 돌고
 * `wait()`는 폴링일 뿐이므로, 요청을 붙잡고 있을 이유가 없다 — 전사 백필과 달리
 * 청킹도 시간 예산도 필요 없다. 진행 상황은 GET .../[jobId]가 답한다.
 *
 * maxDuration 안에 들어가야 하는 것은 export + upload뿐이다.
 */
import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { uploadFile } from '@intfunc/sdk/node';
import { isAuthenticated } from '@/lib/server-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { intfuncClient, datasetKey } from '@/lib/intfunc/client';
import { exportCorpus, writeCorpusParquet } from '@/lib/intfunc/export-corpus';
import { ensureSchema, createJob, summarizeJob } from '@/lib/intfunc/training';

// export(전량 조회) + parquet 쓰기 + 업로드. 학습 자체는 여기서 기다리지 않는다.
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

  // 상담 원문이 담긴 파일이다. 업로드가 끝나면 성패와 무관하게 지운다.
  let file = '';
  try {
    const { rows, stats } = await exportCorpus(supabaseAdmin, limit);
    if (dryRun) return NextResponse.json({ data: { dryRun: true, stats } });
    if (rows.length === 0) {
      return NextResponse.json({ error: '내보낼 행이 없습니다.' }, { status: 400 });
    }

    file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'intfunc-')), 'sales-calls.parquet');
    writeCorpusParquet(rows, file);

    const dataset = intfuncClient().externalDataset(datasetKey());
    await ensureSchema(dataset);
    const job = await createJob(dataset);
    await uploadFile(job, file, { rows: rows.length });
    const started = await job.start();

    return NextResponse.json({ data: { ...summarizeJob(started), stats } });
  } catch (e) {
    console.error('[crm/intfunc/training POST]', e);
    return NextResponse.json({ error: '학습 시작에 실패했습니다.' }, { status: 500 });
  } finally {
    if (file) fs.rmSync(path.dirname(file), { recursive: true, force: true });
  }
}
