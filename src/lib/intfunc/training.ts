/**
 * external training 잡의 공용 조작. 스크립트와 CRM 라우트가 같은 함수를 쓴다.
 *
 * external dataset이므로 우리가 보내는 것은 파일이고, intfunc이 남기는 것은 스키마
 * 선언뿐이다. 바이트는 서명된 스토리지 URL로 직접 올라가 API를 통과하지 않고,
 * 잡이 끝나면 성공·실패·취소 어느 쪽이든 업로드가 파기된다.
 */
import type { ExternalDatasetHandle, ExternalJobStatus } from '@intfunc/sdk';
import { NotFoundError } from '@intfunc/sdk';
import { externalSchema, CORPUS_TEXT_COLUMN, CORPUS_LABEL_COLUMN } from './parquet';
import { packSlug } from './client';

/**
 * 데이터셋과 선언을 준비한다. 없으면 만들고, 컬럼이 달라졌으면 다음 버전으로 다시 선언한다.
 * 선언은 편집되지 않는다 — 언제나 새 버전이 붙는다.
 */
export async function ensureSchema(dataset: ExternalDatasetHandle): Promise<void> {
  const schema = externalSchema();
  const wanted = JSON.stringify(schema.columns.map((c) => [c.name, c.type]));
  try {
    const view = await dataset.get();
    const current = JSON.stringify(view.schema?.columns.map((c) => [c.name, c.type]) ?? null);
    if (current !== wanted) await dataset.declare(schema);
  } catch (e) {
    if (!(e instanceof NotFoundError)) throw e;
    await dataset.create({ schema, name: '세일즈 콜 전환 코퍼스' });
  }
}

/** 잡을 연다. 컬럼 경로는 업로드 전에 선언과 대조되므로 여기서 어긋남이 걸린다. */
export function createJob(dataset: ExternalDatasetHandle) {
  return dataset.training.create({
    pack: {
      slug: packSlug(),
      corpus: { text: CORPUS_TEXT_COLUMN, label: CORPUS_LABEL_COLUMN },
    },
  });
}

/** 클라이언트로 나가는 잡 상태. 전사 본문은 어디에도 실리지 않는다. */
export interface JobSummary {
  jobId: string;
  state: ExternalJobStatus['state'];
  /** 끝났는가 — completed든 실패든 더 이상 폴링할 필요가 없는 상태. */
  finished: boolean;
  packDigest: string | null;
  inputRows: number | null;
  failureCode: string | null;
  /** 업로드를 못 지운 상태. pack은 있을 수 있지만 끝난 잡이 아니다. */
  deletionFailed: boolean;
  verifiedEmpty: boolean | null;
  finishedAt: string | null;
}

const TERMINAL: ReadonlyArray<ExternalJobStatus['state']> = [
  'completed',
  'failed',
  'rejected',
  'cancelled',
  'expired',
  'deletion_failed',
];

export function summarizeJob(status: ExternalJobStatus): JobSummary {
  return {
    jobId: status.id,
    state: status.state,
    finished: TERMINAL.includes(status.state),
    packDigest: status.packDigest,
    inputRows: status.inputRows,
    failureCode: status.failureCode,
    deletionFailed: status.state === 'deletion_failed',
    verifiedEmpty: status.deletionReceipt?.verifiedEmpty ?? null,
    finishedAt: status.finishedAt,
  };
}
