import { describe, it, expect } from 'vitest';
import {
  ATTACHMENT_BUCKET,
  MAX_ATTACHMENT_BYTES,
  SIGNED_URL_TTL_SEC,
  isAllowedAttachmentMime,
  parseAttachments,
  isWithinStudentFolder,
} from '@/lib/crm-attachment';

describe('isAllowedAttachmentMime (REQ-002/003)', () => {
  it('모든 이미지 형식을 허용', () => {
    expect(isAllowedAttachmentMime('image/png')).toBe(true);
    expect(isAllowedAttachmentMime('image/jpeg')).toBe(true);
    expect(isAllowedAttachmentMime('image/gif')).toBe(true);
    expect(isAllowedAttachmentMime('image/webp')).toBe(true);
  });
  it('PDF를 허용', () => {
    expect(isAllowedAttachmentMime('application/pdf')).toBe(true);
  });
  it('mime 파라미터(;charset 등)가 붙어도 판정', () => {
    expect(isAllowedAttachmentMime('image/png;charset=binary')).toBe(true);
  });
  it('그 외 형식은 불허', () => {
    expect(isAllowedAttachmentMime('audio/webm')).toBe(false);
    expect(isAllowedAttachmentMime('application/zip')).toBe(false);
    expect(isAllowedAttachmentMime('text/html')).toBe(false);
    expect(isAllowedAttachmentMime('')).toBe(false);
  });
});

describe('상수', () => {
  it('비공개 버킷명', () => {
    expect(ATTACHMENT_BUCKET).toBe('crm-attachments');
  });
  it('최대 크기 10MB', () => {
    expect(MAX_ATTACHMENT_BYTES).toBe(10 * 1024 * 1024);
  });
  it('서명 URL 1시간', () => {
    expect(SIGNED_URL_TTL_SEC).toBe(3600);
  });
});

describe('parseAttachments (REQ-004)', () => {
  const valid = { path: 'sid/abc.png', name: 'a.png', mime: 'image/png', size: 123 };

  it('undefined면 빈 배열', () => {
    expect(parseAttachments(undefined)).toEqual([]);
  });
  it('유효한 배열은 정규화해 반환', () => {
    expect(parseAttachments([valid])).toEqual([valid]);
  });
  it('알 수 없는 키는 제거하고 필수 필드만 남김', () => {
    const parsed = parseAttachments([{ ...valid, evil: 'x' }]);
    expect(parsed).toEqual([valid]);
    expect(parsed?.[0]).not.toHaveProperty('evil');
  });
  it('배열이 아니면 null', () => {
    expect(parseAttachments({})).toBeNull();
    expect(parseAttachments('x')).toBeNull();
  });
  it('필수 필드 누락/타입 오류면 null', () => {
    expect(parseAttachments([{ path: 'p', name: 'n', mime: 'image/png' }])).toBeNull();
    expect(parseAttachments([{ ...valid, size: '123' }])).toBeNull();
    expect(parseAttachments([null])).toBeNull();
  });
});

describe('isWithinStudentFolder (REQ-003)', () => {
  const sid = '550e8400-e29b-41d4-a716-446655440000';

  it('해당 학생 폴더 경로는 허용', () => {
    expect(isWithinStudentFolder(`${sid}/123-abc-img.png`, sid)).toBe(true);
  });
  it('다른 학생 폴더는 거부', () => {
    expect(isWithinStudentFolder('other-id/123-abc.png', sid)).toBe(false);
  });
  it('경로 탈출(..)은 거부', () => {
    expect(isWithinStudentFolder(`${sid}/../other/x.png`, sid)).toBe(false);
  });
  it('빈 경로는 거부', () => {
    expect(isWithinStudentFolder('', sid)).toBe(false);
  });
  it('학생 id가 prefix가 아니면 거부(부분 일치 방지)', () => {
    expect(isWithinStudentFolder(`${sid}extra/x.png`, sid)).toBe(false);
  });
});
