# 문의 날짜 → 분 단위 datetime

## Overview

문의 날짜(`inquiry_date`)를 날짜(date)에서 **분 단위 datetime**으로 확장한다.
타임존 드리프트(주/월/일 그룹핑 어긋남)를 피하기 위해 `timestamp`(time zone 없음, naive)로 저장하고,
datetime-local 입력값("YYYY-MM-DDTHH:mm")을 그대로 보존한다. 기존 date 값은 자정(00:00)으로 변환된다.

## Requirements

### REQ-001: inquiry_date 컬럼 타입 변경
- **Priority**: Must
- **Description**: `students.inquiry_date` `date` → `timestamp`(without time zone). 마이그레이션 063.
  기존 값은 `::timestamp`로 자정 타임스탬프가 된다.
- **Verification**: (MANUAL) 마이그레이션 적용 + 분 단위 값 저장/조회.

### REQ-002: 인입 정보·생성 모달 datetime 입력
- **Priority**: Must
- **Description**: 패널 InquirySection 편집의 문의 날짜 입력을 `datetime-local`로, 생성 모달
  StudentCreateModal의 문의 날짜 입력도 `datetime-local`로 변경. `studentToEditForm`은 naive 문자열을
  datetime-local 값으로 매핑(`toDatetimeLocalNaive`). 저장은 입력 문자열을 naive로 그대로 저장.
  읽기 모드는 분 단위 표시(자정은 날짜만).
- **Verification**: (MANUAL) 저장/재조회 + 코드 확인.

### REQ-003: 날짜 범위 필터 상한 보정
- **Priority**: Must
- **Description**: `inquiry_date`가 timestamp가 되면서 `.lte(to)`가 그날 00:00로 잘리는 문제 방지.
  stats / stats-detail / marketing-stats / marketing-weekly의 inquiry_date(및 동일 패턴 created_at) 상한을
  `${to}T23:59:59`로 보정. 주/월/일 그룹핑(slice(0,10) 등)은 naive라 변경 불필요.
- **Verification**: (MANUAL) curl로 기간 경계 리드 포함 확인.

## Technical Design

- `supabase/migrations/063_inquiry_date_to_timestamp.sql`
- `src/types/crm.ts` — 주석 갱신(타입은 string|null 유지).
- `panel/types.ts` — `toDatetimeLocalNaive`, studentToEditForm 매핑.
- `InquirySection.tsx` — 입력 type, 읽기 표시.
- `StudentCreateModal.tsx` — 입력 type.
- `stats/route.ts`, `stats/detail/route.ts`, `marketing/stats/route.ts`, `marketing/weekly/route.ts` — 상한 보정.

## Traceability Matrix

| REQ ID  | Description            | Verification | Test File | Status  |
|---------|------------------------|--------------|-----------|---------|
| REQ-001 | 컬럼 타입 변경         | (MANUAL)     | —         | Pending |
| REQ-002 | datetime 입력/표시     | (MANUAL)     | —         | Pending |
| REQ-003 | 범위 필터 상한 보정    | (MANUAL)     | —         | Pending |

## Out of Scope

- 평균 첫 응답 계산 기준을 created_at → inquiry_date로 변경(별도 요청 시).
