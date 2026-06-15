# CRM 상담 메모 파일/이미지 첨부

## Overview

상담 매니저가 학생별 상담 메모를 입력할 때 이미지·파일을 첨부할 수 있게 한다.
주 용도는 **카카오톡 대화 캡처를 운영 담당 동료가 볼 수 있도록 공유**하는 것.
이미지는 **클립보드에서 복사한 내용을 메모란에 바로 붙여넣기(paste)** 해서 첨부할 수 있어야 한다.

첨부 파일은 학생/학부모 개인정보(카톡 대화)를 포함할 수 있으므로 **비공개(private) Supabase
Storage 버킷**에 저장하고, 조회 시 **서명 URL(signed URL)**로만 노출한다. 학부모 포털은
`ai_purified`만 노출하므로 첨부는 자동으로 운영자 내부 전용이다(포털 코드 변경 없음).

## Requirements

### REQ-001: 첨부 데이터 모델 확장
- **Priority**: Must
- **Description**: `ConsultationEntry`에 `attachments?: Attachment[]` 필드 추가.
  `Attachment = { path: string; name: string; mime: string; size: number }`. `path`는 비공개
  버킷 내 저장 경로(공개 URL 아님).
- **Acceptance Criteria**: 타입이 추가되고 기존 메모(첨부 없음)도 정상 동작한다.
- **Verification**: (TEST) `attachments`가 optional이며 기존 엔트리 파싱에 영향 없음을 단위 테스트로 확인.

### REQ-002: 첨부 업로드 API
- **Priority**: Must
- **Description**: `POST /api/crm/students/[id]/attachment` (multipart, `file` 1개).
  `x-admin-key` 인증. 비공개 버킷 `crm-attachments`에 `${studentId}/${uuid}-${safeName}`로 업로드.
  허용: `image/*` 및 `application/pdf`. 최대 10MB. 응답 `{ data: { path, name, mime, size } }`.
  메모는 변경하지 않음(클라이언트가 staged 후 메모 저장 시 함께 전송 — call-recording 패턴과 동일).
- **Acceptance Criteria**: 유효 이미지 업로드 시 201과 path 반환. 미허용 타입/초과 크기/미인증은 4xx.
- **Verification**: (TEST) 인증 실패 401, 미허용 mime 400, 정상 업로드 path 반환을 테스트.

### REQ-003: 첨부 서명 URL 조회 API
- **Priority**: Must
- **Description**: `GET /api/crm/students/[id]/attachment?path=<path>` — `x-admin-key` 인증.
  `path`가 `${studentId}/`로 시작하는지 검증(다른 학생 파일 접근/경로 탈출 방지) 후 단기(예: 1시간)
  서명 URL 생성, `{ data: { url } }` 반환.
- **Acceptance Criteria**: 본인 학생 경로면 서명 URL 반환. 다른 학생 경로/미인증은 4xx.
- **Verification**: (TEST) prefix 불일치 path 403, 미인증 401, 정상 시 url 반환을 테스트.

### REQ-004: 메모 저장 시 첨부 영속화
- **Priority**: Must
- **Description**: `POST /api/crm/students/[id]/memo` body에 optional `attachments: Attachment[]`
  허용. 형식 검증(배열, 각 항목 path/name/mime/size 타입) 후 새 `ConsultationEntry`에 저장.
  `raw_memo`가 비어도 첨부가 있으면 저장 허용(캡처만 공유하는 경우).
- **Acceptance Criteria**: 첨부 포함 저장 시 엔트리에 attachments가 보존되어 반환된다.
  잘못된 attachments 형식은 400.
- **Verification**: (TEST) 첨부 포함 저장→반환 엔트리에 attachments 존재, 형식 오류 400을 테스트.

### REQ-005: 메모 입력 UI — 클립보드 붙여넣기 + 파일 첨부
- **Priority**: Must
- **Description**: `MemoSection`에 (1) textarea `onPaste`로 클립보드 이미지 캡처→자동 업로드,
  (2) "파일 첨부" 버튼(파일 선택), (3) staged 첨부 목록(이미지 썸네일·파일 칩·삭제 버튼·업로드 중 표시).
  메모 저장 시 staged 첨부를 함께 전송하고 저장 후 초기화. 첨부만 있고 텍스트 없어도 저장 버튼 활성화.
- **Acceptance Criteria**: 캡처 이미지를 메모란에 붙여넣으면 미리보기가 뜨고, 저장하면 타임라인 엔트리에
  첨부가 포함된다.
