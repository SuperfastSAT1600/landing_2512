# 진단테스트 토큰 관리 (삭제 + 만료일시 수정)

## Overview

어드민 페이지에서 발급된 진단테스트 접속 코드(토큰)를 삭제하거나 만료 일시를 수정할 수 있는 기능. 현재 토큰은 생성만 가능하고 관리(수정/삭제)가 불가능하여, 잘못 발급하거나 만료일을 연장해야 할 때 DB를 직접 수정해야 하는 문제를 해결한다.

## Requirements

### REQ-001: 토큰 삭제 API (DELETE endpoint)
- **Priority**: Must
- **Description**: `DELETE /api/admin/diagnosis/tokens/[id]` 엔드포인트를 추가하여 토큰을 삭제(soft delete: `is_active = false`)할 수 있도록 한다. 이미 시험을 완료한(completed) 토큰은 삭제를 거부한다.
- **Acceptance Criteria**: 
  - pending/expired 상태 토큰: DELETE 요청 시 `is_active = false`로 업데이트, 200 응답
  - completed 상태 토큰: DELETE 요청 시 409 Conflict 응답 (시험 결과 보존)
  - 존재하지 않는 ID: 404 응답
  - 인증 실패: 401 응답
- **Verification**: (TEST) `src/__tests__/api/admin/diagnosis/tokens/delete.test.ts`

### REQ-002: 토큰 만료일시 수정 API (PATCH endpoint)
- **Priority**: Must
- **Description**: `PATCH /api/admin/diagnosis/tokens/[id]` 엔드포인트를 추가하여 토큰의 `expires_at`을 수정할 수 있도록 한다. completed 토큰도 만료일 수정은 허용한다(의미 없지만 에러를 낼 필요도 없음).
- **Acceptance Criteria**:
  - 유효한 ISO datetime으로 PATCH 시 `expires_at` 업데이트, 200 응답
  - 과거 일시도 허용 (즉시 만료 처리 용도)
  - 잘못된 날짜 형식: 400 응답
  - `expiresAt` 필드 누락: 400 응답
  - 존재하지 않는 ID: 404 응답
  - 인증 실패: 401 응답
- **Verification**: (TEST) `src/__tests__/api/admin/diagnosis/tokens/patch.test.ts`

### REQ-003: 어드민 UI — 토큰 목록에 삭제 버튼 추가
- **Priority**: Must
- **Description**: 토큰 목록 테이블의 각 행에 삭제 버튼을 추가한다. 클릭 시 확인 대화상자를 표시하고 확인 후 DELETE API를 호출한다. completed 상태 토큰은 삭제 버튼을 비활성화한다.
- **Acceptance Criteria**:
  - pending/expired 행에 활성화된 삭제 버튼 표시
  - completed 행에 비활성화된 삭제 버튼 (또는 버튼 숨김)
  - 삭제 클릭 시 "정말 삭제하시겠습니까?" 확인 대화상자
  - 확인 후 API 호출, 성공 시 목록 자동 새로고침
  - 실패 시 에러 메시지 표시
- **Verification**: (BROWSER) Playwright로 삭제 버튼 클릭 → confirm → 목록에서 제거 확인

### REQ-004: 어드민 UI — 만료일시 인라인 수정
- **Priority**: Must
- **Description**: 토큰 목록의 만료일시 셀을 클릭하면 `datetime-local` 입력으로 전환되어 인라인 수정이 가능하도록 한다. 변경 후 blur 또는 Enter 시 PATCH API를 호출한다.
- **Acceptance Criteria**:
  - 만료일시 셀 클릭 시 `datetime-local` 입력으로 전환
  - 날짜 변경 후 blur/Enter 시 PATCH API 호출
  - 성공 시 새 만료일시 즉시 반영 (목록 새로고침 또는 로컬 상태 업데이트)
  - 실패 시 원래 값 복원 + 에러 메시지
  - Escape 키 시 수정 취소
- **Verification**: (BROWSER) Playwright로 만료일시 클릭 → 날짜 변경 → 반영 확인

