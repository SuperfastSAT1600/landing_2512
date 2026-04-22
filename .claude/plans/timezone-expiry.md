# Timezone-Aware Expiry for Diagnostic Access Codes

## Overview

현재 진단테스트 접속 코드의 만료일시는 어드민 브라우저의 로컬 시간대(한국 KST)를 기준으로 datetime-local 입력을 받고, new Date(value).toISOString()으로 UTC 변환하여 DB에 저장한다. 학생이 해외(미국, 캐나다 등)에 위치한 경우, 어드민이 학생 기준 시간대로 만료일시를 정확히 설정할 수 없다.

이 기능은 코드 생성 폼과 인라인 수정 폼 모두에 **국가/시간대 선택** UI를 추가하여, 선택한 시간대 기준으로 입력된 날짜를 UTC로 변환해 저장하도록 한다. DB 스키마는 변경하지 않는다 (expires_at TIMESTAMPTZ 유지).

## Requirements

### REQ-001: 시간대 선택 데이터 및 유틸리티 모듈
- **Priority**: Must
- **Description**: 자주 사용하는 국가/시간대 목록을 정적 데이터로 제공하고, datetime-local 값 + IANA timezone -> UTC ISO 변환, UTC ISO -> 특정 timezone의 datetime-local 값 변환 유틸리티 함수를 구현한다.
- **Acceptance Criteria**:
  - IANA timezone 식별자를 키로 하는 시간대 목록이 존재하며, 한국, 미국 주요 4개(Eastern/Central/Mountain/Pacific), 캐나다(Toronto/Vancouver) 등 최소 8개 항목 포함
  - localToUTC(datetimeLocalValue: string, timezone: string): string -- datetime-local 문자열 + timezone -> UTC ISO 문자열 반환
  - utcToLocal(utcIso: string, timezone: string): string -- UTC ISO 문자열 -> 해당 timezone 기준 datetime-local 문자열 반환
  - getTimezoneAbbr(timezone: string, date?: Date): string -- timezone의 약어 반환 (예: KST, EST, PDT)
  - 외부 라이브러리 없이 Intl.DateTimeFormat과 네이티브 Date API만 사용
- **Verification**: (TEST) 유틸리티 함수의 변환 정확성 단위 테스트 (DST 경계 케이스 포함)

### REQ-002: TimezoneSelect 공통 컴포넌트
- **Priority**: Must
- **Description**: 시간대를 선택할 수 있는 재사용 가능한 드롭다운 컴포넌트를 구현한다. 국가별로 그룹핑하여 표시한다.
- **Acceptance Criteria**:
  - <TimezoneSelect value={tz} onChange={setTz} /> 형태로 사용 가능
  - 드롭다운 옵션은 국가명으로 <optgroup> 그룹핑 (예: 미국 그룹 아래 Eastern/Central/Mountain/Pacific)
  - 기본값은 Asia/Seoul (한국 KST)
  - 선택된 시간대의 현재 UTC 오프셋을 표시 (예: 한국 표준시 (UTC+9))
  - 기존 admin UI 스타일(bg-gray-700, border-gray-600, text-white 등)과 일관된 디자인
- **Verification**: (BROWSER) 생성 폼과 인라인 수정에서 각각 드롭다운 렌더링 확인

### REQ-003: 코드 생성 폼에 시간대 선택 연동
- **Priority**: Must
- **Description**: GenerateTokenTab.tsx의 만료일시 입력 옆에 시간대 선택 드롭다운을 추가한다. 사용자가 시간대를 선택하면, datetime-local 입력값을 해당 시간대 기준 로컬 시간으로 해석하여 UTC로 변환 후 API에 전송한다.
- **Acceptance Criteria**:
  - 만료일시 입력과 시간대 선택이 같은 행 또는 인접한 위치에 배치됨
  - 시간대를 변경해도 datetime-local 입력값 자체는 유지됨 (사용자가 입력한 현지 시각이 변하지 않음)
  - API 전송 시 new Date(datetimeLocal) 대신 localToUTC(datetimeLocal, selectedTimezone)으로 변환
  - 기본 시간대는 Asia/Seoul
- **Verification**: (TEST) localToUTC 변환이 API payload에 정확히 반영되는지 테스트

### REQ-004: 토큰 목록 인라인 수정에 시간대 선택 연동
- **Priority**: Must
- **Description**: TokenListTable.tsx의 인라인 만료일시 수정 UI에 시간대 선택을 추가한다. 수정 시작 시 기존 UTC 값을 선택한 시간대로 변환하여 datetime-local에 표시하고, 저장 시 다시 UTC로 변환한다.
- **Acceptance Criteria**:
  - 수정 모드 진입 시 시간대 선택 드롭다운이 datetime-local 입력 옆에 나타남
  - 기존 expires_at(UTC)을 선택한 시간대 기준으로 변환하여 datetime-local에 표시
  - 시간대를 변경하면 datetime-local 값이 새 시간대 기준으로 재계산됨 (같은 UTC 시점을 다른 시간대로 표시)
  - 저장 시 localToUTC(editingExpiry, selectedTimezone)으로 변환하여 PATCH API 호출
  - 인라인 UI가 테이블 셀 안에서 깨지지 않도록 컴팩트한 레이아웃
