# CRM 통계 신규 리드에 B2B 파트너 리드 포함

## Overview

세일즈 통계(`/api/crm/stats`)의 "신규 리드"는 `.is('company_id', null)` 필터 때문에 B2C 개인 리드만 집계한다.
그 결과 2026-07-27~08-02 기간에서 실제 인입 16건 중 B2B 파트너 리드(이도윤 · 공부하는 아이들)가 빠져 15건으로 표시됐다.
매출(payments) 집계에는 업체 필터가 없어 B2B 학생 결제는 이미 포함되므로, 리드만 제외되는 비대칭 상태다.

B2B 파트너 리드도 신규 리드로 합산해 보이도록 수정한다. 업체별 세부 집계(`/api/crm/b2b/stats`)는 그대로 유지한다.

## Requirements

### REQ-001: B2B 리드를 신규 리드 집계에 포함
- **Priority**: Must
- **Description**: `/api/crm/stats`의 students 조회에서 `.is('company_id', null)` 필터를 제거해 `company_id`가 있는 리드도 기간 코호트(`inquiry_date`)에 포함한다. overview/by_source/monthly/weekly/stage_flow 모두 동일 코호트를 쓴다.
- **Acceptance Criteria**: 2026-07-27~08-02 조회 시 `overview.total_leads = 16` (기존 15), `by_source`에 `B2B 파트너` 행이 나타난다.
- **Verification**: (TEST) B2B 리드 1건 + B2C 리드 1건을 반환하는 mock으로 `total_leads=2`, `by_source`에 `B2B 파트너` 포함 확인

### REQ-002: 센터형 파트너 리드의 컨택 성공 판정 일관성
- **Priority**: Must
- **Description**: B2B 탭과 동일하게, 센터형 파트너(`CONTACT_IMPLIED_PARTNERS`, 예: 공부하는 아이들) 소속 리드는 퍼널 단계와 무관하게 컨택 성공으로 본다. `companies` 로스터를 조회해 `company_id → name`을 만들고 `isContactedWithImpliedPartner`를 사용한다.
- **Acceptance Criteria**: 퍼널 1단계인 센터형 파트너 리드가 `overview.contacted`에 포함된다. 일반 B2C 리드 판정은 기존과 동일(2단계+ 도달).
- **Verification**: (TEST) 1단계 파트너 리드 + 1단계 B2C 리드 mock → `contacted=1`

### REQ-003: 카드에 B2B 포함 사실 표기
- **Priority**: Should
- **Description**: SalesStats "신규 리드" 카드 부제를 `문의 기준`에서 `문의 기준 · B2B 포함`으로 바꿔 집계 범위를 드러낸다.
- **Acceptance Criteria**: CRM 통계 화면 신규 리드 카드에 `문의 기준 · B2B 포함` 표시.
- **Verification**: (BROWSER) `/admin/crm` 통계 탭에서 카드 부제와 리드 수 확인

## Technical Design

### Architecture
- `src/app/api/crm/stats/route.ts` — students 조회에서 업체 필터 제거, `company_id` 컬럼 추가 select, `companies` 조회를 기존 `Promise.all`에 추가, 컨택 판정을 지역 헬퍼 `isContactedLead()`로 통일(overview/by_source/monthly/weekly 4곳).
- `src/lib/crm-stats-core.ts` — 기존 `isContactedWithImpliedPartner`, `CONTACT_IMPLIED_PARTNERS` 재사용. 신규 로직 없음.
- `src/app/admin/crm/components/SalesStats.tsx` — 카드 부제 문구.
- `/api/crm/b2b/stats`, `/api/crm/stats/detail`은 변경 없음 (detail은 이미 업체 필터가 없어 자동으로 정합).

### Dependencies
없음. 기존 Supabase 테이블(`students`, `companies`, `payments`)만 사용.

## Traceability Matrix

| REQ ID  | Description                          | Verification | Test File                                     | Status  |
|---------|--------------------------------------|--------------|-----------------------------------------------|---------|
| REQ-001 | B2B 리드 신규 리드 합산               | (TEST)       | `src/app/api/crm/stats/__tests__/route.test.ts` | Done |
| REQ-002 | 센터형 파트너 컨택 성공 판정          | (TEST)       | `src/app/api/crm/stats/__tests__/route.test.ts` | Done |
| REQ-003 | 카드 부제에 B2B 포함 표기             | (BROWSER)    | 수동 확인 (`/admin/crm` 통계 탭)               | Done |

## Implementation Order

1. REQ-001 — 코호트 필터가 모든 집계의 기준이므로 먼저
2. REQ-002 — REQ-001로 들어온 B2B 리드의 컨택 판정을 B2B 탭과 맞춤
3. REQ-003 — 데이터가 맞은 뒤 표기 갱신

## Out of Scope

- `/api/crm/b2b/stats` 업체별 집계 로직 (그대로 유지, 이중 표시는 의도된 별도 뷰)
- `/api/crm/stats/detail`의 `created_at` 폴백 날짜 필터 (집계 라우트와 기준이 다른 기존 불일치 — 현재 기간에는 영향 없음(inquiry_date NULL 465건 모두 조회 기간 밖), 별도 이슈로 남김)
- B2B 학생의 `traffic_source` 값 보정 (69건 중 67건이 이미 `B2B 파트너`)
