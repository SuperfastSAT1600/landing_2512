# 진단테스트 이전 SAT 점수 입력 단계 추가

## Overview

진단테스트 응시 프로세스에 **이전 SAT 점수 입력** 단계를 추가한다.

현재 흐름:
```
코드 입력 → 학생 확인 → 이메일 입력 → 테스트 로딩 → 시험
```

변경 후 흐름:
```
코드 입력 → 학생 확인 → 이메일 입력 → 이전 SAT 점수 입력 → 테스트 로딩 → 시험
```

이메일 입력 후 가장 최근에 본 SAT 시험의 날짜·RW 점수·Math 점수를 수집한다.  
점수를 기억하지 못하거나 시험을 본 적이 없는 학생을 위한 별도 선택지도 제공한다.  
수집된 정보는 시험 결과 DB, 어드민 결과 상세, 학생용 진단 리포트에 반영된다.  
자동 버전 분기(쉬운/어려운 버전 라우팅)는 이번 작업 범위 밖이다.

---

## Requirements

### REQ-001: 이전 SAT 점수 입력 UI 단계 추가
- **Priority**: Must
- **Description**: 이메일 입력 완료 후, 테스트 로딩 전에 `previous-score-input` 단계를 삽입한다.
- **Acceptance Criteria**:
  - 세 개의 입력 필드가 표시된다: 가장 최근 SAT 시험 날짜(월/년), RW 점수, Math 점수
  - 점수 입력 후 "다음" 버튼으로 제출하면 테스트 로딩 단계로 전환된다
  - "시험을 본 적이 없다" 버튼 클릭 시 점수 입력 없이 바로 테스트 로딩으로 전환된다
  - "점수가 기억이 안 난다" 버튼 클릭 시 점수 입력 없이 바로 테스트 로딩으로 전환된다
  - 기존 브랜드 스타일(`bg-[#09090b]`, `--accent-primary` 버튼 등)을 유지한다
  - 이메일 입력 완료 시점에 `test-content` API 백그라운드 호출을 유지한다 (UX 최적화)
- **Verification**: (BROWSER) 세 가지 경로 모두 테스트 로딩으로 정상 전환됨

### REQ-002: 입력값 유효성 검사 (점수 직접 입력 경로만)
- **Priority**: Must
- **Description**: 점수를 직접 입력할 때만 클라이언트 측 유효성 검사를 적용한다.
- **Acceptance Criteria**:
  - RW 점수: 200 이상 800 이하 정수, 10 단위 (200, 210, ..., 800)
  - Math 점수: 200 이상 800 이하 정수, 10 단위
  - 시험 날짜: 2016년 이후 ~ 현재 월까지 유효한 년/월
  - 세 필드 모두 입력되지 않으면 "다음" 버튼 비활성화
  - 범위 오류 시 해당 필드 아래 인라인 에러 메시지 표시
  - "시험을 본 적이 없다" / "점수가 기억이 안 난다" 버튼은 유효성 검사 없이 즉시 진행
- **Verification**: (BROWSER) 범위 밖 점수 입력 시 에러 표시, 정상 값 입력 시 버튼 활성화

### REQ-003: DB 스키마 — 이전 점수 컬럼 추가
- **Priority**: Must
- **Description**: `diagnostic_test_results` 테이블에 이전 점수 데이터를 저장할 컬럼을 추가한다.
- **Acceptance Criteria**:
  - `previous_score_status VARCHAR NULLABLE` — 세 가지 값: `'scored'` / `'never_taken'` / `'dont_remember'`
  - `previous_test_date DATE NULLABLE` — 가장 최근에 본 SAT 시험 날짜 (`status = 'scored'`일 때만 값 존재)
  - `previous_rw_score SMALLINT NULLABLE` — RW 점수 (`status = 'scored'`일 때만 값 존재)
  - `previous_math_score SMALLINT NULLABLE` — Math 점수 (`status = 'scored'`일 때만 값 존재)
  - 기존 결과 레코드(마이그레이션 전)는 모두 NULL로 유지