- **Verification**: (BROWSER) 인라인 수정에서 시간대 변경 후 저장 -> 새로고침 시 UTC 값이 올바른지 확인

### REQ-005: 목록에서 만료일시 + 시간대 약어 표시
- **Priority**: Should
- **Description**: 토큰 목록의 만료일시 컬럼에서 현재 ko-KR locale로 포맷된 날짜 옆에 시간대 약어를 함께 표시한다. DB에 시간대 정보가 없으므로, 표시는 항상 KST(서버/브라우저 기준)로 하되 (KST) 약어를 명시한다.
- **Acceptance Criteria**:
  - 만료일시가 2026. 12. 31. 오후 11:59 KST 형태로 표시됨
  - 수정 모드가 아닌 읽기 모드에서만 약어 표시
- **Verification**: (BROWSER) 목록 화면에서 KST 약어가 만료일시 옆에 표시되는지 확인

### REQ-006: 세션 내 시간대 기억
- **Priority**: Could
- **Description**: 어드민이 한 세션 동안 코드를 여러 개 생성할 때, 마지막으로 선택한 시간대를 기억하여 다음 코드 생성 시 기본값으로 설정한다.
- **Acceptance Criteria**:
  - 시간대 선택 시 sessionStorage에 저장
  - 페이지 새로고침 시에도 세션 내에서는 마지막 선택 시간대 유지
  - sessionStorage 실패 시 graceful fallback (Asia/Seoul)
- **Verification**: (BROWSER) 시간대 변경 후 페이지 새로고침 시 선택이 유지되는지 확인
## Technical Design

### Architecture

**새 파일**:
- src/lib/timezone-utils.ts -- 시간대 데이터 + 변환 유틸리티 (REQ-001)
- src/components/admin/TimezoneSelect.tsx -- 공통 시간대 선택 컴포넌트 (REQ-002)

**수정 파일**:
- src/app/admin/diagnosis/components/GenerateTokenTab.tsx -- 시간대 선택 추가 (REQ-003)
- src/app/admin/diagnosis/components/TokenListTable.tsx -- 인라인 수정 시간대 + 표시 약어 (REQ-004, REQ-005)

**수정하지 않는 파일**:
- API 라우트 (tokens/route.ts, tokens/[id]/route.ts) -- 이미 UTC ISO 문자열을 받아 DB에 저장하므로 변경 불필요
- DB 스키마 -- expires_at TIMESTAMPTZ 그대로 유지

### 시간대 목록 (정적 데이터)

| Country | Timezone | Label |
|---------|----------|-------|
| 한국 | Asia/Seoul | 한국 표준시 |
| 미국 | America/New_York | 동부 시간 (ET) |
| 미국 | America/Chicago | 중부 시간 (CT) |
| 미국 | America/Denver | 산지 시간 (MT) |
| 미국 | America/Los_Angeles | 태평양 시간 (PT) |
| 캐나다 | America/Toronto | 동부 시간 (토론토) |
| 캐나다 | America/Vancouver | 태평양 시간 (밴쿠버) |
| 일본 | Asia/Tokyo | 일본 표준시 |
| 영국 | Europe/London | 영국 시간 |

### UTC 변환 방식 (Intl API 활용, 외부 라이브러리 없음)

**핵심 원리**: datetime-local 입력은 시간대 정보가 없는 순수 로컬 시각이다. 이를 특정 IANA timezone의 로컬 시각으로 해석하여 UTC로 변환해야 한다.

**localToUTC 구현 전략**:
1. datetime-local 값을 문자열 파싱으로 연/월/일/시/분 추출 (브라우저 시간대 무관)
2. Date.UTC(year, month-1, day, hour, minute)로 임시 Date 생성
3. 이 임시 Date를 Intl.DateTimeFormat으로 목표 timezone에서 포맷하여 실제 로컬 시각 확인
4. 임시 UTC 시각과 목표 timezone 로컬 시각의 차이(offset)를 계산
5. offset만큼 보정하여 실제 UTC 시점 산출 -> .toISOString()

**utcToLocal 구현 전략**:
1. UTC ISO 문자열로 Date 객체 생성
2. Intl.DateTimeFormat의 formatToParts로 해당 timezone의 로컬 연/월/일/시/분 추출
3. YYYY-MM-DDTHH:mm 형식으로 조합하여 반환

**getTimezoneAbbr 구현**:
- Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "short" }).format(date)에서 시간대 약어 추출

### UI 레이아웃

**코드 생성 폼 (GenerateTokenTab)**:

현재 6자리 접속 코드와 만료 일시가 grid-cols-2로 배치되어 있다 (line 194).

변경 후: 만료 일시 섹션을 코드 입력에서 분리하여 독립 행으로 만들고, 내부에서 datetime-local + timezone select를 나란히 배치한다.

[ 6자리 코드 ────────────── ] (독립 행)
[ 만료 일시 (datetime-local) ] [ 시간대 선택 ] (독립 행)

