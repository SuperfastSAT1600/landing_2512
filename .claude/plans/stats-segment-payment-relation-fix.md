# CRM 통계 세그먼트 — 결제 company_id 관계 파싱 수정

## Overview

`/api/crm/stats`와 `/api/crm/stats/detail`은 `segment=b2c|b2b` 분류를 위해 payments에서
`students:student_id(company_id)` 관계를 함께 조회한 뒤 `related?.[0]?.company_id`로 읽는다.
그런데 PostgREST는 many-to-one 임베드를 **배열이 아닌 단일 객체**(`{"company_id": "..."}`)로 반환한다.
따라서 `[0]` 접근은 항상 `undefined`가 되어 **모든 결제가 B2C로 분류**된다.

실측(2026-07-01~08-12, 결제 71건, 서비스롤 직접 조회):

| 구분 | 현재 라우트 | 실제(students 직접 조회) |
|------|------------|------------------------|
| B2B 결제 건수 | 0건 | 21건 |
| B2B 매출 | 0원 | 43,405,000원 |
| B2C 매출 | 157,650,725원 (=전체) | 114,245,725원 |

즉 B2B 탭은 매출/환불이 0으로, B2C 탭은 B2B 매출까지 포함된 값으로 표시된다.
기존 유닛 테스트는 mock을 배열 형태(`students: [{ company_id }]`)로 만들어 이 버그를 통과시켰다.

리드(students) 집계는 쿼리 레벨 `is/not company_id` 필터라 영향 없다 (all=87 = b2c 79 + b2b 8, 검증됨).

## Requirements

### REQ-001: 관계 조회 결과를 객체·배열 양쪽 형태로 파싱
- **Priority**: Must
- **Description**: `src/lib/crm-stats-core.ts`에 `relatedCompanyId(related)` 헬퍼를 추가한다.
  입력이 `null`/`undefined`면 `null`, 배열이면 첫 원소의 `company_id`, 객체면 그 객체의 `company_id`를 반환한다.
  이를 사용하는 `paymentMatchesSegment(row, segment)`도 함께 제공한다(`all`은 항상 true).
- **Acceptance Criteria**: `relatedCompanyId({company_id:'c1'}) === 'c1'`, `relatedCompanyId([{company_id:'c1'}]) === 'c1'`,
  `relatedCompanyId(null) === null`. `paymentMatchesSegment({students:{company_id:'c1'}}, 'b2b') === true`,
  같은 행에 `'b2c'`는 `false`.
- **Verification**: (TEST) `src/lib/__tests__/crm-stats-core.test.ts`에 객체/배열/null 3형태 + 세그먼트 3값 조합 테스트

### REQ-002: stats·detail 라우트가 공용 헬퍼를 사용
- **Priority**: Must
- **Description**: `src/app/api/crm/stats/route.ts`의 지역 `paymentInSegment`와
  `src/app/api/crm/stats/detail/route.ts`의 인라인 필터를 `paymentMatchesSegment`로 교체한다.
  `payments`/`firstPayRows` 양쪽 모두 적용.
- **Acceptance Criteria**: 객체 형태 관계를 반환하는 mock에서 `segment=b2b`가 B2B 학생 결제만,
  `segment=b2c`가 개인 학생 결제만 집계한다. `all`은 두 값의 합과 같다.
- **Verification**: (TEST) `src/app/api/crm/stats/__tests__/route.test.ts` — 기존 세그먼트 테스트의 mock을
  실제 PostgREST 형태(객체)로 교정하고, all == b2c + b2b 합 일치 검증 추가

### REQ-003: 죽은 헬퍼 제거
- **Priority**: Should
- **Description**: 이전 구현에서 쓰던 `filterPaymentsBySegment`는 커밋 6542719 이후 라우트에서 참조되지 않는다
  (테스트만 남아 있음). 헬퍼와 해당 테스트를 삭제한다.
