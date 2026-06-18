# 유입 채널별 성과 — 채널 클릭 드릴다운

## Overview

통계 메뉴의 "유입 채널별 성과" 표(`SourceTable`)에서 각 유입 채널 행을 클릭하면,
해당 채널로 유입된 리드 명단(세부 내역)을 모달로 볼 수 있게 한다.
기존 오버뷰 카드 드릴다운(`StatsDetailModal` + `/api/crm/stats/detail`)을 재사용하되,
`source` 필터를 추가하여 채널 단위로 조회한다. 집계(`by_source`)와 동일한
`traffic_source ?? '미입력'` 기준을 사용해 표의 리드 수와 모달의 건수가 일치하도록 한다.

## Requirements

### REQ-001: source 필터 지원 (데이터 레이어)
- **Priority**: Must
- **Description**: `buildStatsDetail`에 optional `source` 인자를 추가하여, 주어진 경우
  `traffic_source ?? '미입력'`가 일치하는 학생만 대상으로 metric을 계산한다.
  payments도 해당 채널 학생에 속한 행만 포함한다.
- **Acceptance Criteria**: `source='네이버'` 전달 시 네이버 채널 리드만, source 미전달 시 기존과 동일한 전체 결과 반환.
- **Verification**: (TEST) `buildStatsDetail`에 source 필터 케이스 단위 테스트.

### REQ-002: detail API source 파라미터
- **Priority**: Must
- **Description**: `GET /api/crm/stats/detail`에 optional `source` 쿼리 파라미터를 받아
  `buildStatsDetail`에 전달한다.
- **Acceptance Criteria**: `?metric=leads&source=네이버&from=...&to=...` 호출 시 네이버 리드만 반환.
- **Verification**: (MANUAL) curl로 source 파라미터 응답 확인.

### REQ-003: 채널 행 클릭 → 모달
- **Priority**: Must
- **Description**: `SourceTable` 행을 클릭 가능하게 만들고, 클릭 시 `metric='leads'`,
  `source=r.source`, `label=r.source`로 `StatsDetailModal`을 연다.
  모달은 `source` prop을 받아 fetch URL에 포함하고 헤더에 채널명을 표시한다.
- **Acceptance Criteria**: 채널 행 클릭 시 그 채널의 리드 명단이 뜨고, 건수가 표의 리드 수와 일치.
- **Verification**: (BROWSER) Playwright로 채널 행 클릭 → 모달·명단 확인.

### REQ-004: 단계를 퍼널 이름으로 표시
- **Priority**: Must
- **Description**: `StatsDetailModal`의 leads 테이블 "단계" 열에 raw `funnel_stage`(`'1'`,`'8'`,`'churned'`)
  대신 `FUNNEL_STAGE_LABELS` 기반 한글 퍼널 이름을 표시한다. 매핑에 없는 값은 원본 그대로 표시.
- **Acceptance Criteria**: `'1'`→`첫 메시지 발송`, `'8'`→`수업 중`, `'churned'`→`이탈`로 표기.
- **Verification**: (BROWSER) 모달에서 단계 열이 한글 퍼널 이름으로 표기되는지 확인.

### REQ-005: 이탈 사유 표시
- **Priority**: Must
- **Description**: 학생의 `churn_tag`(이탈 사유)를 데이터 레이어(`LeadDetailItem`)와 API select에 추가하고,
  모달 leads 테이블에 "이탈 사유" 열을 추가한다. 이탈(churned) 리드는 `churn_tag`(회신 없음/노쇼/미응시/미결제/기타),
  값이 없거나 비이탈 리드는 `-`로 표시.
- **Acceptance Criteria**: churned 리드 행에 해당 이탈 사유가 보이고, 그 외 행은 `-`.
- **Verification**: (TEST) `toLeadItem`이 `churn_tag`를 매핑하는지 단위 테스트 + (BROWSER) 모달 확인.

### REQ-006: 칸반 상단 소스 칩 드릴다운
- **Priority**: Must
- **Description**: 최초 세일즈 탭 상단 `KanbanStatsStrip`의 "소스별" 칩을 클릭 가능하게 만들어,
  클릭 시 해당 채널(`metric='leads'`, `source=s.source`, 이번 달 범위)로 `StatsDetailModal`을 연다.
  유입 채널별 성과 표 드릴다운과 동일한 상세 내역(이름/채널/단계/상태/이탈 사유/문의일)을 보여준다.
- **Acceptance Criteria**: 소스 칩 클릭 시 그 채널 리드 명단 모달이 뜨고 건수가 칩의 리드 수와 일치.
- **Verification**: (MANUAL) curl로 동일 API 응답 확인 + 코드상 모달 연결 확인.

### REQ-007: 상세 내역에서 학생 이름 → 리드 상세 패널
- **Priority**: Must
- **Description**: `StatsDetailModal`의 leads 테이블에서 학생 이름을 클릭하면 해당 학생의
  `StudentDetailPanel`(최초 세일즈에서 리드 클릭 시 뜨는 상세 패널)이 열린다. 모달은 학생 id를
  상위로 올리는 `onSelectStudent(id)` 콜백을 받고, 호출 후 모달을 닫는다. page.tsx는 id로
  학생을 찾거나(`/api/crm/students/:id`) fetch해 `setSelectedStudent`로 패널을 연다.
  통계 탭(SalesStats)·칸반 탭(KanbanStatsStrip) 양쪽 모달에 동일 적용.
- **Acceptance Criteria**: 모달에서 학생 이름 클릭 시 해당 학생 상세 패널이 뜨고 모달은 닫힌다.
- **Verification**: (MANUAL) 코드 연결 확인 + `/api/crm/students/:id` 응답 확인.

## Technical Design

### Architecture
- `src/lib/crm-stats-detail.ts` — `buildStatsDetail(metric, students, payments, source?)` 확장.
- `src/app/api/crm/stats/detail/route.ts` — `source` 쿼리 파싱 후 전달.
- `src/app/admin/crm/components/StatsDetailModal.tsx` — `source?: string` prop 추가, fetch URL·헤더 반영.
- `src/app/admin/crm/components/SalesStats.tsx` — `SourceTable`에 onRowClick, detail 상태에 source 추가.

### Dependencies
없음 (기존 인프라 재사용).

## Traceability Matrix

| REQ ID  | Description            | Verification | Test File                                   | Status  |
|---------|------------------------|--------------|---------------------------------------------|---------|
| REQ-001 | source 필터 데이터 레이어 | (TEST)       | `src/lib/__tests__/crm-stats-detail.test.ts` | Pending |
| REQ-002 | detail API source param | (MANUAL)     | —                                           | Pending |
| REQ-003 | 채널 행 클릭 → 모달       | (BROWSER)    | manual Playwright                           | Pending |
| REQ-004 | 단계 → 퍼널 이름 표시     | (BROWSER)    | manual Playwright                           | Pending |
| REQ-005 | 이탈 사유 표시           | (TEST)       | `src/lib/__tests__/crm-stats-detail.test.ts` | Pending |
| REQ-006 | 칸반 소스 칩 드릴다운     | (MANUAL)     | —                                           | Pending |
| REQ-007 | 학생 이름 → 상세 패널     | (MANUAL)     | —                                           | Pending |

## Implementation Order

1. REQ-001 — 데이터 레이어가 기반.
2. REQ-002 — API가 REQ-001 사용.
3. REQ-003 — UI가 REQ-002 호출.

## Out of Scope

- 채널별 결제/매출 드릴다운(payments kind) — 이번엔 리드 명단만.
- 채널명 정규화/병합 로직 변경.
