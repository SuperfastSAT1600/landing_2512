/**
 * 통화 녹음 보관 정책 공통 로직 (라우트·정리 작업·테스트 공유).
 */

/** 원본 오디오 보관 기간 (일). 이후 cleanup으로 삭제. */
export const RECORDING_RETENTION_DAYS = 30;

/** 업로드 허용 오디오 MIME (스피커폰 녹음: 브라우저별 webm/mp4/ogg). */
export const ALLOWED_AUDIO_MIME = new Set([
  'audio/webm',
  'audio/ogg',
  'audio/mp4',
  'audio/mpeg',
  'audio/x-m4a',
  'audio/wav',
]);

/** Gemini 인라인 입력 한도(요청 ~20MB) 내로 두기 위한 서버 용량 캡. */
export const MAX_AUDIO_BYTES = 20 * 1024 * 1024;

/** 보관 만료 시각 = 기준 시각 + 보관일수. */
export function computeExpiresAt(nowMs: number): string {
  return new Date(nowMs + RECORDING_RETENTION_DAYS * 86400000).toISOString();
}

/** expires_at(ISO)이 기준 시각보다 과거면 만료. */
export function isExpired(expiresAt: string, nowMs: number): boolean {
  const t = new Date(expiresAt).getTime();
  return !Number.isNaN(t) && t <= nowMs;
}
