/**
 * Plaud 호스팅 원격 MCP 서버(`mcp.plaud.ai/mcp`) HTTP 클라이언트 (서버 전용).
 * 브라우저는 Plaud에 직접 못 붙으므로 CRM 백엔드가 이 모듈로 녹음 목록·오디오 URL을 가져온다.
 *
 * 인증: refresh_token(저장소 → env 씨앗)으로 access token(24h)을 자동 갱신한다.
 *       Plaud는 refresh token rotation 방식이라 갱신 응답에 새 refresh_token이 오며,
 *       이를 Supabase(integration_tokens)에 저장해 7일 만료로 체인이 끊기지 않게 한다.
 *       PLAUD_ACCESS_TOKEN이 있으면 그것을 우선 사용(갱신 생략 — 단기 테스트용).
 * 전송: MCP Streamable HTTP, stateless(tools/call 직접). 응답은 SSE(event/data) 포맷.
 */

import {
  readStoredRefreshToken,
  writeStoredRefreshToken,
  listStoredAccountKeys,
} from './plaud-token-store';

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
  account_key?: string; // 소속 Plaud 계정(목록 병합 시 태깅)
  owner_label?: string; // 계정 소유자 표시명(UI 칩/작성자)
}

export interface PlaudFile extends PlaudRecording {
  presigned_url: string;
}

/**
 * Plaud 계정 로스터 — 계정별 표시명과 부트스트랩 seed env를 정의하는 단일 소스.
 * 회전된 최신 refresh_token은 Supabase(integration_tokens.account_key)에 저장되고,
 * 여기 seedEnv는 최초 부트스트랩(저장소 비어있을 때)에만 사용된다.
 * 인원이 거의 안 바뀌므로 코드 상수로 둔다(3명+ 확장 시 DB 관리로 이전 검토).
 */
export interface PlaudAccount {
  key: string;
  label: string;
  seedEnv: string;
}

export const PLAUD_ACCOUNTS: PlaudAccount[] = [
  { key: 'me', label: '이민재', seedEnv: 'PLAUD_REFRESH_TOKEN' },
  { key: 'wooyoung', label: '김우영', seedEnv: 'PLAUD_REFRESH_TOKEN_WOOYOUNG' },
];

const DEFAULT_ACCOUNT_KEY = 'me';

function getAccount(accountKey: string): PlaudAccount {
  const acc = PLAUD_ACCOUNTS.find((a) => a.key === accountKey);
  if (!acc) throw new Error(`알 수 없는 Plaud 계정: ${accountKey}`);
  return acc;
}

/** 계정 표시명(작성자·UI 칩용). 알 수 없는 키면 undefined. */
export function getAccountLabel(accountKey: string): string | undefined {
  return PLAUD_ACCOUNTS.find((a) => a.key === accountKey)?.label;
}

/**
 * 현재 사용 가능한 계정 목록(key+label). 다음 중 하나라도 있으면 노출:
 *   ① seed env(PLAUD_REFRESH_TOKEN 등)가 설정됐거나
 *   ② Supabase integration_tokens에 그 계정의 토큰이 저장돼 있거나(=Vercel env 없이 DB만으로 운영 가능)
 *   ③ PLAUD_ACCESS_TOKEN override가 있으면 기본 계정('me')
 * UI 직원 선택 단계와 목록 조회 라우트가 공유하는 단일 소스.
 */
export async function listPlaudAccounts(): Promise<{ key: string; label: string }[]> {
  const hasOverride = !!process.env.PLAUD_ACCESS_TOKEN?.trim();
  const storedKeys = new Set(await listStoredAccountKeys().catch(() => []));
  return PLAUD_ACCOUNTS.filter(
    (a) =>
      !!process.env[a.seedEnv]?.trim() ||
      storedKeys.has(a.key) ||
      (hasOverride && a.key === DEFAULT_ACCOUNT_KEY)
  ).map((a) => ({ key: a.key, label: a.label }));
}

/** 현재 사용 가능한 계정 키 목록. */
export async function listPlaudAccountKeys(): Promise<string[]> {
  return (await listPlaudAccounts()).map((a) => a.key);
}

/** 계정별 access token 메모리 캐시 (프로세스 수명 동안, 만료 60s 전까지 재사용). */
const tokenCache = new Map<string, { token: string; expiresAt: number }>();

/** refresh_token으로 새 access token을 발급받는다(회전된 새 refresh_token도 함께 반환). */
async function refreshAccessToken(
  refreshToken: string
): Promise<{ token: string; ttlSec: number; newRefreshToken?: string }> {
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
  const json = (await res.json()) as {
    access_token?: string;
    expires_in?: number;
    refresh_token?: string;
  };
  if (!json.access_token) throw new Error('Plaud 토큰 응답에 access_token 없음');
  return {
    token: json.access_token,
    ttlSec: json.expires_in ?? 86400,
    newRefreshToken: json.refresh_token,
  };
}

