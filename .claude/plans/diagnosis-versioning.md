# Spec: 진단테스트 버전 관리 + 문항 편집

## Overview

현재 하드코딩된 TS 파일 기반 문항을 DB로 이전하고,
문항 수정 시 새 버전이 생성되며, 토큰 발급 시 버전 배정이 가능한 시스템.

---

## Architecture Decision

### 버전 저장 방식: JSONB 배열 (v 1테이블 방식)

문항 수가 ~30개 수준이므로 `diagnostic_test_versions` 단일 테이블에
questions를 JSONB 배열로 저장. 정규화보다 단순성 우선.

```
diagnostic_test_versions
├── id (UUID, PK)
├── version_number (INTEGER, 1부터 순차)
├── title (VARCHAR)
├── time_limit_minutes (INTEGER)
├── directions (TEXT)
├── questions (JSONB)  ← TestQuestion[] 전체
├── is_current (BOOLEAN)  ← 새 토큰 발급 기본값
├── created_from (UUID, FK self)  ← 어떤 버전에서 파생됐는지
└── created_at (TIMESTAMPTZ)
```

토큰/결과 테이블에 `test_version_id UUID` 추가.
기존 `test_id VARCHAR`는 하위 호환용으로 유지.

---

## Requirements

### REQ-001: DB 스키마 — diagnostic_test_versions 테이블 생성 (MANUAL)
- 새 마이그레이션 `004_diagnosis_versioning.sql` 생성
- `diagnostic_access_tokens`에 `test_version_id UUID` 컬럼 추가
- `diagnostic_test_results`에 `test_version_id UUID` 컬럼 추가

### REQ-002: 초기 데이터 시딩 — v1 임포트 (MANUAL)
- `diagnostic-test-1.ts`의 questions 데이터를 DB version 1로 삽입
- `is_current = true`로 설정
- 기존 결과/토큰 레코드의 `test_version_id`를 v1 UUID로 업데이트

### REQ-003: 학생 플로우 — DB에서 문항 로드 (TEST)
- `GET /api/diagnosis/test-content?versionId=<uuid>` 엔드포인트
- 토큰 검증 응답에 `testVersionId` 포함
- `DiagnosticTestView`가 TS 파일 대신 API에서 문항 fetch
- 로딩 상태 처리

### REQ-004: 어드민 문항 편집 UI (BROWSER)
- 기존 `QuestionManagementTab`에 "편집" 버튼 추가
- 편집 모달: passage, question, options(text/type), answer, difficulty 수정 가능
- 저장 시 → 새 버전 생성 (REQ-005 트리거)

### REQ-005: 버전 생성 API (TEST)
- `POST /api/admin/diagnosis/versions`
- body: `{ baseVersionId, editedQuestion }` 또는 `{ baseVersionId, questions[] }`
- 새 버전 = baseVersion의 questions 복사 + 수정된 문항 교체
- `version_number = max + 1`, `is_current = false` (어드민이 명시적으로 current 지정)
- 이전 버전의 `is_current` 변경하지 않음

### REQ-006: 버전 목록 + current 지정 (BROWSER)
- 어드민 상단에 "버전 관리" 탭 또는 섹션 추가
- 버전 목록: version_number, created_at, 문항 수, is_current 표시
- "현재 버전으로 설정" 버튼 → `PATCH /api/admin/diagnosis/versions/:id/set-current`
- current 변경 시 기존 current를 false로, 새 것을 true로

### REQ-007: 토큰 생성 시 버전 선택 (BROWSER)
- `GenerateTokenTab`에 버전 드롭다운 추가
- 기본값: `is_current = true`인 버전
- 선택된 버전 ID → API로 전달 → `diagnostic_access_tokens.test_version_id` 저장

### REQ-008: 통계를 버전별로 필터 (BROWSER)
- `QuestionManagementTab`에 버전 필터 드롭다운
- 버전 선택 시 해당 버전의 결과만 집계
- `GET /api/admin/diagnosis/question-stats?versionId=<uuid>`

### REQ-009: validate-token 응답에 testVersionId 포함 (TEST)
- `POST /api/diagnosis/validate-token` 응답에 `testVersionId` 추가
- 학생 페이지가 이 ID로 문항 fetch

---

## Implementation Steps

**Step 1: DB 마이그레이션** (REQ-001)
```sql
-- 004_diagnosis_versioning.sql
CREATE TABLE diagnostic_test_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_number INTEGER NOT NULL,
  title VARCHAR(255) NOT NULL,
  time_limit_minutes INTEGER NOT NULL DEFAULT 30,
  directions TEXT,
  questions JSONB NOT NULL,
  is_current BOOLEAN NOT NULL DEFAULT false,
  created_from UUID REFERENCES diagnostic_test_versions(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX idx_one_current_version
  ON diagnostic_test_versions(is_current)
  WHERE is_current = true;

ALTER TABLE diagnostic_access_tokens
  ADD COLUMN test_version_id UUID REFERENCES diagnostic_test_versions(id);
ALTER TABLE diagnostic_test_results
  ADD COLUMN test_version_id UUID REFERENCES diagnostic_test_versions(id);
```
Files: `supabase/migrations/004_diagnosis_versioning.sql`

