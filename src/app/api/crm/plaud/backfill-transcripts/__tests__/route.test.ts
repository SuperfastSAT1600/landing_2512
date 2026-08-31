import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const runBackfill = vi.fn();
vi.mock('@/lib/plaud-backfill-run', () => ({ runBackfill }));
vi.mock('@/lib/plaud-client', () => ({
  getPlaudFile: vi.fn(),
  listPlaudRecordings: vi.fn(),
  PLAUD_ACCOUNTS: [{ key: 'me', label: '이민재', seedEnv: 'X' }],
}));
vi.mock('@/lib/plaud-transcribe', () => ({ transcribeAudioUrl: vi.fn() }));
vi.mock('@/lib/call-transcripts', () => ({
  insertCallTranscript: vi.fn(),
  findTranscriptByExternalId: vi.fn(),
}));
vi.mock('@/lib/qwen-asr', () => ({ ASR_MODEL: 'fun-asr' }));
vi.mock('@/lib/supabase-admin', () => ({ supabaseAdmin: {} }));

process.env.ADMIN_SECRET_KEY = 'admin-key';

const makeReq = (body: unknown = {}, key: string | null = 'admin-key') =>
  new NextRequest('http://localhost/api/crm/plaud/backfill-transcripts', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(key ? { 'x-admin-key': key } : {}) },
    body: JSON.stringify(body),
  });

const report = {
  candidates: 5, skipped: 0, inserted: 2, wouldInsert: 0,
  unmatched: 1, ambiguous: 0, failed: 0, remaining: 2,
  unmatchedEntries: [], ambiguousEntries: [], failedEntries: [],
};

describe('POST /api/crm/plaud/backfill-transcripts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    runBackfill.mockResolvedValue(report);
  });

  it('관리자 키가 없으면 401 — 백필을 돌리지 않는다', async () => {
    const { POST } = await import('../route');
    const res = await POST(makeReq({}, null));
    expect(res.status).toBe(401);
    expect(runBackfill).not.toHaveBeenCalled();
  });

  it('진행 상황 집계를 반환한다', async () => {
    const { POST } = await import('../route');
    const res = await POST(makeReq({}));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toMatchObject({ inserted: 2, failed: 0, remaining: 2, candidates: 5 });
  });

  it('서버리스 한도 안에서 끝나도록 시간 예산을 걸어 호출한다', async () => {
    const { POST } = await import('../route');
    await POST(makeReq({}));

    const [, opts] = runBackfill.mock.calls[0];
    expect(opts.budgetMs).toBeGreaterThan(0);
    expect(opts.budgetMs).toBeLessThan(300_000); // maxDuration 미만이어야 응답을 돌려줄 수 있다
  });

  it('account_key를 주면 그 계정만 처리한다', async () => {
    const { POST } = await import('../route');
    await POST(makeReq({ account_key: 'me' }));

    const [, opts] = runBackfill.mock.calls[0];
    expect(opts.accounts).toEqual(['me']);
  });

  it('알 수 없는 account_key는 400', async () => {
    const { POST } = await import('../route');
    const res = await POST(makeReq({ account_key: 'nope' }));
    expect(res.status).toBe(400);
    expect(runBackfill).not.toHaveBeenCalled();
  });

  it('백필이 통째로 실패하면 500 — 부분 성공을 성공으로 위장하지 않는다', async () => {
    runBackfill.mockRejectedValueOnce(new Error('plaud down'));
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { POST } = await import('../route');
    const res = await POST(makeReq({}));
    expect(res.status).toBe(500);
    err.mockRestore();
  });
});
