// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// SSE(event/data) 형식 tools/call 응답을 만든다.
function sse(result: unknown): string {
  return `event: message\ndata: ${JSON.stringify({ jsonrpc: '2.0', id: 1, result })}\n\n`;
}
function toolResult(obj: unknown, isError = false) {
  return { isError, content: [{ type: 'text', text: JSON.stringify(obj) }] };
}

describe('plaud-client', () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.PLAUD_ACCESS_TOKEN;
    process.env.PLAUD_REFRESH_TOKEN = 'refresh-xyz';
  });
  afterEach(() => vi.unstubAllGlobals());

  it('토큰 없으면(access·refresh 모두) 에러', async () => {
    delete process.env.PLAUD_REFRESH_TOKEN;
    const { listPlaudRecordings } = await import('@/lib/plaud-client');
    await expect(listPlaudRecordings()).rejects.toThrow(/PLAUD_REFRESH_TOKEN/);
  });

  it('refresh_token으로 access token 갱신 후 list_files 호출', async () => {
    const fetchMock = vi.fn()
      // 1) refresh
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'access-abc', expires_in: 86400 }),
      })
      // 2) mcp list_files
      .mockResolvedValueOnce({
        ok: true,
        text: async () => sse(toolResult({ data: [{ id: 'a1', name: '상담', duration: 42000, start_at: '2026-08-05T02:36:30' }] })),
      });
    vi.stubGlobal('fetch', fetchMock);

    const { listPlaudRecordings } = await import('@/lib/plaud-client');
    const recs = await listPlaudRecordings({ query: '상담', page_size: 5 });

    // refresh 호출 검증
    const [refreshUrl, refreshInit] = fetchMock.mock.calls[0];
    expect(String(refreshUrl)).toContain('access-token/refresh');
    expect(String(refreshInit.body)).toContain('refresh_token=refresh-xyz');
    // mcp 호출: Bearer + page_size 최소 10 보정
    const [mcpUrl, mcpInit] = fetchMock.mock.calls[1];
    expect(String(mcpUrl)).toContain('mcp.plaud.ai/mcp');
    expect(mcpInit.headers.Authorization).toBe('Bearer access-abc');
    expect(JSON.parse(mcpInit.body).params.arguments.page_size).toBe(10);
    // 결과 매핑
    expect(recs).toEqual([
      { id: 'a1', name: '상담', created_at: undefined, start_at: '2026-08-05T02:36:30', duration: 42000 },
    ]);
  });

  it('PLAUD_ACCESS_TOKEN 있으면 refresh 생략', async () => {
    process.env.PLAUD_ACCESS_TOKEN = 'direct-token';
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      text: async () => sse(toolResult({ data: [] })),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { listPlaudRecordings } = await import('@/lib/plaud-client');
    await listPlaudRecordings();

    expect(fetchMock).toHaveBeenCalledTimes(1); // refresh 없음
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer direct-token');
  });

  it('getPlaudFile → presigned_url 반환', async () => {
    process.env.PLAUD_ACCESS_TOKEN = 'direct-token';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
      ok: true,
      text: async () => sse(toolResult({ id: 'f1', name: '상담', presigned_url: 'https://s3/a.mp3?x=1' })),
    }));
    const { getPlaudFile } = await import('@/lib/plaud-client');
    const f = await getPlaudFile('f1');
    expect(f.presigned_url).toBe('https://s3/a.mp3?x=1');
  });

  it('도구 isError → throw', async () => {
    process.env.PLAUD_ACCESS_TOKEN = 'direct-token';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
      ok: true,
      text: async () => sse(toolResult({ msg: 'page_size too small' }, true)),
    }));
    const { listPlaudRecordings } = await import('@/lib/plaud-client');
    await expect(listPlaudRecordings()).rejects.toThrow(/Plaud 도구 오류/);
  });

  it('presigned_url 없으면 getPlaudFile throw', async () => {
    process.env.PLAUD_ACCESS_TOKEN = 'direct-token';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
      ok: true,
      text: async () => sse(toolResult({ id: 'f1', name: '상담' })),
    }));
    const { getPlaudFile } = await import('@/lib/plaud-client');
    await expect(getPlaudFile('f1')).rejects.toThrow(/오디오 URL/);
  });
});
