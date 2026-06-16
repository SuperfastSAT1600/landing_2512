/**
 * 브라우저 VoIP 상담(인터넷 전화) 공통 로직.
 * - Daily.co REST 래퍼 (방/토큰 생성, 녹음 다운로드 링크/삭제)
 * - 웹훅 HMAC 서명 검증
 * - 녹음 보관(30일) 정책
 *
 * 녹음은 Daily 클라우드에 보관하고, access-link로 받아 전사한 뒤
 * 30일 후 cleanup cron이 Daily REST로 삭제한다.
 */
import { createHmac, timingSafeEqual, randomBytes } from 'crypto';

const DAILY_API = 'https://api.daily.co/v1';

/** 원본 녹음 보관 기간 (일). 이후 cleanup으로 Daily에서 삭제. */
export const RECORDING_RETENTION_DAYS = 30;

/**
 * 전사 단일 파일 용량 캡. OpenAI 전사 파일 한도(25MB) 아래로 둔다.
 * Daily 오디오 전용 녹음(cloud-audio-only)은 일반 상담 길이에서 이 값 아래.
 */
export const MAX_AUDIO_BYTES = 24 * 1024 * 1024;

/** 통화 세션 방 유효 시간 (초). 방치된 링크가 오래 살아있지 않게 2시간. */
export const ROOM_TTL_SEC = 2 * 60 * 60;

/** 보관 만료 시각 = 기준 시각 + 보관일수. */
export function computeExpiresAt(nowMs: number): string {
  return new Date(nowMs + RECORDING_RETENTION_DAYS * 86400000).toISOString();
}

/** expires_at(ISO)이 기준 시각보다 과거면 만료. */
export function isExpired(expiresAt: string, nowMs: number): boolean {
  const t = new Date(expiresAt).getTime();
  return !Number.isNaN(t) && t <= nowMs;
}

/** 고객 링크용 우리 토큰 (Daily 토큰과 무관, 추측 불가한 URL-safe 난수). */
export function generatePublicToken(): string {
  return randomBytes(24).toString('base64url');
}

function dailyKey(): string {
  const key = process.env.DAILY_API_KEY;
  if (!key) throw new Error('DAILY_API_KEY is not set');
  return key;
}

async function dailyFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${DAILY_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${dailyKey()}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Daily ${init.method ?? 'GET'} ${path} → ${res.status} ${body.slice(0, 300)}`);
  }
  return (await res.json()) as T;
}

export interface DailyRoom {
  id: string;
  name: string;
  url: string;
}

/**
 * 비공개 방 생성. 오디오 전용 클라우드 녹음, 영상 off, 2시간 후 만료.
 * 녹음은 세일즈 담당자(owner) 토큰의 start_cloud_recording로 자동 시작한다.
 */
export async function createRoom(): Promise<DailyRoom> {
  const exp = Math.floor(Date.now() / 1000) + ROOM_TTL_SEC;
  return dailyFetch<DailyRoom>('/rooms', {
    method: 'POST',
    body: JSON.stringify({
      privacy: 'private',
      properties: {
        exp,
        enable_recording: 'cloud-audio-only',
        start_video_off: true,
        eject_at_room_exp: true,
        enable_prejoin_ui: false,
      },
    }),
  });
}

/**
 * 미팅 토큰 발급.
 * @param isOwner 세일즈 담당자면 true (방 관리·녹음 자동 시작 권한)
 */
export async function createMeetingToken(opts: {
  roomName: string;
  isOwner: boolean;
  userName: string;
}): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + ROOM_TTL_SEC;
  const { token } = await dailyFetch<{ token: string }>('/meeting-tokens', {
    method: 'POST',
    body: JSON.stringify({
      properties: {
        room_name: opts.roomName,
        is_owner: opts.isOwner,
        user_name: opts.userName,
        exp,
        eject_at_token_exp: true,
        // 세일즈 담당자 입장 시 오디오 녹음 자동 시작 (고객은 false)
        ...(opts.isOwner ? { start_cloud_recording: true } : {}),
      },
    }),
  });
  return token;
}

/** 녹음 파일 임시 다운로드 링크 조회. 웹훅 페이로드엔 URL이 없어 별도 호출 필요. */
export async function getRecordingAccessLink(recordingId: string): Promise<string> {
  const { download_link } = await dailyFetch<{ download_link: string }>(
    `/recordings/${recordingId}/access-link`
  );
  return download_link;
}

/** 보관 만료된 녹음 삭제 (cleanup cron). */
export async function deleteRecording(recordingId: string): Promise<void> {
  await dailyFetch(`/recordings/${recordingId}`, { method: 'DELETE' });
}

/**
 * Daily 웹훅 서명 검증.
 * 서명 문자열 = `${timestamp}.${rawBody}`, 키 = base64 디코드한 시크릿,
 * HMAC-SHA256 → base64. 헤더 X-Webhook-Signature와 상수시간 비교.
 */
export function verifyWebhookSignature(opts: {
  rawBody: string;
  timestamp: string | null;
  signature: string | null;
  secret: string;
}): boolean {
  const { rawBody, timestamp, signature, secret } = opts;
  if (!timestamp || !signature) return false;
  const expected = createHmac('sha256', Buffer.from(secret, 'base64'))
    .update(`${timestamp}.${rawBody}`)
    .digest('base64');
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}
