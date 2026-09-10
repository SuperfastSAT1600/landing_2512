// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { AuthError, DatasetImportError } from '@intfunc/sdk';

const exportCorpus = vi.fn();
const ensureDataset = vi.fn();
const importCorpus = vi.fn();

vi.mock('@/lib/intfunc/export-corpus', () => ({ exportCorpus }));
vi.mock('@/lib/intfunc/import-corpus', () => ({ ensureDataset, importCorpus }));
vi.mock('@/lib/intfunc/client', async (orig) => ({
  ...(await orig<typeof import('@/lib/intfunc/client')>()),
  intfuncClient: () => ({}),
}));
vi.mock('@/lib/supabase-admin', () => ({ supabaseAdmin: {} }));

process.env.ADMIN_SECRET_KEY = 'admin-key';

const stats = {
  students: 40,
  rows: 32,
  converted: 20,
  lost: 12,
  excludedNoLabel: 0,
  excludedNoTranscript: 8,
  cutoffUnavailable: 0,
  redactions: 91,
};

const summary = {
  importIds: ['imp_1'],
  received: 32,
  imported: 30,
  skipped: 2,
  errors: [],
};

const makeReq = (body: unknown = {}, key: string | null = 'admin-key') =>
  new NextRequest('http://localhost/api/crm/intfunc/import', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(key ? { 'x-admin-key': key } : {}) },
    body: JSON.stringify(body),
  });

describe('POST /api/crm/intfunc/import — REQ-205', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    exportCorpus.mockResolvedValue({
      rows: [{ student_id: 'a', transcript: '상담사: 안녕하세요' }],
      stats,
    });
    importCorpus.mockResolvedValue(summary);
  });

  it('관리자 키가 없으면 401 — 코퍼스를 만들지도 않는다', async () => {
    const { POST } = await import('../route');
    const res = await POST(makeReq({}, null));

    expect(res.status).toBe(401);
    expect(exportCorpus).not.toHaveBeenCalled();
  });

  it('전송 결과와 통계를 돌려준다', async () => {
    const { POST } = await import('../route');
    const res = await POST(makeReq({}));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toMatchObject({ importIds: ['imp_1'], imported: 30, skipped: 2 });
    expect(body.data.stats).toMatchObject({ rows: 32 });
  });

  it('데이터셋을 먼저 확인하고 전송한다 — REQ-202', async () => {
    const order: string[] = [];
    ensureDataset.mockImplementation(async () => void order.push('ensure'));
    importCorpus.mockImplementation(async () => {
      order.push('import');
      return summary;
    });

    const { POST } = await import('../route');
    await POST(makeReq({}));

    expect(order).toEqual(['ensure', 'import']);
  });

  it('dry_run은 통계만 돌려주고 아무것도 보내지 않는다', async () => {
    const { POST } = await import('../route');
    const res = await POST(makeReq({ dry_run: true }));
    const body = await res.json();

    expect(body.data.dryRun).toBe(true);
    expect(body.data.stats).toMatchObject({ rows: 32 });
    expect(ensureDataset).not.toHaveBeenCalled();
    expect(importCorpus).not.toHaveBeenCalled();
  });

  it('보낼 행이 없으면 400 — 빈 import를 만들지 않는다', async () => {
    exportCorpus.mockResolvedValue({ rows: [], stats: { ...stats, rows: 0 } });
    const { POST } = await import('../route');
    const res = await POST(makeReq({}));

    expect(res.status).toBe(400);
    expect(importCorpus).not.toHaveBeenCalled();
  });

  it('limit을 코퍼스 조회에 그대로 넘긴다', async () => {
    const { POST } = await import('../route');
    await POST(makeReq({ limit: 5 }));

    expect(exportCorpus).toHaveBeenCalledWith(expect.anything(), 5);
  });

  it('알 수 없는 실패는 500이고 원인 문구를 노출하지 않는다', async () => {
    importCorpus.mockRejectedValue(new Error('boom: 상담사: 김민준'));
    const { POST } = await import('../route');
    const res = await POST(makeReq({}));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.code).toBe('unknown');
    expect(JSON.stringify(body)).not.toContain('김민준');
  });

  it('IF가 키를 거부하면 무엇을 고쳐야 하는지 돌려준다 — REQ-208', async () => {
    importCorpus.mockRejectedValue(new AuthError('invalid api key'));
    const { POST } = await import('../route');
    const res = await POST(makeReq({}));
    const body = await res.json();

    expect(res.status).toBe(502);
    expect(body.code).toBe('intfunc.auth');
    expect(body.error).toContain('INTFUNC_API_KEY');
  });

  it('보내기 전 거절은 400이고 어느 행인지 돌려준다 — REQ-208', async () => {
    importCorpus.mockRejectedValue(
      new DatasetImportError('bad rows', [{ index: 2, message: 'not an object' }])
    );
    const { POST } = await import('../route');
    const res = await POST(makeReq({}));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.code).toBe('dataset.rows_invalid');
    expect(body.rows).toEqual([2]);
  });

  it('데이터셋 확인 단계의 실패도 같은 모양으로 돌아온다', async () => {
    ensureDataset.mockRejectedValue(new AuthError('invalid api key'));
    const { POST } = await import('../route');
    const res = await POST(makeReq({}));

    expect(res.status).toBe(502);
    expect((await res.json()).code).toBe('intfunc.auth');
  });

  it('응답에 전사 본문이 실리지 않는다', async () => {
    const { POST } = await import('../route');
    const body = await (await POST(makeReq({}))).json();

    expect(JSON.stringify(body)).not.toContain('transcript');
    expect(JSON.stringify(body)).not.toContain('안녕하세요');
  });
});
