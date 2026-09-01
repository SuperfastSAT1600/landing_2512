// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

const exportCorpus = vi.fn();
const writeCorpusParquet = vi.fn();
const uploadFile = vi.fn();
const ensureSchema = vi.fn();
const createJob = vi.fn();
const start = vi.fn();

vi.mock('@/lib/intfunc/export-corpus', () => ({ exportCorpus, writeCorpusParquet }));
vi.mock('@intfunc/sdk/node', () => ({ uploadFile }));
vi.mock('@/lib/intfunc/client', () => ({
  intfuncClient: () => ({ externalDataset: () => ({}) }),
  datasetKey: () => 'proj/sales-calls',
}));
vi.mock('@/lib/supabase-admin', () => ({ supabaseAdmin: {} }));

vi.mock('@/lib/intfunc/training', async (orig) => {
  const actual = await orig<typeof import('@/lib/intfunc/training')>();
  return { ...actual, ensureSchema, createJob };
});

process.env.ADMIN_SECRET_KEY = 'admin-key';

const stats = {
  students: 40,
  rows: 32,
  converted: 20,
  lost: 12,
  excludedNoLabel: 0,
  excludedNoCalls: 8,
  cutoffUnavailable: 0,
  redactions: 91,
};

const jobStatus = (over: Record<string, unknown> = {}) => ({
  id: 'job_1',
  datasetId: 'ds',
  state: 'training',
  schemaVersion: 1,
  inputPrefix: 'gs://x/',
  inputManifestDigest: null,
  inputParts: 1,
  inputBytes: 10,
  inputRows: 32,
  uploadExpiresAt: null,
  packDigest: null,
  failureCode: null,
  inputDeletedAt: null,
  deletionReceipt: null,
  deletionFailureCode: null,
  createdAt: 'now',
  startedAt: null,
  finishedAt: null,
  ...over,
});

const makeReq = (body: unknown = {}, key: string | null = 'admin-key') =>
  new NextRequest('http://localhost/api/crm/intfunc/training', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(key ? { 'x-admin-key': key } : {}) },
    body: JSON.stringify(body),
  });

describe('POST /api/crm/intfunc/training', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    exportCorpus.mockResolvedValue({ rows: [{ student_id: 'a' }], stats });
    createJob.mockResolvedValue({ id: 'job_1', start });
    start.mockResolvedValue(jobStatus());
  });

  it('관리자 키가 없으면 401 — 내보내기조차 하지 않는다', async () => {
    const { POST } = await import('../route');
    const res = await POST(makeReq({}, null));
    expect(res.status).toBe(401);
    expect(exportCorpus).not.toHaveBeenCalled();
  });

  it('jobId를 돌려주고 학습 완료를 기다리지 않는다', async () => {
    const { POST } = await import('../route');
    const res = await POST(makeReq({}));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.jobId).toBe('job_1');
    expect(body.data.finished).toBe(false);
    expect(body.data.stats).toMatchObject({ rows: 32 });
    expect(start).toHaveBeenCalled();
  });

  it('dry_run은 통계만 돌려주고 업로드하지 않는다', async () => {
    const { POST } = await import('../route');
    const res = await POST(makeReq({ dry_run: true }));
    const body = await res.json();

    expect(body.data.dryRun).toBe(true);
    expect(body.data.stats).toMatchObject({ rows: 32 });
    expect(writeCorpusParquet).not.toHaveBeenCalled();
    expect(uploadFile).not.toHaveBeenCalled();
  });

  it('내보낼 행이 없으면 400 — 빈 잡을 열지 않는다', async () => {
    exportCorpus.mockResolvedValue({ rows: [], stats: { ...stats, rows: 0 } });
    const { POST } = await import('../route');
    const res = await POST(makeReq({}));

    expect(res.status).toBe(400);
    expect(createJob).not.toHaveBeenCalled();
  });

  it('업로드가 실패해도 /tmp의 전사 파일을 남기지 않는다', async () => {
    uploadFile.mockRejectedValue(new Error('upload boom'));
    let written = '';
    writeCorpusParquet.mockImplementation((_rows: unknown, file: string) => {
      written = file;
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, 'x');
    });

    const { POST } = await import('../route');
    const res = await POST(makeReq({}));

    expect(res.status).toBe(500);
    expect(written).not.toBe('');
    expect(fs.existsSync(written)).toBe(false);
  });

  it('응답에 전사 본문이 실리지 않는다', async () => {
    const { POST } = await import('../route');
    const body = await (await POST(makeReq({}))).json();
    expect(JSON.stringify(body)).not.toContain('transcript');
  });
});
