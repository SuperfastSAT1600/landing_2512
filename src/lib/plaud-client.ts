/**
 * Plaud 호스팅 원격 MCP 서버(`mcp.plaud.ai/mcp`) HTTP 클라이언트 (서버 전용).
 * 브라우저는 Plaud에 직접 못 붙으므로 CRM 백엔드가 이 모듈로 녹음 목록·오디오 URL을 가져온다.
 *
 * 인증: PLAUD_REFRESH_TOKEN(env)로 access token을 자동 갱신(refresh_token 재사용 가능, 24h).
 *       PLAUD_ACCESS_TOKEN이 있으면 그것을 우선 사용(갱신 생략 — 단기 테스트용).
 * 전송: MCP Streamable HTTP, stateless(tools/call 직접). 응답은 SSE(event/data) 포맷.
 */

const MCP_URL = 'https://mcp.plaud.ai/mcp';
const REFRESH_URL =
  'https://platform.plaud.ai/developer/api/oauth/third-party/access-token/refresh';

// platform.plaud.ai는 Cloudflare 봇 차단(1010)이 있어 refresh에는 브라우저 UA가 필요하다.
const BROWSER_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

export interface PlaudRecording {
  id: string;
  name: string;
  created_at?: string;
  start_at?: string;
  duration?: number; // ms
}

export interface PlaudFile extends PlaudRecording {
  presigned_url: string;
}

/** access token 메모리 캐시 (프로세스 수명 동안, 만료 60s 전까지 재사용). */
let cachedToken: { token: string; expiresAt: number } | null = null;

/** refresh_token으로 새 access token을 발급받는다. */
async function refreshAccessToken(refreshToken: string): Promise<{ token: string; ttlSec: number }> {
  const res = await fetch(REFRESH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
      'User-Agent': BROWSER_UA,
      Origin: 'https://web.plaud.ai',
      Referer: 'https://web.plaud.ai/',
    },
    body: new URLSearchParams({ refresh_token: refreshToken }),
  });
  if (!res.ok) {
    throw new Error(`Plaud 토큰 갱신 실패: ${res.status}`);
  }
  const json = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!json.access_token) throw new Error('Plaud 토큰 응답에 access_token 없음');
  return { token: json.access_token, ttlSec: json.expires_in ?? 86400 };
}

/** 유효한 access token을 반환한다(캐시 → env override → refresh). */
export async function getPlaudAccessToken(): Promise<string> {
  const override = process.env.PLAUD_ACCESS_TOKEN?.trim();
  if (override) return override;

  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt - 60_000 > now) return cachedToken.token;

  const refreshToken = process.env.PLAUD_REFRESH_TOKEN?.trim();
  if (!refreshToken) {
    throw new Error('PLAUD_REFRESH_TOKEN(또는 PLAUD_ACCESS_TOKEN)이 설정되지 않았습니다.');
  }
  const { token, ttlSec } = await refreshAccessToken(refreshToken);
  cachedToken = { token, expiresAt: now + ttlSec * 1000 };
  return token;
}

/** SSE(text/event-stream) 응답 본문에서 result를 담은 JSON-RPC 페이로드를 추출한다. */
function parseSseJsonRpc(raw: string): { result?: unknown; error?: unknown } {
  // "event: message\ndata: {json}\n\n" 형태. data: 라인들을 모아 result/error 있는 것을 채택.
  const dataLines = raw
    .split('\n')
    .filter((l) => l.startsWith('data:'))
    .map((l) => l.slice(5).trim())
    .filter(Boolean);
  for (const d of dataLines) {
    try {
      const obj = JSON.parse(d);
      if (obj && (obj.result !== undefined || obj.error !== undefined)) return obj;
    } catch {
      /* 부분 라인 무시 */
    }
  }
  throw new Error('Plaud MCP 응답 파싱 실패');
}

/**
 * Plaud MCP tools/call 실행 후 도구 결과 텍스트를 반환한다.
 * @throws 도구가 isError를 반환하거나 전송 실패 시
 */
export async function plaudMcpCall(
  name: string,
  args: Record<string, unknown>
): Promise<string> {
  const token = await getPlaudAccessToken();
  const res = await fetch(MCP_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: { name, arguments: args },
    }),
  });
  if (!res.ok) {
    throw new Error(`Plaud MCP 요청 실패: ${res.status}`);
  }
  const rpc = parseSseJsonRpc(await res.text());
  if (rpc.error) {
    throw new Error(`Plaud MCP 오류: ${JSON.stringify(rpc.error)}`);
  }
  const result = rpc.result as {
    isError?: boolean;
    content?: Array<{ type: string; text?: string }>;
  };
  const text = result?.content?.find((c) => c.type === 'text')?.text ?? '';
  if (result?.isError) {
    throw new Error(`Plaud 도구 오류: ${text}`);
  }
  return text;
}

/** 녹음 목록 조회. page_size는 Plaud 제약상 최소 10으로 보정한다. */
export async function listPlaudRecordings(opts: {
  query?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  page_size?: number;
} = {}): Promise<PlaudRecording[]> {
  const args: Record<string, unknown> = {
    page: opts.page ?? 1,
    page_size: Math.max(10, opts.page_size ?? 20),
  };
  if (opts.query) args.query = opts.query;
  if (opts.date_from) args.date_from = opts.date_from;
  if (opts.date_to) args.date_to = opts.date_to;

  const text = await plaudMcpCall('list_files', args);
  const parsed = JSON.parse(text) as { data?: unknown } | unknown[];
  const list = Array.isArray(parsed) ? parsed : (parsed.data ?? []);
  return (list as Record<string, unknown>[]).map((r) => ({
    id: String(r.id),
    name: String(r.name ?? ''),
    created_at: r.created_at as string | undefined,
    start_at: r.start_at as string | undefined,
    duration: typeof r.duration === 'number' ? r.duration : undefined,
  }));
}

/** 단일 녹음 상세(presigned 오디오 URL 포함) 조회. */
export async function getPlaudFile(fileId: string): Promise<PlaudFile> {
  const text = await plaudMcpCall('get_file', { file_id: fileId });
  const d = JSON.parse(text) as Record<string, unknown>;
  const url = typeof d.presigned_url === 'string' ? d.presigned_url : '';
  if (!url) throw new Error('녹음 오디오 URL을 가져오지 못했습니다.');
  return {
    id: String(d.id ?? fileId),
    name: String(d.name ?? ''),
    start_at: d.start_at as string | undefined,
    duration: typeof d.duration === 'number' ? d.duration : undefined,
    presigned_url: url,
  };
}
