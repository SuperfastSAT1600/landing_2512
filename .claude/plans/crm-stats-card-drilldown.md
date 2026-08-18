# CRM 통계 카드 드릴다운 (세부 데이터 리스트)

## Overview

세일즈 통계 오버뷰 카드(신규 리드·컨택 성공률·결제 전환율·총 매출·환불·순매출·순 수익)를 클릭하면,
그 수치를 구성하는 실제 데이터(리드 명단 또는 결제/환불 행)를 리스트로 보여준다.
"이 숫자가 어떤 데이터로 나왔는지" 운영자가 바로 확인할 수 있게 한다.

기존 집계 API(`/api/crm/stats`)와 동일한 기간·필터 기준으로 원본 행을 내려주는 상세 API를 추가하고,
카드 클릭 시 상세 리스트 모달을 띄운다(앱의 기존 모달/드로어 패턴과 일관).

## Requirements

### REQ-001: 상세 데이터 API
- **Priority**: Must
- **Description**: `GET /api/crm/stats/detail?metric=<m>&from&to` (x-admin-key 인증).
  metric별로 집계 API와 동일 기준의 원본 목록을 반환한다.
  - `leads` → 기간 내 신규 리드 전체
  - `contacted` → 초기 리드(재시도 제외) 중 컨택 성공(2단계+ 도달)
  - `paid` → 결제한 리드(최초결제 기준)
  - `revenue` → 결제 행(양수)
  - `refund` → 환불 행(음수)
  - `net_revenue` → 모든 결제·환불 행
  - `net_profit` → 모든 결제·환불 행(부가세 제외 net 포함)
  응답: `{ data: { metric, kind: 'leads'|'payments', count, items[] } }`.
- **Acceptance Criteria**: 각 metric이 집계 카드 수치와 동일한 건수/합계의 행을 반환. 미인증 401, 잘못된 metric 400.
- **Verification**: (TEST) metric별 분류·필터 순수 로직 단위 테스트(인증/파라미터 가드 포함).

### REQ-002: 카드 클릭 → 상세 모달
- **Priority**: Must
- **Description**: `OverviewCard`에 `metric`·`onClick` 추가. 7개 카드 각각 metric 매핑.
  클릭 시 `StatsDetailModal`이 열려 해당 metric을 현재 from/to로 조회해 리스트(테이블)로 표시.
  - kind=leads: 이름·유입 채널·단계·상태·문의일
  - kind=payments: 날짜·학생·상품·금액(·net)·세금유형·유형 + 합계 푸터
  로딩/빈/에러 상태 처리. ESC·배경 클릭·닫기 버튼으로 닫힘.
- **Acceptance Criteria**: 카드 클릭 시 해당 데이터 리스트가 뜨고, 건수/합계가 카드 수치와 일치.
- **Verification**: (BROWSER) 카드 클릭 → 리스트 노출 → 건수 일치 확인.

### REQ-003: 카드 클릭 affordance
- **Priority**: Should
- **Description**: 클릭 가능한 카드에 hover 시 커서/그림자/테두리 강조로 클릭 가능함을 표시.
- **Acceptance Criteria**: 카드에 마우스 오버 시 시각적 피드백.
- **Verification**: (BROWSER) hover 상태 확인.

## Technical Design

### Architecture
- API: `src/app/api/crm/stats/detail/route.ts` — 집계 라우트와 동일한 students/payments 쿼리·필터 재현.
  분류 로직(metric→items)은 `src/lib/crm-stats-detail.ts`의 순수 함수로 추출해 테스트.
  공유 판정은 `@/lib/funnel-stats`의 `hasReachedStage` 재사용.
- 타입: 응답 타입을 detail route에서 export, 모달이 import.
- UI: `src/app/admin/crm/components/StatsDetailModal.tsx` (신규).
  `SalesStats.tsx` — `OverviewCard`에 metric/onClick, 카드별 metric 지정, 모달 상태.

### Dependencies
- 신규 의존성 없음. 기존 supabaseAdmin, funnel-stats 재사용.

## Traceability Matrix

| REQ ID  | Description            | Verification | Test File                                    | Status  |
|---------|------------------------|--------------|----------------------------------------------|---------|
| REQ-001 | 상세 데이터 API/분류    | (TEST)       | `src/lib/__tests__/crm-stats-detail.test.ts` | Done    |
| REQ-002 | 카드 클릭 상세 모달     | (BROWSER)    | 수동 — 관리자 통계 화면                       | Pending |
| REQ-003 | 클릭 affordance        | (BROWSER)    | 수동 — 관리자 통계 화면                       | Pending |

> 검증: 분류 로직 단위 테스트 9개 통과. detail API는 실행 서버에서 401/400 가드 + 실제 조회 확인 —
> 건수가 오버뷰 카드와 정확히 일치(leads 45·contacted 31·paid 12·revenue 20+refund 6=net 26).
> 모달 UI(REQ-002/003)는 Playwright MCP 미가용·인증 화면이라 운영자 수동 확인 권장.

## Implementation Order
1. REQ-001 — 분류 로직(lib) + API.
2. REQ-002 — 모달 + 카드 클릭 연결.
3. REQ-003 — hover 스타일.

## Out of Scope
- 상세 리스트에서의 정렬/검색/페이지네이션(건수 적어 단순 테이블).
- 별도 라우트(페이지) 네비게이션 — 모달 오버레이로 대체.
- 상세에서 행 클릭 시 학생 패널 연동(후속 가능).