**Step 2: 시드 스크립트** (REQ-002)
- `scripts/seed-diagnosis-v1.mjs` 생성
- `diagnostic-test-1.ts` questions를 읽어 Supabase insert
Files: `scripts/seed-diagnosis-v1.mjs`

**Step 3: test-content API** (REQ-003, REQ-009)
- `GET /api/diagnosis/test-content` — `versionId` query param
- validate-token 응답에 `testVersionId` 추가
Files:
- `src/app/api/diagnosis/test-content/route.ts` (신규)
- `src/app/api/diagnosis/validate-token/route.ts` (수정)

**Step 4: 학생 플로우 — 동적 문항 로드** (REQ-003)
- `diagnosis/page.tsx`: validate-token 후 `testVersionId`로 test-content fetch
- `DiagnosticTestView`가 `testData` prop으로 받는 구조는 유지 (TS 타입 그대로)
- 로딩 상태 추가
Files: `src/app/diagnosis/page.tsx`

**Step 5: 버전 관리 API** (REQ-005, REQ-006)
- `POST /api/admin/diagnosis/versions` — 새 버전 생성
- `GET /api/admin/diagnosis/versions` — 버전 목록
- `PATCH /api/admin/diagnosis/versions/[id]/set-current` — current 지정
Files:
- `src/app/api/admin/diagnosis/versions/route.ts` (신규)
- `src/app/api/admin/diagnosis/versions/[id]/set-current/route.ts` (신규)

**Step 6: 어드민 버전 관리 탭** (REQ-006)
- `VersionManagementTab.tsx` 신규 컴포넌트
- admin/diagnosis/page.tsx에 'versions' 탭 추가
Files:
- `src/app/admin/diagnosis/components/VersionManagementTab.tsx` (신규)
- `src/app/admin/diagnosis/page.tsx` (수정)

**Step 7: 문항 편집 UI** (REQ-004)
- `QuestionManagementTab`의 상세 모달에 "편집 후 새 버전 저장" 버튼
- 편집 가능 필드: passage, question, options, difficulty
- 저장 → POST /api/admin/diagnosis/versions
Files: `src/app/admin/diagnosis/components/QuestionDetailModal.tsx` (수정)

**Step 8: 토큰 생성 버전 선택** (REQ-007)
- `GenerateTokenTab`에 버전 드롭다운 (버전 목록 API 활용)
Files: `src/app/admin/diagnosis/components/GenerateTokenTab.tsx` (수정)

**Step 9: 통계 버전 필터** (REQ-008)
- `QuestionManagementTab`에 버전 필터 드롭다운
- question-stats API에 `versionId` 파라미터 추가
Files:
- `src/app/admin/diagnosis/components/QuestionManagementTab.tsx` (수정)
- `src/app/api/admin/diagnosis/question-stats/route.ts` (수정)

---

## Traceability Matrix

| REQ ID | Description | Verification | Location |
|--------|-------------|-------------|----------|
| REQ-001 | DB 스키마 | (MANUAL) | migrations/004_*.sql |
| REQ-002 | v1 시딩 | (MANUAL) | scripts/seed-diagnosis-v1.mjs |
| REQ-003 | DB에서 문항 로드 | (TEST) | api/diagnosis/test-content |
| REQ-004 | 문항 편집 UI | (BROWSER) | QuestionDetailModal.tsx |
| REQ-005 | 버전 생성 API | (TEST) | api/admin/diagnosis/versions |
| REQ-006 | 버전 목록+current | (BROWSER) | VersionManagementTab.tsx |
| REQ-007 | 토큰 버전 선택 | (BROWSER) | GenerateTokenTab.tsx |
| REQ-008 | 통계 버전 필터 | (BROWSER) | QuestionManagementTab.tsx |
| REQ-009 | validate-token 응답 | (TEST) | validate-token/route.ts |

---

## Risks & Considerations

| 리스크 | 영향 | 대응 |
|--------|------|------|
| 기존 결과 레코드에 test_version_id 없음 | 통계 쿼리 NULL 처리 필요 | `WHERE test_version_id = ? OR test_version_id IS NULL` |
| 시딩 전 학생 접속 시 문항 없음 | 서비스 중단 | 시딩 완료 후 마이그레이션 배포 |
| TS 파일 vs DB 동기화 문제 | 불일치 | 시딩 완료 후 TS 파일은 레거시로 보존만 |
| is_current 동시성 | 두 버전이 동시에 current | UNIQUE PARTIAL INDEX로 DB 레벨 강제 |

---

## 구현 순서 (의존성 고려)

```
Step 1 (DB) → Step 2 (시딩) → Step 3+9 (API) → Step 4 (학생 플로우)
                                              → Step 5 (버전 API)
                                                  → Step 6 (버전 탭)
                                                  → Step 7 (토큰 버전)
                                                  → Step 8 (통계 필터)
                                                  → Step 7 (편집 UI, Step 5 의존)
```

Step 1-4는 순서 필수. Step 5 이후는 병렬 가능.

---

## 주요 설계 원칙

- **버전은 불변** — 한번 생성된 버전의 questions는 수정 불가. 수정 = 새 버전 생성
- **current는 1개** — DB UNIQUE PARTIAL INDEX로 강제
- **기존 결과 보존** — 이전 버전 결과는 해당 버전 ID로 영구 연결
- **TS 파일 유지** — 시딩 실패 시 fallback으로 활용 가능하도록 삭제 안 함
