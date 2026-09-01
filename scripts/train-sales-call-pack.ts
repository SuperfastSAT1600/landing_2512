/**
 * 내보낸 Parquet으로 external training 잡을 돌린다 (REQ-008).
 *
 * external dataset이므로 우리가 보내는 것은 파일이고, intfunc이 남기는 것은 스키마
 * 선언뿐이다. 바이트는 서명된 스토리지 URL로 직접 올라가 API를 통과하지 않고,
 * 잡이 끝나면 성공·실패·취소 어느 쪽이든 업로드가 파기된다.
 *
 * `wait()`는 `completed`에서만 resolve한다. 특히 `deletion_failed`는 pack은 만들어졌지만
 * 업로드를 못 지운 상태다 — 그것을 성공으로 보고하면 안 되는 유일한 이유다.
 *
 * 실행:
 *   npx tsx scripts/train-sales-call-pack.ts
 *   npx tsx scripts/train-sales-call-pack.ts --file out/sales-calls.parquet
 *   npx tsx scripts/train-sales-call-pack.ts --resume job_123   # 다른 날, 다른 프로세스
 */
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { ExternalTrainingError, type ExternalJobHandle } from '@intfunc/sdk';
import { uploadFile } from '@intfunc/sdk/node';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const DEFAULT_FILE = 'out/sales-calls.parquet';
const RECEIPTS_DIR = 'reports/intfunc';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

/** 파일 옆의 meta.json에서 행 수를 읽는다. SDK는 Parquet 푸터를 파싱하지 않는다. */
function declaredRows(file: string): number {
  const metaPath = file.replace(/\.parquet$/, '.meta.json');
  if (!fs.existsSync(metaPath)) {
    throw new Error(`${metaPath}이 없다. export 스크립트를 먼저 돌릴 것.`);
  }
  const { rows } = JSON.parse(fs.readFileSync(metaPath, 'utf8')) as { rows: number };
  if (!Number.isInteger(rows) || rows <= 0) throw new Error(`${metaPath}의 rows가 올바르지 않다.`);
  return rows;
}

function saveReceipt(status: import('@intfunc/sdk').ExternalJobStatus): string {
  fs.mkdirSync(RECEIPTS_DIR, { recursive: true });
  const out = path.join(RECEIPTS_DIR, `${status.id}.json`);
  fs.writeFileSync(
    out,
    JSON.stringify(
      {
        jobId: status.id,
        state: status.state,
        packDigest: status.packDigest,
        inputRows: status.inputRows,
        inputBytes: status.inputBytes,
        finishedAt: status.finishedAt,
        deletionReceipt: status.deletionReceipt,
      },
      null,
      2
    )
  );
  return out;
}

async function main(): Promise<void> {
  const { intfuncClient, datasetKey } = await import('../src/lib/intfunc/client');
  const { ensureSchema, createJob } = await import('../src/lib/intfunc/training');

  const client = intfuncClient();
  const dataset = client.externalDataset(datasetKey());
  const resume = arg('resume');

  let job: ExternalJobHandle;
  if (resume) {
    job = await dataset.training.get(resume);
    console.log(`잡 재연결 — ${job.id} (${job.created.state})`);
  } else {
    const file = arg('file') || DEFAULT_FILE;
    if (!fs.existsSync(file)) throw new Error(`${file}이 없다. export 스크립트를 먼저 돌릴 것.`);
    const rows = declaredRows(file);

    await ensureSchema(dataset);
    job = await createJob(dataset);
    console.log(`잡 생성 — ${job.id}`);

    console.log(`업로드 중... ${file} (${rows}행)`);
    await uploadFile(job, file, { rows });
    await job.start();
    console.log('학습 시작. 완료까지 대기한다.');
  }

  try {
    const done = await job.wait();
    const receipt = saveReceipt(done);
    console.log(`\n완료 — pack ${done.packDigest}`);
    console.log(`업로드 파기 확인(verifiedEmpty): ${done.deletionReceipt?.verifiedEmpty}`);
    console.log(`영수증: ${receipt}`);
  } catch (e) {
    if (!(e instanceof ExternalTrainingError)) throw e;
    saveReceipt(e.status);
    // 업로드를 못 지운 경우가 유일하게 손을 쓸 수 있는 실패다. 한 번 더 쓸어낸다.
    if (e.status.state === 'deletion_failed') {
      console.warn(`업로드 파기 실패(${e.status.deletionFailureCode}). 재시도한다.`);
      const swept = await job.retryDeletion();
      saveReceipt(swept);
      if (swept.state === 'completed') {
        console.log(`파기 완료 — pack ${swept.packDigest}`);
        return;
      }
    }
    throw new Error(`잡이 끝나지 않았다 — ${e.status.state} (${e.status.failureCode ?? '사유 없음'})`);
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
