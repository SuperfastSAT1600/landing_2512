# Coach Photo Upload Bug Fix

## Overview

코치 관리 페이지(`/admin/coaches`)에서 프로필 사진 업로드 시 "업로드 중 오류가 발생했습니다" 에러가 발생한다. 원인은 `CoachRow.tsx`가 존재하지 않는 `/api/admin/upload` 엔드포인트를 호출하기 때문이다. 블로그 에디터에서 사용하는 `/api/admin/upload-url` + Supabase signed URL 방식으로 수정한다.

## Requirements

### REQ-001: handlePhotoUpload를 signed URL 방식으로 수정
- **Priority**: Must
- **Description**: `CoachRow.tsx`의 `handlePhotoUpload`가 `/api/admin/upload-url`에서 signed URL을 받아 Supabase에 직접 업로드하도록 변경
- **Acceptance Criteria**: 프로필 사진 파일 선택 후 업로드가 성공하고, 미리보기 이미지가 표시된다
- **Verification**: (BROWSER) 코치 편집 모드에서 파일 선택 → 업로드 성공 → 미리보기 표시 확인

## Technical Design

### Architecture
- `CoachRow.tsx`의 `handlePhotoUpload` 함수를 수정
- Supabase anon 클라이언트를 파일 상단에 생성 (`useImageUpload.ts`와 동일한 패턴)
- 2단계 업로드 흐름:
  1. `POST /api/admin/upload-url` → `{ signedUrl, path, token }` 획득
  2. `supabase.storage.from('uploads').uploadToSignedUrl(path, token, file)` 실행
  3. `supabase.storage.from('uploads').getPublicUrl(path)` → URL을 `editState.photo`에 저장

### Dependencies
- `@supabase/supabase-js` (이미 설치됨)
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (이미 env에 존재)

## Traceability Matrix

| REQ ID  | Description                      | Verification | Test File | Status  |
|---------|----------------------------------|--------------|-----------|---------|
| REQ-001 | handlePhotoUpload signed URL 수정 | (BROWSER)    | N/A       | Pending |

## Implementation Order

1. REQ-001 — `CoachRow.tsx` `handlePhotoUpload` 함수 수정 (단일 파일 변경)

## Out of Scope

- `QuestionDetailModal.tsx`의 동일한 문제 (별도 작업)
- `/api/admin/upload` 엔드포인트 신규 생성 (불필요, 기존 방식 재사용)
