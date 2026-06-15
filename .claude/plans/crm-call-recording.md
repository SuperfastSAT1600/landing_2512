# CRM 통화 녹음 → 자동 상담 메모 (Phase 1 MVP)

## Overview

상담사가 전화 통화 내용을 직접 타이핑해 상담 메모를 남기는 데 시간이 많이 든다. 통화를 스피커폰으로 진행하고 CRM(노트북/PC)에서 녹음하면, 그 오디오를 자동 전사·요약해 상담 메모 초안으로 채워주는 기능을 만든다.

핵심 전제: 브라우저는 통화 스트림 자체를 못 가져오므로(특히 iOS/보이스톡), **스피커폰 + CRM이 열린 별도 기기(노트북/PC)의 마이크**로 공기 중 소리를 녹음한다. 두 채널(아이폰 통화/카톡 보이스톡) 모두 동일하게 처리된다.

UX 원칙: **사람 검토 유지** — AI 요약은 메모 입력란에 자동으로 채워지고, 상담사가 확인·수정 후 기존 "메모 저장"으로 확정한다.

## 결정 사항 (사용자 확인)
- 기기: 노트북/PC + 폰 스피커폰
- 엔진: **Gemini 단독** (오디오 → 한국어 전사+요약 1콜). `GEMINI_API_KEY` 보유, `@google/generative-ai` 설치됨.
- 원본 오디오: 요약 생성 후 **30일** 뒤 자동 삭제.

## Requirements

### REQ-001: 통화 녹음 → 요약 API
- **Priority**: Must
- **Description**: `POST /api/crm/students/[id]/call-recording` (multipart: audio file). 오디오를 비공개 Storage 버킷에 저장하고, `call_recordings` 행을 만들고(expires_at = now+30d), Gemini로 한국어 전사+구조화 요약을 생성해 반환한다. 자동 저장은 하지 않음(사람 검토).
- **Acceptance Criteria**: 유효 오디오 업로드 시 200 + `{ data: { summary } }`. 인증 필수, mime/용량 검증.
- **Verification**: (TEST) 검증·만료시각 계산 단위 테스트. (MANUAL) 실제 짧은 한국어 오디오로 전사+요약 확인.

### REQ-002: Gemini 전사+요약 라이브러리
- **Priority**: Must
- **Description**: `transcribeAndSummarizeCall(buffer, mimeType)` — 오디오 인라인 입력 → 한국어 상담 메모 초안(핵심 니즈 / 우려·이의 / 합의 사항 / 다음 액션) 텍스트 반환.
- **Verification**: (MANUAL) 실제 오디오 스모크 테스트.

### REQ-003: 녹음 UI (메모 섹션)
- **Priority**: Must
- **Description**: 상담 메모 섹션에 `통화 녹음`/`정지` 버튼 + 경과 시간·"정리 중" 상태. 정지 시 업로드→요약, 결과를 메모 입력란에 채움(기존 텍스트 있으면 줄바꿈 후 추가). 마이크 권한·오류 처리.
- **Verification**: (BROWSER/MANUAL) 로컬에서 실제 마이크로 녹음→요약→메모란 채움 확인.

### REQ-004: 원본 오디오 보관/삭제
- **Priority**: Must
- **Description**: `call_recordings` 테이블(student_id, storage_path, duration_sec, status, expires_at, purged_at). `POST /api/crm/call-recordings/cleanup`로 만료분 Storage 삭제 + status='purged'. (자동 스케줄은 Phase 2)
- **Verification**: (TEST) 만료 판정 로직. (MANUAL) cleanup 호출 시 만료 행 처리 확인.

## Technical Design
- 신규 마이그레이션 `supabase/migrations/056_call_recordings.sql` (develop 최신 054, PR #110의 055와 충돌 회피 위해 056).
- 비공개 Storage 버킷 `call-recordings` — 라우트에서 없으면 자동 생성(createBucket, public:false).
- 신규: `src/lib/gemini-transcribe.ts`, `src/app/api/crm/students/[id]/call-recording/route.ts`, `src/app/api/crm/call-recordings/cleanup/route.ts`, `src/app/admin/crm/components/panel/hooks/useCallRecording.ts`.
- 수정: `panel/sections/MemoSection.tsx`(버튼/상태 props), `panel/StudentDetailPanel.tsx`(useCallRecording 연결).
- 재사용: 업로드 패턴(`api/admin/upload`), 메모 적재 흐름(`students/[id]/memo` + 기존 "메모 저장"), 에러 메시지 헬퍼 패턴.
- 오디오: MediaRecorder, 저비트레이트(~32kbps)로 파일을 작게 → Gemini 인라인(요청 20MB 한도) 내 처리. 서버 용량 캡(예: 20MB) 초과 시 거절(긴 통화 File API는 Phase 2).
- 런타임: route `runtime = 'nodejs'`, `maxDuration` 상향(전사 지연 대비).

## Traceability Matrix
| REQ ID  | Description            | Verification    | Test/검증                              | Status  |
|---------|------------------------|-----------------|----------------------------------------|---------|
| REQ-001 | 녹음→요약 API          | (TEST)+(MANUAL) | route 검증 단위테스트 + 스모크         | Pending |
| REQ-002 | Gemini 전사+요약 lib   | (MANUAL)        | 실제 오디오 스모크                     | Pending |
| REQ-003 | 녹음 UI                | (BROWSER)       | 로컬 마이크 수동 확인                  | Pending |
| REQ-004 | 보관/삭제              | (TEST)+(MANUAL) | 만료 로직 단위테스트 + cleanup 확인    | Pending |

## Implementation Order
1. REQ-004 테이블/마이그레이션 → 2. REQ-002 Gemini lib → 3. REQ-001 라우트 → 4. REQ-003 UI.

## Out of Scope (Phase 2)
- 화자 분리(상담사/고객 라벨), 긴 통화 File API 업로드, 자동 스케줄 cleanup(cron), ai-care 정리본 자동 연동, 실시간(통화 중) 전사.
- 통화 스트림 직접 캡처(브라우저 불가).

## 비고
- 법적: 본인이 당사자인 통화 녹음은 합법(통신비밀보호법). 신뢰 차원 고객 안내 멘트 권장.
- 현재 Anthropic 크레딧 고갈과 무관(Gemini 사용).
