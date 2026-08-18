# Plaud 다계정 지원 — 통합 목록 + 상담자 태그

## Overview

Plaud 녹음→CRM 상담메모 기능이 지금은 단일 Plaud 계정만 지원한다. 동료(병윤)가 Plaud 기기를 새로 구매해, 두 사람이 각자 자기 계정으로 고객 통화를 녹음하고 같은 CRM에 상담메모로 남기려 한다. CRM 프로덕션 버튼은 Claude Code의 `mcp__plaud__*`가 아니라 `src/lib/plaud-client.ts`가 Plaud 개발자 refresh token으로 호스티드 서버에 직접 붙는 구조다. 따라서 토큰 저장소·클라이언트·라우트·UI를 다계정으로 확장하고, 두 계정 녹음을 하나의 통합 목록으로 보여주며 각 항목에 소유자 라벨을 붙이고, 생성 메모에 상담자(author)를 기록한다.

전체 설계 근거와 운영 절차는 승인된 계획 `~/.claude/plans/plaud-cheerful-clarke.md` 참조.

## Requirements

### REQ-001: integration_tokens 다계정 스키마
- **Priority**: Must
- **Description**: `integration_tokens`를 `(provider, account_key)` 복합 PK로 확장하고 기존 단일 행을 `account_key='me'`로 백필한다. 마이그레이션 파일 `supabase/migrations/105_integration_tokens_multi_account.sql`. RLS(정책 없음, service_role 전용) 유지.
- **Acceptance Criteria**: 마이그레이션 적용 후 기존 행이 `account_key='me'`로 남아 있고, `(provider='plaud', account_key='byungyun')` 행을 추가로 upsert할 수 있다.
- **Verification**: (MANUAL) 사용자가 Supabase에서 105 적용 후 `select provider, account_key from integration_tokens`로 기존 행이 'me'로 백필됐는지 확인.

### REQ-002: 토큰 저장소 계정 인식
- **Priority**: Must
- **Description**: `src/lib/plaud-token-store.ts`의 `readStoredRefreshToken`/`writeStoredRefreshToken`에 `accountKey` 파라미터를 추가한다. select/upsert에 `account_key` 조건을 병기하고 upsert는 `onConflict: 'provider,account_key'`. Supabase 미구성·오류 시 read→null, write→noop 폴백 유지.
- **Acceptance Criteria**: 특정 accountKey로 저장한 토큰은 같은 accountKey로만 읽히고, 다른 accountKey 조회에는 영향 없다.
- **Verification**: (TEST) accountKey별 read/write 격리와 오류 폴백을 검증하는 단위 테스트.

### REQ-003: plaud-client 계정 로스터 + 계정별 인증/조회
- **Priority**: Must
- **Description**: `src/lib/plaud-client.ts`에 계정 로스터 상수(`{key,label,seedEnv}[]`)와 `getAccountLabel`/`listPlaudAccountKeys` 헬퍼를 추가한다. access token 캐시를 계정별 Map으로, `getPlaudAccessToken(accountKey)`가 로스터의 seed env를 사용하고 회전 토큰을 해당 accountKey로 저장하도록 한다. `plaudMcpCall`/`listPlaudRecordings`/`getPlaudFile`에 `accountKey` 파라미터를 추가하고 `PlaudRecording`에 옵셔널 `account_key`/`owner_label`을 추가한다. 'me'는 기존 `PLAUD_REFRESH_TOKEN`을 seed로 재사용(하위호환).
- **Acceptance Criteria**: 서로 다른 accountKey 호출이 각자의 seed env·저장소 토큰·캐시를 사용하며 서로 간섭하지 않고, 회전된 refresh_token이 올바른 accountKey로 저장된다.
- **Verification**: (TEST) accountKey별 토큰 해석·캐시 격리·회전 저장을 검증하는 단위 테스트.

### REQ-004: 녹음 목록 다계정 병합
- **Priority**: Must
- **Description**: `src/app/api/crm/plaud/recordings/route.ts`가 `listPlaudAccountKeys()`를 순회하며 각 계정 목록을 병렬 조회하고, 각 녹음에 `account_key`/`owner_label`을 태깅한 뒤 `start_at ?? created_at` 내림차순으로 병합·정렬해 반환한다. 일부 계정 실패는 로그 후 건너뛰고 전 계정 실패 시에만 502. `q`/날짜 필터는 모든 계정에 동일 전달.
- **Acceptance Criteria**: 두 계정 녹음이 하나의 시간순 배열로 병합되고 각 항목에 소유자 라벨이 붙으며, 한 계정이 실패해도 나머지 계정 결과는 반환된다.
- **Verification**: (TEST) 병합·정렬·태깅과 부분 실패 격리를 검증하는 라우트 단위 테스트.

### REQ-005: 상담메모 라우트 계정 지정 + 작성자 기록
- **Priority**: Must
- **Description**: `src/app/api/crm/students/[id]/plaud-memo/route.ts` body에 `account_key`를 추가해 `getPlaudFile(fileId, accountKey)`에 전달하고, 서버에서 `getAccountLabel(account_key)`로 `author`를 확정해 `appendConsultationEntry`에 넘긴다(클라이언트 라벨 불신). `file_id`가 오면 `account_key`도 필수(없으면 400). `audio_url` 직접 경로는 author 없이 하위호환.
- **Acceptance Criteria**: `{file_id, account_key}` 요청으로 생성된 메모의 `author`가 해당 계정 라벨로 채워지고, `file_id`만 있고 `account_key`가 없으면 400을 반환한다.
- **Verification**: (TEST) author 채움과 account_key 누락 400을 검증하는 라우트 단위 테스트.

