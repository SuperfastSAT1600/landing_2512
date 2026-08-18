# CRM 퍼널 단계별 이동 기간·비율 통계

## Overview

CRM 통계 탭(`SalesStats`)에 **세일즈 퍼널 단계별 이동 분석**을 추가한다.
영업자가 "어느 단계에서 학생이 오래 머무는가(병목)"와 "각 단계에서 다음 단계로 얼마나 넘어가는가(전환 누수)"를 볼 수 있게 한다.

데이터 원천은 이미 존재하는 `students.stage_history`
(`Array<{ stage, label, entered_at }>` — `funnel_stage` 변경/결제 시 자동 append, migration 050)와
`students.funnel_stage` / `funnel_stage_updated_at`.

**주의(데이터 한계)**: `stage_history`는 migration 050 배포 이후의 단계 변경만 기록한다.
그 이전에 이동한 학생은 이력이 비어 있을 수 있으므로, 도달/이동 비율은 현재 `funnel_stage`(최대 도달 단계)
기준으로 보강 계산하고, 체류 기간은 실제 기록된 연속 전환에서만 산출한다(표본 수를 함께 노출).

## Requirements

### REQ-001: 단계별 도달·이동 비율 계산
- **Priority**: Must
- **Description**: 순수 함수 `computeStageFlow(students)`가 퍼널 순서(`0,1,2,3a,3b,4,5a,5b,6,7,8`)대로
  각 단계의 `reached`(도달 인원), `advanced`(다음 단계 이상으로 이동한 인원), `advance_rate`(이동률 %)를 계산한다.
  도달/이동은 학생이 거친 단계 집합(stage_history ∪ 현재 funnel_stage)의 **최대 도달 인덱스** 기준으로 판정해
  이력이 희소해도 단조 감소하는 퍼널을 보장한다. `churned`는 제외.
- **Acceptance Criteria**: 단계 7에 있는 학생은 0~7 모두 reached로 집계되고, 각 단계 reached는 다음 단계보다 크거나 같다.
- **Verification**: (TEST) 단조 퍼널·이동률 계산 단위 테스트

### REQ-002: 단계별 체류 기간 계산
- **Priority**: Must
- **Description**: `stage_history`를 `entered_at` 오름차순 정렬 후, 연속한 두 엔트리의 시간차를
  "앞 단계에서의 체류 기간(일)"으로 집계한다. 단계별로 `avg_days`(평균), `median_days`(중앙값),
  `sample_size`(전환 표본 수)를 반환한다. 후속 엔트리가 없는 마지막 단계는 체류 기간 집계에서 제외.
- **Acceptance Criteria**: stage_history `[{0, t0},{1, t0+2일},{4, t0+5일}]` 입력 시 단계 0의 체류=2일, 단계 1의 체류=3일.
- **Verification**: (TEST) 평균·중앙값·표본 수 단위 테스트

### REQ-003: 통계 API에 stage_flow 포함
- **Priority**: Must
- **Description**: `GET /api/crm/stats`가 기간 코호트 학생 리스트에 대해 `computeStageFlow`를 호출하여
  응답 `data.stage_flow: StageFlowRow[]`를 추가한다. students 쿼리 select에 `stage_history`, `funnel_stage_updated_at` 추가.
- **Acceptance Criteria**: API 응답에 단계별 `{ stage, label, reached, advanced, advance_rate, avg_days, median_days, sample_size }` 배열 포함.
- **Verification**: (TEST) `computeStageFlow` 함수 테스트로 로직 검증(라우트는 얇은 위임)

### REQ-004: 통계 탭에 퍼널 단계별 이동 테이블 렌더링
- **Priority**: Should
- **Description**: `SalesStats`에 "퍼널 단계별 이동" 섹션을 추가한다. 단계 / 도달 / 다음 단계 이동 / 이동률(바) /
  평균 체류 / 중앙값 체류(표본 수) 컬럼을 가진 테이블. 기존 기간 필터·디자인 토큰 재사용.
