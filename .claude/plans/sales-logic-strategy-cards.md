# 세일즈 로직 통계 — 전략별 독립 카드 UI

## Overview

CRM "세일즈 전략 > 세일즈 로직 통계" 탭을 전체 요약(4카드)+테이블 구조에서, 옆 탭 "실험"처럼 **전략(로직)별 독립 카드** 구조로 재구성한다. 각 카드에서 해당 전략으로 진행된 리드 목록과 수치 결과를 바로 확인하는 것이 목표. 전체 집계는 불필요하다는 판단으로 제거한다. 백엔드 변경 없음(기존 집계·드릴다운 API 재사용).

## Requirements

### REQ-001: 전략별 리드 테이블 컴포넌트 추출
- **Priority**: Must
- **Description**: `StatsDetailModal`의 leads 표 렌더 블록과 헬퍼(`leadStatus`, `STATUS_BADGE`, `LeadDisplayStatus`, `stageLabel`, `byInquiryDateAsc`, `kstDate`)를 신규 `LeadDetailTable.tsx`로 추출/export. 모달은 이를 import해 leads 블록을 `<LeadDetailTable>`로 교체(동작 불변).
- **Acceptance Criteria**: 마케팅·소스·전략 등 기존 리드 드릴다운 모달이 회귀 없이 동일하게 렌더된다.
- **Verification**: (TEST) `LeadDetailTable`이 `LeadDetailItem[]`을 받아 이름/유입소스/단계/상태 뱃지/문의일 행을 렌더하고, `leadStatus`가 이탈/결제/세일즈중을 올바르게 분류한다.

### REQ-002: 전략별 카드 리스트로 교체
- **Priority**: Must
- **Description**: `StrategyStats.tsx`에서 롤업 4카드·전략 비교차트·전략 테이블(`StrategyRow`)을 제거하고, `by_strategy`를 `assigned` 내림차순으로 각각 `StrategyCard`로 렌더. 카드에는 전략명 + 지표(배정/컨택률/결제 전환율/매출/평균 전환일, `OverviewCard`·`RateBar` 재사용). 결제·매출 숫자 클릭 시 기존 `StatsDetailModal` 드릴다운 유지. `assigned===0` 전략은 "이 기간 배정 없음" 뮤트 카드.
- **Acceptance Criteria**: 타입 토글(최초 컨택/세일즈/재시도)·기간 프리셋 전환 시 카드 리스트가 갱신되고, 상단 전체 요약·차트는 더 이상 표시되지 않는다.
- **Verification**: (BROWSER) 세일즈 로직 통계 탭에 전략별 카드가 세로로 나열되고 상단 요약/차트가 사라진 것을 스크린샷으로 확인.

### REQ-003: 카드 내 진행 리드 목록 펼치기
- **Priority**: Must
- **Description**: 각 카드의 "배정 리드 N명" 토글을 펼치면 `/api/crm/strategy-stats/detail?type&strategy_id&metric=leads&from&to&segment`를 온디맨드(최초 1회) fetch해 `LeadDetailTable`로 리드 목록 표시. 이름 클릭 시 `onSelectStudent`로 학생 상세 패널 오픈.
- **Acceptance Criteria**: 펼치기 클릭 → 로딩 후 해당 전략 코호트 리드가 표시되고, 이름 클릭 시 상세 패널이 열린다.
- **Verification**: (BROWSER) 카드 펼치기 → 리드 목록 로드 및 이름 클릭 동작 확인.

## Technical Design

### Architecture
- `src/app/admin/crm/components/StrategyStats.tsx` — 메인 재구성(카드 리스트 + `StrategyCard` 내부 컴포넌트).
- `src/app/admin/crm/components/LeadDetailTable.tsx` — 신규(모달에서 추출한 리드 표).
- `src/app/admin/crm/components/StatsDetailModal.tsx` — leads 블록을 `LeadDetailTable`로 교체.
- 재사용: `OverviewCard`/`RateBar`(`stats-primitives.tsx`), `ExperimentCard` 레이아웃 톤(`ExperimentBoard.tsx`).

### Dependencies
- 기존 API `GET /api/crm/strategy-stats`(집계), `GET /api/crm/strategy-stats/detail`(리드/결제 드릴다운). 신규 엔드포인트·스키마·마이그레이션 없음.

## Traceability Matrix

| REQ ID  | Description                    | Verification | Test File                                   | Status  |
|---------|--------------------------------|--------------|---------------------------------------------|---------|
| REQ-001 | LeadDetailTable 추출·분류      | (TEST)       | `src/app/admin/crm/components/__tests__/LeadDetailTable.test.tsx` | Pending |
| REQ-002 | 전략 카드 리스트 교체          | (BROWSER)    | Playwright MCP 스크린샷                     | Pending |
| REQ-003 | 카드 내 리드 펼치기            | (BROWSER)    | Playwright MCP 스크린샷                     | Pending |

## Implementation Order

1. REQ-001 — 리드 표 추출(모달 회귀 없이). 이후 카드가 재사용.
2. REQ-002 — 카드 리스트로 골격 교체.
3. REQ-003 — 카드에 리드 펼치기 결합. 브라우저 검증.

## Out of Scope

- 집계 로직/`PerStrategyRow` 스키마, `strategy-stats` API 변경.
- 전략 라이브러리·실험 탭 변경.
- B2B/B2C는 동일 컴포넌트 공유로 자동 반영(별도 작업 없음).