- **Verification**: (MANUAL) 마이그레이션 실행 후 Supabase 대시보드에서 컬럼 확인

### REQ-004: submit API 및 타입에 이전 점수 필드 추가
- **Priority**: Must
- **Description**: `POST /api/diagnosis/submit` 및 `TestResult` 타입에 이전 점수 필드를 추가한다.
- **Acceptance Criteria**:
  - `src/types/diagnosis.ts`의 `TestResult`에 아래 필드 추가 (모두 optional):
    - `previousScoreStatus?: 'scored' | 'never_taken' | 'dont_remember'`
    - `previousTestDate?: string`
    - `previousRwScore?: number`
    - `previousMathScore?: number`
  - submit route에서 해당 필드를 `diagnostic_test_results`에 저장
  - 필드 없이 호출해도 (기존 데이터) API 오류 없음
- **Verification**: (TEST) submit API 호출 시 세 가지 status 모두 DB에 올바르게 저장됨

### REQ-005: 어드민 결과 상세 화면에 이전 점수 표시
- **Priority**: Should
- **Description**: `src/app/admin/diagnosis/[id]/page.tsx`의 "학생 정보" 카드에 이전 점수를 표시한다.
- **Acceptance Criteria**:
  - `status = 'scored'`: `이전 SAT: RW 720 / Math 680 (2024-11)` 형식으로 표시
  - `status = 'never_taken'`: `이전 SAT: 시험 경험 없음` 표시
  - `status = 'dont_remember'`: `이전 SAT: 점수 미기억` 표시
  - status가 NULL (구 데이터): 해당 항목 미표시
- **Verification**: (BROWSER) 어드민에서 새 결과 클릭 시 이전 점수 상태 확인

### REQ-006: 학생용 진단 리포트에 이전 점수 표시
- **Priority**: Should
- **Description**: `src/lib/report-data.ts`와 리포트 UI에 이전 점수 정보를 포함한다.
- **Acceptance Criteria**:
  - `ReportData` 인터페이스에 `previousScoreStatus?`, `previousTestDate?`, `previousRwScore?`, `previousMathScore?` 추가
  - `fetchReportData`에서 해당 컬럼을 SELECT해 반환
  - `status = 'scored'`일 때: 리포트 상단에 "이전 시험 점수: RW XXX / Math XXX (YYYY-MM)" 표시
  - `status = 'never_taken'` 또는 `'dont_remember'`일 때: 해당 섹션 미표시 (리포트 깔끔하게 유지)
  - status가 NULL: 해당 섹션 미표시
- **Verification**: (BROWSER) 점수 입력한 학생의 리포트에서 이전 점수 섹션 확인

---

## Technical Design

### 변경 파일 목록

| 파일 | 변경 내용 |
|------|-----------|
| `supabase/migrations/008_add_previous_score.sql` | 컬럼 추가 마이그레이션 (신규) |
| `src/types/diagnosis.ts` | `TestResult`에 이전 점수 필드 4개 추가 |
| `src/app/api/diagnosis/submit/route.ts` | 이전 점수 필드 수신 후 INSERT |
| `src/app/diagnosis/page.tsx` | `previous-score-input` 단계 추가, 상태 추가, 세 가지 진행 경로 처리 |
| `src/lib/report-data.ts` | `ReportData`에 필드 추가, SELECT 쿼리 업데이트 |
| `src/app/reports/[resultId]/components/ReportCover.tsx` | 이전 점수 표시 UI 추가 |
| `src/app/admin/diagnosis/[id]/page.tsx` | 학생 정보 카드에 이전 점수 상태 표시 |

### 새로운 상태 (page.tsx)

```typescript
type PreviousScoreStatus = 'scored' | 'never_taken' | 'dont_remember' | null
const [previousScoreStatus, setPreviousScoreStatus] = useState<PreviousScoreStatus>(null)
const [previousTestDate, setPreviousTestDate] = useState('')   // 'YYYY-MM'
const [previousRwScore, setPreviousRwScore] = useState('')
const [previousMathScore, setPreviousMathScore] = useState('')
```

