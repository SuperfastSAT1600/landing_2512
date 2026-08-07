// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// 토큰 저장소는 항상 mock — 유닛 테스트가 Supabase에 붙지 않도록.
const readStoredRefreshToken = vi.fn();
const writeStoredRefreshToken = vi.fn();
const listStoredAccountKeys = vi.fn();
vi.mock('@/lib/plaud-token-store', () => ({
  readStoredRefreshToken: (k: string) => readStoredRefreshToken(k),
  writeStoredRefreshToken: (k: string, t: string) => writeStoredRefreshToken(k, t),
  listStoredAccountKeys: () => listStoredAccountKeys(),
}));

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
    vi.clearAllMocks();
    delete process.env.PLAUD_ACCESS_TOKEN;
    delete process.env.PLAUD_REFRESH_TOKEN_WOOYOUNG;
    process.env.PLAUD_REFRESH_TOKEN = 'refresh-xyz';
    // 기본: 저장소 비어있음 → env 씨앗 폴백.
    readStoredRefreshToken.mockResolvedValue(null);
    writeStoredRefreshToken.mockResolvedValue(undefined);
    listStoredAccountKeys.mockResolvedValue([]);
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

  it('저장소 refresh_token 우선 사용, 회전된 새 토큰은 저장(REQ-001/002)', async () => {
    readStoredRefreshToken.mockResolvedValue('stored-refresh');
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        // rotation: 응답에 새 refresh_token 포함.
        json: async () => ({ access_token: 'access-abc', expires_in: 86400, refresh_token: 'rotated-new' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        text: async () => sse(toolResult({ data: [] })),
      });
    vi.stubGlobal('fetch', fetchMock);

    const { listPlaudRecordings } = await import('@/lib/plaud-client');
    await listPlaudRecordings();

    // env('refresh-xyz')가 아니라 저장소('stored-refresh')로 갱신해야 한다.
    expect(String(fetchMock.mock.calls[0][1].body)).toContain('refresh_token=stored-refresh');
    // 회전된 새 refresh_token을 'me' 계정으로 저장.
    expect(writeStoredRefreshToken).toHaveBeenCalledWith('me', 'rotated-new');
  });

  it('새 refresh_token이 기존과 같으면 저장 생략', async () => {
    readStoredRefreshToken.mockResolvedValue('same-token');
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'a', expires_in: 86400, refresh_token: 'same-token' }),
      })
      .mockResolvedValueOnce({ ok: true, text: async () => sse(toolResult({ data: [] })) }));
    const { listPlaudRecordings } = await import('@/lib/plaud-client');
    await listPlaudRecordings();
    expect(writeStoredRefreshToken).not.toHaveBeenCalled();
  });

  it('저장소 토큰이 만료(401)면 env 씨앗으로 재시도·복구(REQ-003)', async () => {
    // 저장소엔 죽은 토큰, 운영자가 env에 새 씨앗을 넣은 상황.
    readStoredRefreshToken.mockResolvedValue('stale-stored');
    process.env.PLAUD_REFRESH_TOKEN = 'fresh-seed';
    const fetchMock = vi.fn()
      // 1) stored로 refresh → 401
      .mockResolvedValueOnce({ ok: false, status: 401 })
      // 2) env 씨앗으로 재시도 → 성공(회전 토큰 포함)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'a', expires_in: 86400, refresh_token: 'recovered' }),
      })
      // 3) mcp
      .mockResolvedValueOnce({ ok: true, text: async () => sse(toolResult({ data: [] })) });
    vi.stubGlobal('fetch', fetchMock);

    const { listPlaudRecordings } = await import('@/lib/plaud-client');
    await expect(listPlaudRecordings()).resolves.toEqual([]);
    expect(String(fetchMock.mock.calls[0][1].body)).toContain('refresh_token=stale-stored');
    expect(String(fetchMock.mock.calls[1][1].body)).toContain('refresh_token=fresh-seed');
    // 복구된 회전 토큰을 'me' 계정에 저장해 다음부터 정상.
    expect(writeStoredRefreshToken).toHaveBeenCalledWith('me', 'recovered');
  });

  it('저장소 read 실패해도 env 씨앗으로 폴백 동작(REQ-003)', async () => {
    readStoredRefreshToken.mockRejectedValue(new Error('supabase down'));
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'a', expires_in: 86400 }) })
      .mockResolvedValueOnce({ ok: true, text: async () => sse(toolResult({ data: [] })) });
    vi.stubGlobal('fetch', fetchMock);

    const { listPlaudRecordings } = await import('@/lib/plaud-client');
    await expect(listPlaudRecordings()).resolves.toEqual([]);
    // env 씨앗으로 갱신.
    expect(String(fetchMock.mock.calls[0][1].body)).toContain('refresh_token=refresh-xyz');
  });

  it('REQ-003: 계정별 seed env로 갱신하고 회전 토큰을 해당 계정에 저장', async () => {
    process.env.PLAUD_REFRESH_TOKEN_WOOYOUNG = 'seed-wooyoung';
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'acc-wy', expires_in: 86400, refresh_token: 'rot-wy' }),
      })
      .mockResolvedValueOnce({ ok: true, text: async () => sse(toolResult({ data: [] })) });
    vi.stubGlobal('fetch', fetchMock);

    const { listPlaudRecordings } = await import('@/lib/plaud-client');
    await listPlaudRecordings({}, 'wooyoung');

    // wooyoung 계정 seed env로 갱신했는지.
    expect(String(fetchMock.mock.calls[0][1].body)).toContain('refresh_token=seed-wooyoung');
    expect(fetchMock.mock.calls[1][1].headers.Authorization).toBe('Bearer acc-wy');
    // 회전 토큰이 'wooyoung' 계정으로 저장돼야 한다(다른 계정 오염 금지).
    expect(writeStoredRefreshToken).toHaveBeenCalledWith('wooyoung', 'rot-wy');
    // wooyoung 계정 조회는 'wooyoung' 저장소만 읽어야 한다.
    expect(readStoredRefreshToken).toHaveBeenCalledWith('wooyoung');
  });

  it('REQ-003: 알 수 없는 계정 키는 에러', async () => {
    vi.stubGlobal('fetch', vi.fn());
    const { getPlaudFile } = await import('@/lib/plaud-client');
    await expect(getPlaudFile('f1', 'nobody')).rejects.toThrow(/알 수 없는 Plaud 계정/);
  });

  it('REQ-003: getAccountLabel/listPlaudAccounts — seed env 기준 노출', async () => {
    const mod = await import('@/lib/plaud-client');
    expect(mod.getAccountLabel('me')).toBe('이민재');
    expect(mod.getAccountLabel('wooyoung')).toBe('김우영');
    expect(mod.getAccountLabel('nobody')).toBeUndefined();

    // 기본: me seed만 설정됨 → ['me'] / [{key:'me',label:'이민재'}].
    expect(await mod.listPlaudAccountKeys()).toEqual(['me']);
    expect(await mod.listPlaudAccounts()).toEqual([{ key: 'me', label: '이민재' }]);
    // wooyoung seed 추가 시 둘 다.
    process.env.PLAUD_REFRESH_TOKEN_WOOYOUNG = 'seed-wy';
    expect(await mod.listPlaudAccounts()).toEqual([
      { key: 'me', label: '이민재' },
      { key: 'wooyoung', label: '김우영' },
    ]);
  });

  it('REQ-DB: seed env 없이 Supabase 저장 토큰만으로도 계정 노출(Vercel env 불필요)', async () => {
    // env엔 me만, 저장소엔 wooyoung 토큰이 있는 상황 → 둘 다 노출돼야 함.
    listStoredAccountKeys.mockResolvedValue(['wooyoung']);
    const mod = await import('@/lib/plaud-client');
    expect(await mod.listPlaudAccountKeys()).toEqual(['me', 'wooyoung']);
  });
});