### REQ-005: 액션 컬럼 추가 및 테이블 레이아웃 정리
- **Priority**: Should
- **Description**: 기존 테이블에 "관리" 컬럼을 추가하여 삭제 버튼을 배치한다. 테이블이 모바일에서도 사용 가능하도록 `overflow-x-auto`를 유지한다.
- **Acceptance Criteria**:
  - 테이블 마지막 컬럼에 "관리" 헤더
  - 반응형 유지 (가로 스크롤)
- **Verification**: (BROWSER) 다양한 뷰포트에서 레이아웃 확인

## Technical Design

### Architecture

**API Layer** — Next.js App Router dynamic route 추가:
- 새 파일: `src/app/api/admin/diagnosis/tokens/[id]/route.ts`
  - `DELETE` handler: soft delete (`is_active = false`)
  - `PATCH` handler: `expires_at` 업데이트

**기존 파일 수정**:
- `src/app/admin/diagnosis/components/GenerateTokenTab.tsx`: 테이블에 인라인 수정 + 삭제 버튼 추가

**인증**: 기존 `isAuthenticated(request)` 패턴 재사용 (`x-admin-key` 헤더)

**Soft Delete 방식 선택 이유**:
- 토큰은 `diagnostic_test_results.token_id`로 FK 참조될 수 있으므로 hard delete는 위험
- `is_active = false`로 설정하면 기존 GET API에서 이미 조회되므로 동작 변경 불필요
- GET API에서는 이미 모든 토큰을 조회하고 있음 (is_active 필터 없음) → soft delete된 토큰은 expired 상태로 표시됨
- **추가 고려**: soft delete 후 GET에서 `is_active = false`인 토큰을 필터링할지, 그대로 보여줄지 결정 필요. 현재 GET은 필터 없이 전부 가져오므로, soft delete 후에도 목록에 남음 → **GET API에 `is_active` 필터 추가 권장** (삭제된 토큰은 목록에서 제거)

### DB 테이블 구조 (기존, 변경 없음)

```
diagnostic_access_tokens:
  id            UUID PK
  token         TEXT (6자리 코드)
  student_email TEXT (nullable)
  student_name  TEXT
  phone_number  TEXT (nullable)
  test_id       TEXT
  test_version_id UUID (nullable, FK)
  expires_at    TIMESTAMPTZ
  is_active     BOOLEAN
  used_at       TIMESTAMPTZ (nullable)
  created_at    TIMESTAMPTZ
  time_limit_minutes INTEGER
```

DB 스키마 변경은 불필요하다. `is_active` 컬럼이 이미 존재하므로 soft delete에 활용한다.

### Dependencies

- 기존 `@/lib/server-auth` (`isAuthenticated`)
- 기존 `@/lib/supabase` (`supabaseAdmin`)
- 추가 패키지 불필요

## Traceability Matrix

| REQ ID  | Description                  | Verification | Test/Check Location                                           | Status  |
|---------|------------------------------|--------------|---------------------------------------------------------------|---------|
| REQ-001 | 토큰 삭제 API (DELETE)        | (TEST)       | `src/__tests__/api/admin/diagnosis/tokens/delete.test.ts`     | Pending |
| REQ-002 | 토큰 만료일시 수정 API (PATCH) | (TEST)       | `src/__tests__/api/admin/diagnosis/tokens/patch.test.ts`      | Pending |
| REQ-003 | UI — 삭제 버튼                | (BROWSER)    | Playwright spot-check                                         | Pending |
| REQ-004 | UI — 만료일시 인라인 수정      | (BROWSER)    | Playwright spot-check                                         | Pending |
| REQ-005 | 액션 컬럼 + 레이아웃          | (BROWSER)    | Playwright viewport test                                      | Pending |

## Implementation Order