/** 지정 계정의 유효한 access token을 반환한다(캐시 → env override → refresh). */
export async function getPlaudAccessToken(
  accountKey: string = DEFAULT_ACCOUNT_KEY
): Promise<string> {
  const account = getAccount(accountKey);

  const override = process.env.PLAUD_ACCESS_TOKEN?.trim();
  if (override) return override;

  const now = Date.now();
  const cached = tokenCache.get(accountKey);
  if (cached && cached.expiresAt - 60_000 > now) return cached.token;

  // 저장소의 최신 회전 토큰 우선, 없으면 계정 seed env(부트스트랩). 저장소 오류는 null 폴백.
  const stored = await readStoredRefreshToken(accountKey).catch(() => null);
  const seed = process.env[account.seedEnv]?.trim() || undefined;
  const primary = stored ?? seed;
  if (!primary) {
    throw new Error(
      `${account.seedEnv}(또는 PLAUD_ACCESS_TOKEN)이 설정되지 않았습니다. [account=${accountKey}]`
    );
  }

  let refreshed: { token: string; ttlSec: number; newRefreshToken?: string };
  let usedToken = primary;
  try {
    refreshed = await refreshAccessToken(primary);
  } catch (e) {
    // 저장소 토큰이 만료(7일+ 무활동)됐는데 운영자가 seed env를 새로 넣은 경우, 씨앗으로 재시도해 복구한다.
    // (저장소 우선 순서 때문에 새 씨앗이 영영 안 먹히는 함정을 막는다.)
    if (stored && seed && seed !== stored) {
      refreshed = await refreshAccessToken(seed);
      usedToken = seed;
    } else {
      throw e;
    }
  }

  tokenCache.set(accountKey, {
    token: refreshed.token,
    expiresAt: now + refreshed.ttlSec * 1000,
  });
  // 회전된 새 refresh_token을 해당 계정에 저장해 다음 갱신에 사용(seed 7일 만료와 무관하게 체인 유지).
  if (refreshed.newRefreshToken && refreshed.newRefreshToken !== usedToken) {
    await writeStoredRefreshToken(accountKey, refreshed.newRefreshToken).catch(() => {});
  }
  return refreshed.token;
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
  args: Record<string, unknown>,
  accountKey: string = DEFAULT_ACCOUNT_KEY
): Promise<string> {
  const token = await getPlaudAccessToken(accountKey);
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

/**
 * Plaud MCP 텍스트 응답 선두의 완전한 JSON 값만 추출한다.
 * 일부 도구(get_file 등)는 트랜스크립트가 인라인이 아닐 때 JSON 뒤에
 * `\n\nNote: ...` 형태의 비-JSON 안내문을 덧붙여 보내 JSON.parse가 깨진다.
 * 균형 잡힌 JSON을 찾지 못하면 원본을 그대로 반환한다(기존 파싱 에러 메시지 보존용).
 */
function extractLeadingJson(text: string): string {
  const start = text.search(/[[{]/);
  if (start === -1) return text;
  const open = text[start];
  const close = open === '{' ? '}' : ']';
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === open) depth++;
    else if (ch === close) {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return text;
}

/** 녹음 목록 조회. page_size는 Plaud 제약상 최소 10으로 보정한다. */
export async function listPlaudRecordings(
  opts: {
    query?: string;
    date_from?: string;
    date_to?: string;
    page?: number;
    page_size?: number;
  } = {},
  accountKey: string = DEFAULT_ACCOUNT_KEY
): Promise<PlaudRecording[]> {
  const args: Record<string, unknown> = {
    page: opts.page ?? 1,
    page_size: Math.max(10, opts.page_size ?? 20),
  };
  if (opts.query) args.query = opts.query;
  if (opts.date_from) args.date_from = opts.date_from;
  if (opts.date_to) args.date_to = opts.date_to;

  const text = await plaudMcpCall('list_files', args, accountKey);
  const parsed = JSON.parse(extractLeadingJson(text)) as { data?: unknown } | unknown[];
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
export async function getPlaudFile(
  fileId: string,
  accountKey: string = DEFAULT_ACCOUNT_KEY
): Promise<PlaudFile> {
  const text = await plaudMcpCall('get_file', { file_id: fileId }, accountKey);
  const d = JSON.parse(extractLeadingJson(text)) as Record<string, unknown>;
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