### REQ-006: 피커 2단계 흐름(직원 선택 → 녹음 선택)
- **Priority**: Should
- **Description**: 사용자 요청으로 **통합 목록 대신 2단계**로 변경. `PlaudRecordingPicker.tsx`는 마운트 시 `GET /api/crm/plaud/accounts`로 직원 계정(key+label)을 받아 1단계에서 직원(이민재/김우영)을 고르게 하고(계정 1개면 자동 스킵), 2단계에서 `GET .../recordings?account_key=<선택>`로 그 직원 녹음만 조회한다. `pick(r)` POST body에 선택 직원의 `account_key`를 포함한다. 신규 엔드포인트 `GET /api/crm/plaud/accounts`(`listPlaudAccounts` 반환)와 recordings 라우트의 `account_key` 단일조회 파라미터를 추가한다.
- **Acceptance Criteria**: 계정 2개면 직원 선택 화면이 먼저 뜨고, 직원 선택 시 그 계정 녹음만 조회되며, 녹음 선택 시 그 직원 account_key로 상담메모가 생성되고 타임라인에 작성자(직원명)가 기록된다. 계정 1개면 선택 단계를 건너뛴다.
- **Verification**: (BROWSER) dev 서버에서 학생 패널 → Plaud 녹음 → 직원 선택(이민재/김우영) → 해당 직원 녹음 목록 → 한 건 선택 후 상담메모 초안에 author가 기록되는지 확인(Playwright MCP 스크린샷).

## Technical Design

### Architecture
계정 로스터(키·라벨·seed env)는 코드 상수(단일 소스). Supabase는 계정별 회전 refresh_token만 저장. 기존 `PLAUD_REFRESH_TOKEN`은 'me' seed로 재사용해 부트스트랩 chicken-egg를 피한다. 흐름: recordings 라우트가 로스터를 순회해 병합 목록 반환 → 피커가 소유자 칩과 함께 렌더 → 선택 시 `{file_id, account_key}` POST → 라우트가 계정별 오디오 해석 + author 기록 → `appendConsultationEntry`로 `students.consultation_timeline` append.

핵심 파일: `plaud-token-store.ts`, `plaud-client.ts`, `api/crm/plaud/recordings/route.ts`, `api/crm/students/[id]/plaud-memo/route.ts`, `components/panel/PlaudRecordingPicker.tsx`, `supabase/migrations/105_*.sql`, `.env.example`.

### Dependencies
Plaud 개발자 OAuth refresh token(병윤 계정), Supabase `integration_tokens`, 기존 OpenAI STT + Qwen 요약 파이프라인(`plaud-process.ts`). `ConsultationEntry.author`는 이미 존재.

## Traceability Matrix

| REQ ID  | Description                          | Verification | Test File                                                        | Status  |
|---------|--------------------------------------|--------------|------------------------------------------------------------------|---------|
| REQ-001 | integration_tokens 복합 PK 마이그레이션 | (MANUAL)     | Supabase 수동 확인                                                | 코드완료·적용대기 |
| REQ-002 | 토큰 저장소 계정 인식                  | (TEST)       | `src/lib/__tests__/plaud-token-store.test.ts` (5)                | Done    |
| REQ-003 | plaud-client 로스터 + 계정별 인증      | (TEST)       | `src/lib/__tests__/plaud-client.test.ts` (13)                    | Done    |
| REQ-004 | 녹음 목록 다계정 병합                  | (TEST)       | `src/app/api/crm/plaud/recordings/__tests__/route.test.ts` (5)   | Done    |
| REQ-005 | 상담메모 라우트 계정 지정 + author      | (TEST)       | `src/app/api/crm/students/[id]/plaud-memo/__tests__/route.test.ts` (11) | Done |
| REQ-006 | 피커 2단계(직원선택→녹음) + accounts 엔드포인트 | (BROWSER) | `.../panel/__tests__/PlaudRecordingPicker.test.tsx` (3) + `.../plaud/accounts/__tests__/route.test.ts` (2) + 실사 대기 | 단위완료·실사대기 |

## Implementation Order

1. REQ-001 — 스키마가 저장소의 전제(사용자가 Supabase에 적용).
2. REQ-002 — 저장소 계정 인식(REQ-001 스키마 위에서 동작).
3. REQ-003 — 클라이언트가 REQ-002 저장소를 계정별로 사용.
4. REQ-004 — 목록 라우트가 REQ-003 클라이언트로 병합.
5. REQ-005 — 메모 라우트가 REQ-003 클라이언트 + author 기록.
6. REQ-006 — 피커가 REQ-004/005 API를 소비(마지막 브라우저 검증).

## Out of Scope

- 완전자동 학생↔녹음 매칭(전화번호 매칭 등) — 기존과 동일하게 수동 선택.
- 계정 선택 토글 UI — 통합 목록으로 대체.
- Claude Code `mcp__plaud__*` / `/plaud-to-memo` CLI 경로 다계정화(프로덕션 버튼과 무관).
- 3명 이상 확장 시 로스터를 DB 관리로 옮기는 리팩터(현재 2명이라 불필요).
