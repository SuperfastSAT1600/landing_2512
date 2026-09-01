/**
 * IF 학습 잡 상태 조회와 파기 재시도 (REQ-011).
 *
 * GET은 폴링용이다. POST는 `deletion_failed` 하나만을 위해 있다 — pack은 만들어졌는데
 * 업로드를 못 지운 상태이고, 손을 쓸 수 있는 유일한 실패다. 조회(GET)가 부수효과를
 * 내지 않도록 재시도는 POST로 분리한다.
 */
import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/server-auth';
import { intfuncClient, datasetKey } from '@/lib/intfunc/client';
import { summarizeJob } from '@/lib/intfunc/training';

type Params = { params: Promise<{ jobId: string }> };

async function job(jobId: string) {
  return intfuncClient().externalDataset(datasetKey()).training.get(jobId);
}

export async function GET(request: NextRequest, { params }: Params) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { jobId } = await params;
  try {
    const status = await (await job(jobId)).status();
    return NextResponse.json({ data: summarizeJob(status) });
  } catch (e) {
    console.error('[crm/intfunc/training GET]', e);
    return NextResponse.json({ error: '잡 상태를 읽지 못했습니다.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { jobId } = await params;
  try {
    const swept = await (await job(jobId)).retryDeletion();
    return NextResponse.json({ data: summarizeJob(swept) });
  } catch (e) {
    console.error('[crm/intfunc/training POST retryDeletion]', e);
    return NextResponse.json({ error: '업로드 파기 재시도에 실패했습니다.' }, { status: 500 });
  }
}
