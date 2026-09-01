import { describe, it, expect } from 'vitest';
import { summarizeJob } from '../training';
import type { ExternalJobStatus } from '@intfunc/sdk';

function status(partial: Partial<ExternalJobStatus>): ExternalJobStatus {
  return {
    id: 'job_1',
    datasetId: 'ds_1',
    state: 'training',
    schemaVersion: 1,
    inputPrefix: 'gs://x/',
    inputManifestDigest: null,
    inputParts: 1,
    inputBytes: 100,
    inputRows: 42,
    uploadExpiresAt: null,
    packDigest: null,
    failureCode: null,
    inputDeletedAt: null,
    deletionReceipt: null,
    deletionFailureCode: null,
    createdAt: '2026-08-01T00:00:00.000Z',
    startedAt: null,
    finishedAt: null,
    ...partial,
  } as ExternalJobStatus;
}

describe('summarizeJob — 잡 상태 요약', () => {
  it('진행 중인 상태는 finished가 아니다', () => {
    for (const state of [
      'awaiting_upload',
      'validating',
      'queued',
      'training',
      'publishing',
    ] as const) {
      expect(summarizeJob(status({ state })).finished).toBe(false);
    }
  });

  it('멈춘 상태는 모두 finished다', () => {
    for (const state of ['completed', 'failed', 'rejected', 'cancelled', 'expired'] as const) {
      expect(summarizeJob(status({ state })).finished).toBe(true);
    }
  });

  it('deletion_failed는 finished지만 성공이 아니다 — 업로드가 남아 있다', () => {
    const s = summarizeJob(status({ state: 'deletion_failed', packDigest: 'sha256:abc' }));
    expect(s.finished).toBe(true);
    expect(s.deletionFailed).toBe(true);
    expect(s.verifiedEmpty).toBeNull();
  });

  it('완료되면 packDigest와 파기 확인을 함께 싣는다', () => {
    const s = summarizeJob(
      status({
        state: 'completed',
        packDigest: 'sha256:abc',
        finishedAt: '2026-08-01T01:00:00.000Z',
        deletionReceipt: { verifiedEmpty: true } as ExternalJobStatus['deletionReceipt'],
      })
    );
    expect(s.packDigest).toBe('sha256:abc');
    expect(s.verifiedEmpty).toBe(true);
    expect(s.deletionFailed).toBe(false);
  });

  it('요약에는 전사 본문이 실릴 자리가 없다', () => {
    const keys = Object.keys(summarizeJob(status({})));
    expect(keys).toEqual([
      'jobId',
      'state',
      'finished',
      'packDigest',
      'inputRows',
      'failureCode',
      'deletionFailed',
      'verifiedEmpty',
      'finishedAt',
    ]);
  });
});
