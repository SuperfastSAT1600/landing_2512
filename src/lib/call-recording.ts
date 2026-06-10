/**
 * 통화 녹음 보관 정책 공통 로직 (라우트·정리 작업·테스트 공유).
 */

/** 원본 오디오 보관 기간 (일). 이후 cleanup으로 삭제. */
export const RECORDING_RETENTION_DAYS = 30;

/** 통화 녹음 비공개 Storage 버킷 이름. */
export const CALL_BUCKET = 'call-recordings';

/** 업로드 허용 오디오 MIME (스피커폰 녹음: 브라우저별 webm/mp4/ogg). */
export const ALLOWED_AUDIO_MIME = new Set([
  'audio/webm',
  'audio/ogg',
  'audio/mp4',
  'audio/mpeg',
  'audio/x-m4a',
  'audio/wav',
]);

/** 세그먼트(파일) 1개당 용량 캡. OpenAI 전사 파일 한도(25MB) 아래로 둔다. */
export const MAX_AUDIO_BYTES = 24 * 1024 * 1024;

/** 한 통화에서 허용하는 최대 세그먼트 수 (긴 통화 분할 안전장치). */
export const MAX_SEGMENTS = 20;

/** 보관 만료 시각 = 기준 시각 + 보관일수. */
export function computeExpiresAt(nowMs: number): string {
  return new Date(nowMs + RECORDING_RETENTION_DAYS * 86400000).toISOString();
}

/** expires_at(ISO)이 기준 시각보다 과거면 만료. */
export function isExpired(expiresAt: string, nowMs: number): boolean {
  const t = new Date(expiresAt).getTime();
  return !Number.isNaN(t) && t <= nowMs;
}
