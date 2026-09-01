// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { IntelligentFunctions } from '@intfunc/sdk';
import type { CorpusRow } from '@/lib/intfunc/corpus-types';

process.env.INTFUNC_API_KEY = 'key';
process.env.INTFUNC_PROJECT_SLUG = 'superfast';
delete process.env.INTFUNC_DATASET_SLUG;

const row = (over: Partial<CorpusRow> = {}): CorpusRow => ({
  student_id: 'a',
  transcript: '=== 통화 1 · plaud ===\n상담사: [학생] 어머니시죠',
  outcome: 'converted',
  grade: '11',
  school_type: 'international',
  desired_subjects: 'Both',
  target_score: 1500,
  previous_rw_score: 600,
  previous_math_score: null,
  call_count: 1,
  total_duration_sec: 1080,
  ...over,
});

const importResult = (over: Record<string, unknown> = {}) => ({
  importIds: ['imp_1'],
  received: 2,
  imported: 2,
  skipped: 0,
  errors: [],
  ...over,
});

function fakeClient(datasets: Array<{ slug: string }> = [], result = importResult()) {
  const importFn = vi.fn().mockResolvedValue(result);
  const client = {
    listDatasets: vi.fn().mockResolvedValue(datasets),
    createDataset: vi.fn().mockResolvedValue({ slug: 'sales-call-corpus' }),
    dataset: vi.fn(() => ({ import: importFn })),
  };
  return { client: client as unknown as IntelligentFunctions, spies: { ...client, importFn } };
}

describe('internal dataset 전송 — REQ-201 ~ REQ-204', () => {
  beforeEach(() => vi.clearAllMocks());

  it('기본 slug는 sales-call-corpus다 — external이 물고 있는 이름을 재사용하지 않는다', async () => {
    const { datasetKey, datasetSlug } = await import('@/lib/intfunc/client');
    expect(datasetSlug()).toBe('sales-call-corpus');
    expect(datasetKey()).toBe('superfast/sales-call-corpus');
  });

  it('데이터셋이 없으면 만든다 — REQ-202', async () => {
    const { ensureDataset } = await import('@/lib/intfunc/import-corpus');
    const { client, spies } = fakeClient([{ slug: 'other' }]);

    await ensureDataset(client);

    expect(spies.createDataset).toHaveBeenCalledTimes(1);
    expect(spies.createDataset.mock.calls[0][0]).toMatchObject({ slug: 'sales-call-corpus' });
  });

  it('데이터셋이 이미 있으면 만들지 않는다 — 같은 slug는 400이고 행이 쌓이는 곳이다', async () => {
    const { ensureDataset } = await import('@/lib/intfunc/import-corpus');
    const { client, spies } = fakeClient([{ slug: 'sales-call-corpus' }]);

    await ensureDataset(client);

    expect(spies.createDataset).not.toHaveBeenCalled();
  });

  it('행은 봉투 없이 그대로 컬럼이 된다 — REQ-203', async () => {
    const { toExample } = await import('@/lib/intfunc/import-corpus');
    const example = toExample(row());

    expect(Object.keys(example).sort()).toEqual(Object.keys(row()).sort());
    expect(Object.keys(example).filter((k) => k.startsWith('_'))).toHaveLength(0);
    expect(example.transcript).toBe(row().transcript);
    expect(example.previous_math_score).toBeNull();
  });

  it('import에 행 전량과 중복 건너뛰기를 넘긴다 — REQ-201', async () => {
    const { importCorpus } = await import('@/lib/intfunc/import-corpus');
    const { client, spies } = fakeClient([{ slug: 'sales-call-corpus' }]);

    await importCorpus(client, [row(), row({ student_id: 'b', outcome: 'lost' })]);

    expect(spies.dataset).toHaveBeenCalledWith('superfast/sales-call-corpus');
    const [examples, options] = spies.importFn.mock.calls[0];
    expect(examples).toHaveLength(2);
    expect(options.onDuplicate).toBe('skip');
  });

  it('같은 코퍼스는 같은 멱등키를 만든다 — 두 번 눌러도 두 번 쌓이지 않는다 (REQ-204)', async () => {
    const { corpusDigest } = await import('@/lib/intfunc/import-corpus');
    const a = row();
    const b = row({ student_id: 'b', outcome: 'lost' });

    expect(corpusDigest([a, b])).toBe(corpusDigest([a, b]));
    // 행 순서는 코퍼스의 내용이 아니다.
    expect(corpusDigest([a, b])).toBe(corpusDigest([b, a]));
  });

  it('통화가 하나라도 늘면 멱등키가 달라진다 — 새 데이터는 새 import다', async () => {
    const { corpusDigest } = await import('@/lib/intfunc/import-corpus');
    const before = corpusDigest([row()]);
    const after = corpusDigest([row({ transcript: row().transcript + '\n\n=== 통화 2 ===\n네' })]);

    expect(after).not.toBe(before);
  });

  it('멱등키가 import 옵션으로 나간다', async () => {
    const { importCorpus, corpusDigest } = await import('@/lib/intfunc/import-corpus');
    const { client, spies } = fakeClient();
    const rows = [row()];

    await importCorpus(client, rows);

    const options = spies.importFn.mock.calls[0][1];
    expect(options.idempotencyKey).toContain(corpusDigest(rows));
  });

  it('실패 행은 위치와 코드만 남긴다 — 서버 문구에 원문이 섞여 나올 수 있다', async () => {
    const { importCorpus } = await import('@/lib/intfunc/import-corpus');
    const { client } = fakeClient(
      [{ slug: 'sales-call-corpus' }],
      importResult({
        received: 2,
        imported: 1,
        skipped: 1,
        errors: [{ index: 1, message: '상담사: 김민준 학생...', code: 'dataset.cast.too_long' }],
      })
    );

    const summary = await importCorpus(client, [row(), row({ student_id: 'b' })]);

    expect(summary).toMatchObject({ received: 2, imported: 1, skipped: 1, importIds: ['imp_1'] });
    expect(summary.errors).toEqual([{ index: 1, code: 'dataset.cast.too_long' }]);
    expect(JSON.stringify(summary)).not.toContain('김민준');
  });
});
