/** CRM 상담 메모 첨부 관련 공용 상수·검증 로직. */
import type { Attachment } from '@/types/crm';

/** 비공개 버킷 — 카톡 캡처 등 개인정보 포함 가능. 서명 URL로만 노출. */
export const ATTACHMENT_BUCKET = 'crm-attachments';

/** 허용 MIME: 모든 이미지 + PDF. (그 외 형식은 거부) */
export function isAllowedAttachmentMime(mime: string): boolean {
  const base = mime.split(';')[0].trim().toLowerCase();
  return base.startsWith('image/') || base === 'application/pdf';
}

/** 첨부 1개 최대 크기 (10MB). */
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

/** 서명 URL 유효 시간(초). */
export const SIGNED_URL_TTL_SEC = 60 * 60; // 1시간

/**
 * 메모 저장 body의 attachments가 유효한 Attachment 배열인지 검증해 정규화한다.
 * undefined면 빈 배열, 형식이 어긋나면 null(=400).
 */
export function parseAttachments(value: unknown): Attachment[] | null {
  if (value === undefined) return [];
  if (!Array.isArray(value)) return null;
  const out: Attachment[] = [];
  for (const item of value) {
    if (
      !item || typeof item !== 'object' ||
      typeof (item as Attachment).path !== 'string' ||
      typeof (item as Attachment).name !== 'string' ||
      typeof (item as Attachment).mime !== 'string' ||
      typeof (item as Attachment).size !== 'number'
    ) return null;
    const { path, name, mime, size } = item as Attachment;
    out.push({ path, name, mime, size });
  }
  return out;
}

/**
 * 서명 URL 발급 시, 요청 path가 해당 학생 폴더 안에 있는지 검증한다.
 * 다른 학생 파일 접근·경로 탈출(`..`)을 막는다.
 */
export function isWithinStudentFolder(path: string, studentId: string): boolean {
  return !!path && path.startsWith(`${studentId}/`) && !path.includes('..');
}
