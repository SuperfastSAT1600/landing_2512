# CRM 실시간 시험 날짜 (응시함 / 목표 시험일)

## Overview

CRM 학생 디테일 패널의 "직전 점수 상태 → 응시함" 및 "1·2차 목표 시험일" 드롭다운은
`panel/constants.ts`에 하드코딩된 정적 배열(`SAT_PAST_MONTHS`, `SAT_TEST_DATES`)을 사용한다.
이 때문에 실시간 날짜와 어긋난다:

- 오늘이 2026-07이지만 응시함 목록의 최신이 `2026-05` — **2026년 6월 시험이 과거로 안 나옴**.
- 목표 시험일 목록에 이미 지난 `2026-06-06`이 여전히 후보로 남아있음.

현재 날짜를 기준으로 과거 시험은 응시함에, 미래 시험은 목표 시험일에 자동으로 노출되도록 동적 계산으로 전환한다.

## Requirements

### REQ-001: 응시함(과거) 시험 월 실시간 계산
- **Priority**: Must
- **Description**: `getSatPastMonths(now)` 함수가 현재 날짜 기준으로 과거(진행된) SAT 시행 월을
  `YYYY-MM` 값으로 최신순 반환한다. 시행 월 패턴은 기존 데이터와 동일하게 3·5·6·8·10·11·12월,
  시작 연도는 2023년.
- **Acceptance Criteria**: `now = 2026-07-09`일 때 반환 목록의 최상단이 `2026-06`(2026년 6월),
  그 다음 `2026-05`… 이며 `2026-08` 등 미래 월은 포함되지 않는다. 저장 값 형식(`YYYY-MM`) 불변.
- **Verification**: (TEST) `getSatPastMonths`에 고정 `now`를 주입해 경계·순서·형식 검증.

### REQ-002: 목표 시험일(미래) 실시간 필터
- **Priority**: Must
- **Description**: `getSatTestDates(now)` 함수가 마스터 시험일 목록에서 오늘 이후(오늘 포함) 날짜만
  시즌 그룹별로 반환하고, 빈 그룹은 제거한다. 저장/표시용 라벨 조회를 위한 전체 목록(`SAT_DATE_ALL`)과
  `formatSatDate`는 과거 날짜도 계속 정확히 포맷한다.
- **Acceptance Criteria**: `now = 2026-07-09`일 때 `2026-06-06`은 옵션에서 제외되고
  `2026-08-22` 이후만 남는다. 이미 저장된 과거 목표일(`2026-06-06`)은 표시 화면에서 여전히
  `2026년 6월 6일 (토)`로 포맷된다. 저장 값 형식(`YYYY-MM-DD`) 불변.
- **Verification**: (TEST) `getSatTestDates`/`formatSatDate`에 고정 `now`로 필터·포맷 검증.

### REQ-003: 드롭다운 UI 반영
- **Priority**: Must
- **Description**: `StudentInfoEdit.tsx`(편집 드롭다운)와 `StudentInfoSection.tsx`(표시 라벨)가
  새 함수를 사용하도록 교체. 표시 라벨은 과거 값도 포맷 가능한 헬퍼(`formatSatMonth`) 사용.
- **Acceptance Criteria**: 편집 패널에서 응시함 선택 시 2026년 6월이 보이고, 목표 시험일에 지난
  6월이 안 보인다. 기존 저장 값 표시가 깨지지 않는다.
- **Verification**: (BROWSER) CRM 디테일 패널에서 두 드롭다운 확인 + Playwright 스크린샷.

## Technical Design

### Architecture
- `src/app/admin/crm/components/panel/constants.ts`:
  - `SAT_TEST_DATES` 배열 → `SAT_TEST_DATES_MASTER`(전체) 유지 + `getSatTestDates(now?)` 필터 함수 추가.
  - `SAT_PAST_MONTHS` 배열 → `getSatPastMonths(now?)` 생성 함수로 대체. `SAT_MONTHS`, 시작연도 상수화.
  - `SAT_DATE_ALL`, `formatSatDate`는 마스터 전체 기준 유지(과거 라벨 보존).
  - `formatSatMonth(value)` 추가 (`YYYY-MM` → `YYYY년 M월`, 없으면 raw).
  - 날짜 비교는 로컬 `YYYY-MM-DD` 문자열 사전식 비교(타임존 안전).
- 소비처 2곳(`StudentInfoEdit.tsx`, `StudentInfoSection.tsx`) 갱신.

### Dependencies
없음 (순수 함수, 표준 `Date`).

## Traceability Matrix

| REQ ID  | Description            | Verification | Test File                                        | Status  |
|---------|------------------------|--------------|--------------------------------------------------|---------|
| REQ-001 | 과거 시험 월 계산      | (TEST)       | `src/app/admin/crm/components/panel/__tests__/sat-dates.test.ts` | Pending |
| REQ-002 | 미래 시험일 필터       | (TEST)       | `src/app/admin/crm/components/panel/__tests__/sat-dates.test.ts` | Pending |
| REQ-003 | 드롭다운 UI 반영       | (BROWSER)    | 수동/Playwright                                  | Pending |

## Implementation Order

1. REQ-001, REQ-002 — `constants.ts` 순수 함수 + 테스트 (TDD).
2. REQ-003 — 소비 컴포넌트 교체 후 브라우저 확인.

## Out of Scope

- `StudentCreateModal`의 목표일은 native `<input type="date">`라 해당 없음.
- 시트 동기화(`sheets-sync-utils.ts`)의 자체 매핑 로직.
- 과거 시행 월 패턴이 미래에 9월 등으로 바뀌는 장기 스케줄 변화(현행 패턴 유지).
