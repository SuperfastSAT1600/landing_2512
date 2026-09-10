# 한 녹음 · 여러 상담메모 — 전사 중복 처리

## Overview

전사 백필 dry-run(78건 후보) 결과, 같은 Plaud 녹음이 서로 다른 상담메모 2건에 매칭되는
경우가 3건 나왔다. 세 경우 모두 매처 오류가 아니라 실제 운영 상황이다.

| 녹음 | 상황 |
|------|------|
| `75793f80…` | 김예나02 — 같은 녹음으로 메모를 8/26, 8/28 두 번 생성 |
| `1d1226c4…` | 연수빈 — 같은 녹음으로 6분 간격 메모 두 번 |
| `61a6d4c0…` | 엄채원 / 엄채영 — "엄채영,엄채윤 어머니" 한 통화를 자매 두 학생 레코드에 각각 기록 |

마이그레이션 119의 `UNIQUE (source, external_id)`는 "녹음 1건 = 행 1건"을 강제한다.
실제 모델은 "녹음 1건 = 상담메모 N건"이므로 제약이 도메인과 어긋난다. 현 상태로 전량
백필하면 3건이 삽입 실패하고, 자매 케이스에서 엄채원은 전사를 영영 못 받는다.
게다가 실패는 ASR 호출 **이후**에 발생하므로(`transcribeAndInsert`: 전사 → 삽입)
중복 건마다 과금만 하고 버린다.

부수적으로, 백필 스크립트는 `dotenv.config()`가 import 평가 뒤에 실행돼
`supabase-admin.ts`의 모듈 최상위 `createClient`가 빈 env를 먼저 읽고 죽는다.
문서에 적힌 `npx tsx scripts/backfill-call-transcripts.ts` 그대로는 실행 자체가 불가능하다.

## Requirements

### REQ-001: 유니크 제약을 상담메모 단위로 교정
- **Priority**: Must
- **Description**: `UNIQUE (source, external_id)` → `UNIQUE (source, external_id, timeline_entry_id)`.
  같은 녹음이 여러 상담메모에 붙는 것은 허용하고, 같은 메모에 같은 녹음이 두 번 붙는 것만 막는다.
  `timeline_entry_id IS NULL`인 행(수동 입력 등)은 제약 대상에서 제외한다.
- **Acceptance Criteria**: 같은 `external_id`를 서로 다른 `timeline_entry_id`로 두 번 삽입하면 둘 다 성공한다.
  같은 `(external_id, timeline_entry_id)` 조합의 두 번째 삽입은 유니크 위반으로 거부된다.
- **Verification**: (MANUAL) Supabase에 적용 후 삽입 2건 시도

### REQ-002: 이미 전사된 녹음은 ASR을 다시 호출하지 않는다
- **Priority**: Must
- **Description**: `transcribeAndInsert`가 전사 전에 `(source, external_id)`로 기존 전사를 조회하고,
  있으면 그 텍스트를 재사용해 새 상담메모 행만 만든다. 전사 내용은 녹음의 속성이지
  메모의 속성이 아니므로, 같은 오디오를 두 번 전사할 이유가 없다.
- **Acceptance Criteria**: 같은 녹음에 걸린 후보가 N건이면 ASR 호출은 1회, 삽입은 N회.
- **Verification**: (TEST) `src/lib/__tests__/plaud-backfill-run.test.ts`

### REQ-003: 재사용 행도 원본과 같은 메타데이터를 갖는다
- **Priority**: Must
- **Description**: 재사용 시 `asr_model`은 기존 행의 값을 그대로 승계한다.
  재전사한 것이 아니므로 현재 실행의 모델명을 찍으면 거짓 기록이 된다.
- **Acceptance Criteria**: 재사용으로 만들어진 행의 `asr_model`이 원본 행과 동일하다.
- **Verification**: (TEST) `src/lib/__tests__/plaud-backfill-run.test.ts`

### REQ-004: 백필 스크립트가 문서대로 실행된다
- **Priority**: Must
- **Description**: `dotenv.config()`를 env 의존 모듈 로드보다 먼저 끝낸다.
  주석의 실행 예시(`npx tsx scripts/backfill-call-transcripts.ts --dry-run`)가 그대로 동작해야 한다.
- **Acceptance Criteria**: `--env-file` 같은 외부 플래그 없이 `--dry-run`이 완주한다.
- **Verification**: (MANUAL) 실행

## Technical Design

### Architecture

| 계층 | 파일 | 변경 |
|------|------|------|
| Schema | `supabase/migrations/120_call_transcripts_entry_unique.sql` | 신규 (REQ-001) |
| Lib | `src/lib/call-transcripts.ts` | `findTranscriptByExternalId()` 추가 — 읽기 경로 1개 (REQ-002) |
| Lib | `src/lib/plaud-backfill-run.ts` | `BackfillDeps.findExisting` 주입, 전사 전 조회 (REQ-002/003) |
| Script | `scripts/backfill-call-transcripts.ts` | deps 연결 + dotenv 순서 교정 (REQ-002/004) |

`call-transcripts.ts`는 "읽기 경로를 의도적으로 두지 않는다"고 적혀 있다. 여기서 추가하는
읽기는 UI 노출용이 아니라 중복 방지용이며, service_role 서버 경로에만 존재한다.
그 의도(클라이언트 노출 금지)와 충돌하지 않으므로 주석을 갱신해 범위를 명시한다.

dotenv 순서는 스크립트 안에서 동적 import로 해결한다. `supabase-admin.ts`의 export 형태를
바꾸면 앱 전역(라우트 다수)이 영향을 받으므로, 문제를 만든 쪽인 스크립트에서 닫는다.

### Dependencies

새 패키지 없음. 기존 Supabase service_role / Qwen `fun-asr` / Plaud MCP 그대로.

## Traceability Matrix

| REQ ID  | Description                        | Verification | Test File                                        | Status  |
|---------|------------------------------------|--------------|--------------------------------------------------|---------|
| REQ-001 | 유니크 제약 메모 단위로 교정        | (MANUAL)     | Supabase 적용 후 삽입 검증                        | Pending |
| REQ-002 | 기존 전사 재사용 — ASR 1회          | (TEST)       | `src/lib/__tests__/plaud-backfill-run.test.ts`    | Pending |
| REQ-003 | 재사용 행 asr_model 승계            | (TEST)       | `src/lib/__tests__/plaud-backfill-run.test.ts`    | Pending |
| REQ-004 | 스크립트 dotenv 순서 교정           | (MANUAL)     | `--dry-run` 실행                                  | Pending |

## Implementation Order

1. REQ-001 — 제약이 풀려야 재사용 삽입이 성공한다. 나머지가 전부 여기 걸려 있다.
2. REQ-002 — 재사용 로직. 실패 원인(중복 삽입)과 낭비(재전사)를 동시에 없앤다.
3. REQ-003 — REQ-002가 만든 행의 정확성 보정.
4. REQ-004 — 독립적. 실행 가능성 회복.

## Out of Scope

- **중복 상담메모 정리.** 김예나02·연수빈의 두 번 생성된 메모는 CRM 데이터 문제지
  전사 보관의 문제가 아니다. 별도 판단 사항으로 남긴다.
- **미매칭 2건 복구.** "추동민 어머님_첫 세일즈콜", "이제범 어머님_유선 전화"는 Plaud 목록에
  대응 녹음이 없다. 녹음이 삭제됐거나 다른 계정에 있을 수 있다 — 조사 필요, 코드 문제 아님.
- **전사 보존 정책(TTL/purge).** 119 스펙에서 이미 flagged 상태.
- **전사 UI 노출.** 여전히 캡처 전용.