1. **REQ-001** — DELETE API 먼저 구현. UI가 호출할 엔드포인트가 먼저 존재해야 한다.
2. **REQ-002** — PATCH API 구현. 같은 `[id]/route.ts` 파일에 함께 작성하므로 REQ-001과 동시 구현 가능.
3. **REQ-005** — 테이블에 "관리" 컬럼 구조 추가 (빈 셀로).
4. **REQ-003** — 삭제 버튼 UI 구현. REQ-001 API 필요.
5. **REQ-004** — 인라인 만료일시 수정 UI 구현. REQ-002 API 필요.

실질적으로 Step 1-2는 하나의 파일에서 동시 구현 가능하고, Step 3-5는 `GenerateTokenTab.tsx` 수정으로 한 번에 처리 가능하다.

### 상세 구현 가이드

**Step 1-2: `src/app/api/admin/diagnosis/tokens/[id]/route.ts` (신규 파일)**

```
DELETE handler:
1. isAuthenticated 체크
2. params에서 id 추출
3. supabaseAdmin으로 해당 토큰 조회
4. 없으면 404
5. diagnostic_test_results에서 token_id로 사용 여부 확인
6. completed면 409 반환 ("시험 결과가 있는 토큰은 삭제할 수 없습니다")
7. is_active = false로 UPDATE
8. 200 반환

PATCH handler:
1. isAuthenticated 체크
2. params에서 id 추출
3. body에서 expiresAt 추출 및 유효성 검증
4. supabaseAdmin으로 해당 토큰 존재 여부 확인
5. 없으면 404
6. expires_at UPDATE
7. 200 반환 (업데이트된 토큰 데이터)
```

**Step 3: GET API 수정 (`tokens/route.ts`)**

기존 GET에서 `is_active` 필터를 추가하여 soft delete된 토큰을 제외:
```
.eq('is_active', true)  // 추가
```

**Step 4-5: `GenerateTokenTab.tsx` 수정**

- `CodeRecord` 인터페이스는 이미 충분 (id, expires_at, status 포함)
- 테이블에 "관리" 컬럼 추가
- 삭제 버튼: `handleDelete(id)` → `window.confirm()` → `fetch DELETE` → `fetchCodes()`
- 인라인 만료일시 수정: `editingId` state → 클릭 시 `datetime-local` input → `handleUpdateExpiry(id, newDate)` → `fetch PATCH`

## Testing Strategy

- REQ-001 → unit test: DELETE endpoint (성공, completed 거부, 404, 401)
- REQ-002 → unit test: PATCH endpoint (성공, 잘못된 날짜, 404, 401)
- REQ-003 → Playwright: 삭제 버튼 렌더링, 클릭 플로우
- REQ-004 → Playwright: 인라인 수정 플로우
- REQ-005 → Playwright: 컬럼 존재 확인, 반응형 확인

## Risks & Considerations

1. **FK 참조 무결성**: `diagnostic_test_results.token_id`가 삭제 대상 토큰을 참조할 수 있으므로 hard delete 대신 soft delete 사용. completed 상태 토큰은 삭제 자체를 차단.

2. **동시성**: 어드민이 삭제하는 순간 학생이 해당 코드로 시험을 시작하는 edge case. validate-token API가 `is_active = true`를 체크하므로 soft delete 후에는 코드 사용 불가 → 안전.

3. **GET 필터 추가 시 기존 동작 변경**: soft delete된 토큰이 목록에서 사라지므로 "삭제 이력"을 볼 수 없게 됨. 현재 요구사항에서는 이력 보존이 필요하지 않으므로 문제없음. 향후 필요 시 별도 "삭제된 토큰 보기" 기능 추가 가능.

4. **GenerateTokenTab.tsx 파일 크기**: 현재 357줄이며, 인라인 수정 + 삭제 로직 추가 시 400줄 이상 될 수 있음. 테이블 부분을 `TokenListTable.tsx`로 분리하는 것을 권장.

## Out of Scope

- 토큰 일괄 삭제 (bulk delete)
- 삭제된 토큰 복구 기능
- 토큰의 다른 필드(학생명, 시험 버전 등) 수정
- 삭제 이력/감사 로그