### 세 가지 진행 경로

```
[점수 직접 입력] → 유효성 검사 통과 → status='scored', 값 저장 → test-loading
[시험을 본 적이 없다] → status='never_taken', 점수 NULL → test-loading
[점수가 기억이 안 난다] → status='dont_remember', 점수 NULL → test-loading
```

### 마이그레이션 (008_add_previous_score.sql)

```sql
ALTER TABLE diagnostic_test_results
  ADD COLUMN IF NOT EXISTS previous_score_status VARCHAR(20),
  ADD COLUMN IF NOT EXISTS previous_test_date DATE,
  ADD COLUMN IF NOT EXISTS previous_rw_score SMALLINT,
  ADD COLUMN IF NOT EXISTS previous_math_score SMALLINT;

ALTER TABLE diagnostic_test_results
  ADD CONSTRAINT chk_previous_score_status
    CHECK (previous_score_status IN ('scored', 'never_taken', 'dont_remember')),
  ADD CONSTRAINT chk_previous_rw_score
    CHECK (previous_rw_score IS NULL OR previous_rw_score BETWEEN 200 AND 800),
  ADD CONSTRAINT chk_previous_math_score
    CHECK (previous_math_score IS NULL OR previous_math_score BETWEEN 200 AND 800);
```

### 점수 입력 UI 레이아웃

UI 전체 언어는 **영어**. 버튼 및 레이블 모두 영어로 작성한다.

```
┌─────────────────────────────────────────┐
│  What was your most recent SAT score?   │
│                                         │
│  Test date        [Month ▾] [Year ▾]   │
│  Reading & Writing  [     ]  200–800    │
│  Math               [     ]  200–800    │
│                                         │
│  [Next →]  (disabled until all filled)  │
│                                         │
│  ──────────────────────────────         │
│  [I've never taken the SAT]             │
│  [I don't remember my score]            │
└─────────────────────────────────────────┘
```

---

## Traceability Matrix

| REQ ID  | 설명                          | Verification | 검증 위치                                           | 상태    |
|---------|-------------------------------|--------------|-----------------------------------------------------|---------|
| REQ-001 | 이전 점수 입력 UI + 3가지 경로 | (BROWSER)    | `/diagnosis` 응시 흐름 직접 확인                    | Pending |
| REQ-002 | 점수 직접 입력 유효성 검사    | (BROWSER)    | 잘못된 점수 입력 시 에러 확인                       | Pending |
| REQ-003 | DB 컬럼 추가 마이그레이션     | (MANUAL)     | Supabase 대시보드에서 컬럼 확인                     | Pending |
| REQ-004 | submit API 필드 추가          | (TEST)       | `src/app/api/diagnosis/submit/route.ts` 단위 테스트 | Pending |
| REQ-005 | 어드민 결과 상세 — 이전 점수  | (BROWSER)    | `/admin/diagnosis/[id]` 학생 정보 카드              | Pending |
| REQ-006 | 학생 리포트 — 이전 점수       | (BROWSER)    | `/reports/[resultId]` 리포트 상단                   | Pending |

---

## Implementation Order

1. **REQ-003** — DB 마이그레이션 (모든 것의 기반)
2. **REQ-004** — 타입 + submit API 업데이트
3. **REQ-001 + REQ-002** — 진단 UI 단계 추가 (2 완료 후)
4. **REQ-005** — 어드민 표시
5. **REQ-006** — 리포트 표시 (`report-data.ts` → `ReportCover` 순서)

---

## Out of Scope

- 점수 기반 시험 버전 자동 분기 (쉬운/어려운 버전 라우팅)
- 이전 점수 기반 분석 또는 퍼센타일 비교
- 이전 점수 입력 필수/선택 여부 어드민 설정