- **Verification**: (BROWSER) Playwright로 클립보드 이미지 paste→썸네일 표시→저장→타임라인 노출 확인.

### REQ-006: 타임라인에서 첨부 표시
- **Priority**: Must
- **Description**: `TimelineEntry`에서 엔트리의 attachments를 렌더. 이미지는 서명 URL을 lazy-fetch해
  썸네일(클릭 시 새 탭/원본), 그 외 파일은 다운로드 칩으로 표시. 서명 URL은 REQ-003 API로 획득.
- **Acceptance Criteria**: 첨부 있는 과거 엔트리를 열면 썸네일/칩이 보이고 클릭 시 원본 열림.
- **Verification**: (BROWSER) 첨부 포함 엔트리가 타임라인에서 썸네일로 보이는지 확인.

## Technical Design

### Architecture
- 타입: `src/types/crm.ts` — `Attachment` 추가, `ConsultationEntry.attachments?`.
- 버킷 헬퍼: `src/lib/crm-attachment-store.ts` — `ensureAttachmentBucket()` (call-recording-store 패턴).
  상수(`ATTACHMENT_BUCKET`, 허용 mime, 최대 크기)는 `src/lib/crm-attachment.ts`.
- API:
  - `src/app/api/crm/students/[id]/attachment/route.ts` — POST(업로드), GET(서명 URL).
  - `src/app/api/crm/students/[id]/memo/route.ts` — body에 attachments 수용(기존 파일 수정).
- 클라이언트:
  - `hooks/useMemoAttachments.ts` — staged 첨부 상태/업로드/삭제.
  - `sections/MemoSection.tsx` — paste 핸들러, 파일 입력, staged 목록(수정).
  - `sections/AttachmentList.tsx` (신규) — 서명 URL lazy-fetch 썸네일/칩 (타임라인·staged 공용 가능).
  - `hooks/useMemoSection.ts` — handleAddMemo가 attachments 전송(수정).
  - `StudentDetailPanel.tsx` — MemoSection에 attachments props 연결(수정).
- 포털: 변경 없음(이미 `ai_purified`만 노출).

### Dependencies
- 기존 `@supabase` admin 클라이언트(`supabaseAdmin`), `crypto.randomUUID`. 신규 npm 의존성 없음.

## Traceability Matrix

| REQ ID  | Description                  | Verification | Test File                                              | Status  |
|---------|------------------------------|--------------|--------------------------------------------------------|---------|
| REQ-001 | Attachment 타입 추가          | (TEST)       | `src/lib/__tests__/crm-attachment.test.ts`             | Done    |
| REQ-002 | 첨부 업로드 API (mime/크기)   | (TEST)       | `src/lib/__tests__/crm-attachment.test.ts`             | Done    |
| REQ-003 | 서명 URL 경로 검증            | (TEST)       | `src/lib/__tests__/crm-attachment.test.ts`             | Done    |
| REQ-004 | 메모 저장 첨부 파싱           | (TEST)       | `src/lib/__tests__/crm-attachment.test.ts`             | Done    |
| REQ-005 | 메모 입력 paste/첨부 UI       | (BROWSER)    | 수동 — 관리자 CRM 패널에서 확인                          | Pending |
| REQ-006 | 타임라인 첨부 표시            | (BROWSER)    | 수동 — 관리자 CRM 패널에서 확인                          | Pending |

> 검증 메모: 라우트 검증·파싱 로직은 순수 함수로 추출해 17개 단위 테스트 통과(저장소 관행에 맞춤).
> 업로드/서명 라우트는 `tsc`·lint 통과 + 실행 서버에서 401 인증 enforcement 스모크 확인.
> REQ-005/006 브라우저 검증은 Playwright MCP 미가용 + 실제 학생 데이터에 메모가 생성되므로
> 운영자가 관리자 CRM 패널에서 직접 확인하는 것을 권장.

## Implementation Order

1. REQ-001 — 타입이 모든 계층의 계약.
2. REQ-002, REQ-003 — 저장/조회 API (서버 기반).
3. REQ-004 — 메모 저장이 attachments 수용 (REQ-001 의존).
4. REQ-005 — 입력 UI (REQ-002/004 의존).
5. REQ-006 — 표시 UI (REQ-003 의존).

## Out of Scope

- 첨부 파일 보관기간/자동 삭제(call-recording의 30일 purge) — 후속.
- AI care가 이미지를 분석/요약하는 것 — raw_memo 텍스트만 AI 처리.
- 학부모 포털에 첨부 노출.
- 파일 형식 무제한 허용(현재 image/* + pdf만).
