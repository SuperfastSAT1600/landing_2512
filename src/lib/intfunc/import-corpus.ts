/**
 * 코퍼스 행 → IntelligentFunctions **internal dataset** (REQ-201 ~ REQ-204).
 *
 * external dataset과 달리 잡이 없다. 행을 보내면 intfunc이 보관하고, pack 학습
 * (DISCOVER/FIT)은 콘솔에서 그 데이터셋을 대상으로 돈다. 그래서 애플리케이션이 하는 일은
 * "코퍼스를 만들어 밀어 넣는 것" 하나다 — 업로드도, 폴링도, 파기 영수증도 없다.
 *
 * 대신 행이 **누적된다**. 같은 코퍼스를 두 번 보내면 두 번 쌓일 수 있으므로 멱등키를
 * 내용에서 만든다: 같은 내용이면 replay, 통화가 새로 붙어 내용이 달라지면 새 import다.
 */
import { createHash } from 'crypto';
import type { DatasetExample, IntelligentFunctions } from '@intfunc/sdk';
import { CORPUS_COLUMNS, type CorpusRow } from './corpus-types';
import { datasetKey, datasetSlug } from './client';

const DATASET_NAME = '세일즈 콜 전환 코퍼스';
const IDEMPOTENCY_PREFIX = 'sales-call-corpus';

/** 클라이언트로 나가는 전송 결과. 전사 본문도 서버 문구도 실리지 않는다. */
export interface ImportSummary {
  /** 되돌리려면 이 id가 필요하다 — `client.rollbackImport(id)`. */
  importIds: string[];
  received: number;
  imported: number;
  /** 읽었지만 쓰지 않은 행 — 이미 있거나 유효하지 않은 행. */
  skipped: number;
  errors: Array<{ index: number; code: string | null }>;
}

/**
 * 행을 그대로 example로 만든다. 봉투도 중첩도 없고 `_split` 같은 메타 키도 붙이지 않는다 —
 * 어느 컬럼이 질문이고 어느 것이 답인지는 pack의 선언이지 업로드가 정할 일이 아니다.
 */
export function toExample(row: CorpusRow): DatasetExample {
  const example: Record<string, unknown> = {};
  for (const column of CORPUS_COLUMNS) example[column] = row[column] ?? null;
  return example;
}

/**
 * 코퍼스 내용의 다이제스트. 행 순서는 내용이 아니므로 정렬한 뒤 해싱한다 —
 * 같은 DB 상태에서 두 번 뽑은 코퍼스는 같은 키를 갖는다.
 */
export function corpusDigest(rows: readonly CorpusRow[]): string {
  const canonical = rows.map((row) => JSON.stringify(CORPUS_COLUMNS.map((c) => row[c] ?? null)));
  canonical.sort();
  return createHash('sha256').update(canonical.join('\n')).digest('hex').slice(0, 16);
}

/**
 * 데이터셋이 없으면 만든다. 이미 있으면 아무것도 하지 않는다 — 같은 slug로 다시 만들면
 * 400이고, 데이터셋은 버전이 아니라 행이 쌓이는 곳이라 다른 풀에 조용히 쓰는 일이
 * 있어서는 안 된다.
 */
export async function ensureDataset(client: IntelligentFunctions): Promise<void> {
  const slug = datasetSlug();
  const datasets = await client.listDatasets();
  if (datasets.some((dataset) => dataset.slug === slug)) return;
  await client.createDataset({ slug, name: DATASET_NAME });
}

export async function importCorpus(
  client: IntelligentFunctions,
  rows: readonly CorpusRow[]
): Promise<ImportSummary> {
  const result = await client.dataset(datasetKey()).import(rows.map(toExample), {
    onDuplicate: 'skip',
    idempotencyKey: `${IDEMPOTENCY_PREFIX}-${corpusDigest(rows)}`,
  });

  return {
    importIds: result.importIds,
    received: result.received,
    imported: result.imported,
    skipped: result.skipped,
    // 서버 문구에는 거절당한 값이 섞여 나올 수 있다. 위치와 코드만 가져간다.
    errors: result.errors.map((failure) => ({ index: failure.index, code: failure.code ?? null })),
  };
}