- **Acceptance Criteria**: 기간 선택 시 단계별 이동률 바와 체류 기간이 표시된다.
- **Verification**: (BROWSER) /admin/crm → 통계 탭에서 테이블 렌더링 및 값 확인

## Technical Design

### Architecture
- **신규**: `src/lib/funnel-stats.ts` — 순수 계산 함수 `computeStageFlow` + `StageFlowRow` 타입. 테스트 대상.
- **수정**: `src/app/api/crm/stats/route.ts` — students select에 `stage_history, funnel_stage_updated_at` 추가, `stage_flow` 응답 포함, `CrmStatsData`에 필드 추가.
- **수정**: `src/app/admin/crm/components/SalesStats.tsx` — `StageFlowTable` 서브컴포넌트 + 섹션 추가.
- 퍼널 순서/라벨은 `FUNNEL_STAGE_LABELS`(`@/types/crm`) 재사용, 흐름 순서 상수는 `funnel-stats.ts`에 정의.

### Dependencies
없음(기존 supabase, recharts/테이블 패턴 재사용).

## Traceability Matrix

| REQ ID  | Description                       | Verification | Test File                              | Status  |
|---------|-----------------------------------|--------------|----------------------------------------|---------|
| REQ-001 | 단계별 도달·이동 비율             | (TEST)       | `src/lib/__tests__/funnel-stats.test.ts` | Done |
| REQ-002 | 단계별 체류 기간(평균/중앙값)     | (TEST)       | `src/lib/__tests__/funnel-stats.test.ts` | Done |
| REQ-003 | 통계 API stage_flow 포함          | (TEST)       | `src/lib/__tests__/funnel-stats.test.ts` | Done |
| REQ-004 | 통계 탭 단계별 이동 테이블        | (BROWSER)    | manual /admin/crm 통계 탭 (스크린샷 검증) | Done |
| REQ-005 | 컨택 성공 정의 이력 기반 수정     | (TEST)       | `src/lib/__tests__/funnel-stats.test.ts` | Done |
| REQ-006 | 컨택 성공률 카드 분모 일치        | (BROWSER)    | manual /admin/crm 통계 탭 (스크린샷 검증) | Done |

## Implementation Order

1. REQ-001 — 핵심 순수 함수의 비율 로직 (테스트 먼저)
2. REQ-002 — 같은 함수의 기간 로직 (테스트 먼저)
3. REQ-003 — API가 함수에 위임
4. REQ-004 — UI 렌더링 (API 응답 의존)

### REQ-005: 컨택 성공 정의를 이력 기반으로 수정
- **Priority**: Must
- **Description**: `isContacted`를 "현재 funnel_stage가 0/1 아님"에서 "이력상 2단계(세일즈 콜 예약) 이상 도달"로 변경한다.
  `funnel-stats.ts`에 `hasReachedStage(student, stage)` 순수 함수를 추가하고(현재 단계 ∪ stage_history의 최대 도달 인덱스 기준),
  stats 라우트의 overview/채널별/월·주차 컨택 집계가 모두 이를 사용한다. churned는 이력상 2단계 도달 시에만 성공으로 인정.
- **Acceptance Criteria**: 첫 메시지만 보내고 이탈한 리드는 컨택 성공에서 제외되고, 2단계 이상 갔던 리드는 현재 churned여도 성공으로 집계.
- **Verification**: (TEST) `hasReachedStage` 단위 테스트

### REQ-006: 컨택 성공률 카드 분모 일치
- **Priority**: Should
- **Description**: overview에 `contacted_base`(컨택 성공률 분모 = 재시도 제외 초기 리드 수)를 추가하고,
  카드의 `N명 / M명` 표시가 비율 계산과 동일한 분모를 쓰도록 수정한다.
- **Acceptance Criteria**: 카드의 분수 분모와 `contact_rate` 계산 분모가 일치한다.
- **Verification**: (BROWSER) 통계 탭 카드 표시 확인

## Out of Scope

- stage_history 소급 백필(과거 데이터 복원)
- 채널/코치별 단계 이동 분석(현재는 전체 코호트만)
- 차트 시각화(이번엔 테이블만)
- migration 050 이전 데이터의 정확도 보정