- **Acceptance Criteria**: `grep -rn filterPaymentsBySegment src`가 아무것도 반환하지 않고 전체 테스트가 통과한다.
- **Verification**: (TEST) `npx vitest run` 전체 통과

### REQ-004: 실데이터 수치 재검증
- **Priority**: Must
- **Description**: 수정 후 실제 Supabase 데이터로 동일 기간을 조회해 `all == b2c + b2b`가 매출·환불·건수에서
  성립하는지 확인한다(스크립트는 커밋하지 않는 임시 검증용).
- **Acceptance Criteria**: 2026-07-01~08-12 기준 B2B 매출 43,405,000원 / B2C 114,245,725원 /
  합계 157,650,725원이 라우트 로직으로 재현된다.
- **Verification**: (MANUAL) 검증 스크립트 출력 대조

## Technical Design

### Architecture
- `src/lib/crm-stats-core.ts` — `RelatedCompanyRef` 타입 + `relatedCompanyId()` + `paymentMatchesSegment()` 추가,
  `filterPaymentsBySegment()` 제거.
- `src/app/api/crm/stats/route.ts` — 지역 함수 삭제, 공용 헬퍼 import 후 `.filter((p) => paymentMatchesSegment(p, segment))`.
- `src/app/api/crm/stats/detail/route.ts` — 인라인 필터를 동일 헬퍼로 교체.
- UI 변경 없음. 쿼리 셀렉트 문자열 변경 없음(관계 조회는 그대로 유지).

### Dependencies
없음. 기존 Supabase 테이블(`students`, `payments`)만 사용.

## Traceability Matrix

| REQ ID  | Description                        | Verification | Test File                                       | Status  |
|---------|------------------------------------|--------------|-------------------------------------------------|---------|
| REQ-001 | 객체/배열 관계 파싱 헬퍼            | (TEST)       | `src/lib/__tests__/crm-stats-core.test.ts`      | Done |
| REQ-002 | 두 라우트가 공용 헬퍼 사용          | (TEST)       | `src/app/api/crm/stats/__tests__/route.test.ts` | Done |
| REQ-003 | 죽은 헬퍼 제거                      | (TEST)       | `npx vitest run` (55 파일 / 524 테스트 통과)     | Done |
| REQ-004 | 실데이터 all == b2c + b2b 재검증    | (MANUAL)     | 임시 검증 스크립트                              | Done |

### REQ-004 검증 결과 (수정 후)

| 기간 | 세그먼트 | 건수 | 순매출 | 총결제 | 환불 |
|------|---------|------|--------|--------|------|
| 2026-07-01~08-12 | all | 71 | 157,650,725 | 171,255,500 | -13,604,775 |
| | b2c | 50 | 114,245,725 | 126,160,500 | -11,914,775 |
| | b2b | 21 | 43,405,000 | 45,095,000 | -1,690,000 |
| 2026-01-01~08-12 | all | 338 | 745,193,381 | 797,159,500 | -51,966,119 |
| | b2c | 265 | 571,473,381 | 617,262,000 | -45,788,619 |
| | b2b | 73 | 173,720,000 | 179,897,500 | -6,177,500 |

두 기간 모두 건수·순매출·총결제·환불에서 `all == b2c + b2b`가 성립하고,
`students` 테이블 직접 조회로 만든 정답 분류와 b2c/b2b 값이 일치한다.

## Implementation Order

1. REQ-001 — 헬퍼와 테스트 먼저 (Red → Green)
2. REQ-002 — 헬퍼 확정 후 라우트 교체, mock 형태 교정
3. REQ-003 — 라우트가 새 헬퍼만 쓰는 것을 확인한 뒤 삭제
4. REQ-004 — 코드 확정 후 실데이터 대조

## Out of Scope

- `/api/crm/b2b/stats`(업체별 집계) — 이미 company_id를 직접 필터하므로 영향 없음
- 리드 세그먼트 필터 로직 — 쿼리 레벨 필터로 정상 동작 확인됨
- UI/문구 변경