**인라인 수정 (TokenListTable)**:

변경 전: [datetime-local] [저장] [취소]
변경 후: [datetime-local] [TZ select] [저장] [취소]

TimezoneSelect에 compact prop을 지원하여 인라인 환경에서는 짧은 라벨(약어만)로 표시.

### Dependencies

- **외부 라이브러리**: 없음 (Intl API + native Date만 사용)
- **date-fns**: 이미 프로젝트에 존재하지만 이 기능에서는 사용하지 않음 (Intl API가 충분)
- **브라우저 호환성**: Intl.DateTimeFormat의 formatToParts -- 모든 모던 브라우저 지원
## Traceability Matrix

| REQ ID  | Description                        | Verification | Test/Check Location                              | Status  |
|---------|------------------------------------|--------------|--------------------------------------------------|---------|
| REQ-001 | 시간대 데이터 + 변환 유틸리티      | (TEST)       | src/__tests__/timezone-utils.test.ts             | Pending |
| REQ-002 | TimezoneSelect 컴포넌트            | (BROWSER)    | Playwright: admin 생성폼 드롭다운 확인           | Pending |
| REQ-003 | 생성 폼 시간대 연동                | (TEST)       | src/__tests__/timezone-utils.test.ts (변환)      | Pending |
| REQ-004 | 인라인 수정 시간대 연동            | (BROWSER)    | Playwright: 인라인 수정 시간대 변경 후 저장 확인 | Pending |
| REQ-005 | 목록 만료일시 약어 표시            | (BROWSER)    | Playwright: 목록에서 KST 텍스트 확인             | Pending |
| REQ-006 | 세션 내 시간대 기억                | (BROWSER)    | Playwright: 시간대 변경 -> 새로고침 -> 유지 확인 | Pending |

## Implementation Order

1. **REQ-001** -- 기반 유틸리티. 모든 다른 REQ가 이 변환 함수에 의존함.
2. **REQ-002** -- 공통 UI 컴포넌트. REQ-003, REQ-004에서 사용.
3. **REQ-003** -- 생성 폼 연동. REQ-001 + REQ-002 완료 후.
4. **REQ-004** -- 인라인 수정 연동. REQ-001 + REQ-002 완료 후. REQ-003과 병렬 가능.
5. **REQ-005** -- 표시 개선. 독립적이지만 REQ-004 이후가 자연스러움.
6. **REQ-006** -- 편의 기능. 마지막에 추가.

## Risks & Considerations

### DST (Daylight Saving Time) 처리
- **위험**: 미국 시간대는 DST 전환 시 UTC offset이 변한다 (EST=-5 -> EDT=-4). Intl.DateTimeFormat은 특정 날짜의 DST 상태를 자동으로 반영하므로 올바르게 처리된다.
- **완화**: REQ-001 테스트에 DST 경계 날짜(3월 둘째 일요일, 11월 첫째 일요일)를 포함하여 검증.

### datetime-local의 시간대 없는 특성
- **위험**: datetime-local 입력은 항상 시간대 정보가 없다. new Date("2026-12-31T23:59")는 브라우저 로컬 시간대로 해석된다.
- **완화**: localToUTC 함수에서 문자열 파싱으로 연/월/일/시/분을 직접 추출하고, new Date() 생성자의 로컬 시간대 해석에 의존하지 않는다.

### 서버 사이드 검증
- **현재 상태**: API 라우트는 ISO 문자열을 new Date()로 파싱한 뒤 toISOString()으로 저장한다. 클라이언트가 올바른 UTC ISO를 보내면 문제 없다.
- **위험**: 없음. 변환은 클라이언트 측에서 완료되며, API는 이미 UTC ISO를 기대한다.

### 코드 목록의 시간대 표시 한계
- **현재 상태**: DB에는 어떤 시간대로 만료일시를 설정했는지 저장하지 않는다.
- **결정**: 목록 표시는 항상 KST 기준으로 하되 (KST) 약어를 명시한다. 시간대 정보를 DB에 저장하려면 스키마 변경이 필요하나, 요구사항에서 DB 변경 없음으로 명시했으므로 제외한다.

### DST 전환 시 모호한 시각
- **위험**: Fall-back (시계를 뒤로 돌리는) 전환 시 같은 로컬 시각이 두 번 존재할 수 있다 (예: 11월 첫째 일요일 01:30 AM ET가 EDT와 EST에 각각 한 번씩).
- **완화**: Intl.DateTimeFormat은 이 경우 일반적으로 DST 이후(standard time) 해석을 선택한다. 만료일시 설정에서 1시간 오차는 실용적으로 허용 범위이므로 별도 처리하지 않는다.

## Out of Scope

- DB 스키마 변경 (timezone 컬럼 추가 등)
- 학생 측 페이지의 시간대 표시 변경
- 전체 IANA timezone 목록 제공 (300+ 항목) -- 자주 사용하는 국가만 제공
- 시간대 자동 감지 (학생 IP 기반 등)
- API 라우트 변경 (이미 UTC ISO를 받아 처리하므로 불필요)
