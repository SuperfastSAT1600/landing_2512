# CRM 첫 화면 = 오늘 실행

## Overview

CRM(`/admin/crm`)에 접속했을 때 지금은 "리드 현황·통계" 탭이 기본으로 보인다. 다른 구성원이 CRM에 처음 들어와도 오늘 무슨 일을 해야 하는지 바로 알 수 있도록, B2C 모드 기준 첫 화면을 "주차 계획·이행" 탭의 "오늘 실행" 서브뷰로 바꾼다. B2B 모드는 "오늘 실행" 개념 자체가 없으므로(코드상 `dailyView` 미전달) 이번 변경 범위에서 제외한다.

## Requirements

### REQ-001: B2C 워크스페이스 최상위 기본 탭을 '주차 계획·이행'으로 변경
- **Priority**: Must
- **Description**: `B2cWorkspace`의 `activeTab` 초기값을 `'leads'`에서 `'weekly'`로 변경한다.
- **Acceptance Criteria**: CRM을 B2C 모드로 열면(새로고침 포함) 최상위 탭 중 "주차 계획·이행"이 선택된 상태로 렌더링된다.
- **Verification**: (BROWSER) dev 서버에서 `/admin/crm` 접속(B2C 모드) 후 첫 렌더 스크린샷으로 확인.

### REQ-002: WeeklyPlan 서브뷰 기본값을 '오늘 실행'으로 변경
- **Priority**: Must
- **Description**: `WeeklyPlan`의 `subView` 초기값을 `'plan'`에서 `'today'`로 변경한다(단, `dailyView`가 없을 때 — 즉 B2B — 는 `subView` 상태가 렌더링에 영향을 주지 않으므로 그대로 안전).
- **Acceptance Criteria**: "주차 계획·이행" 탭에 처음 진입하면(B2C) "오늘 실행"이 선택된 상태로 `DailyTasks`(오늘 액션 필요 명단 / 오늘 취한 액션)가 바로 보인다. "주간 계획" 버튼을 누르면 기존 주간 계획 뷰로 전환된다(기존 동작 유지).
- **Verification**: (BROWSER) B2C 모드로 CRM 진입 → "오늘 액션 필요 명단"/"오늘 취한 액션" 카드가 첫 화면에 바로 보이는지 확인. "주간 계획" 클릭 시 기존 뷰(집중 전략/실행/목표/회고)로 정상 전환되는지 확인.

## Technical Design

### Architecture
- `src/app/admin/crm/components/B2cWorkspace.tsx`: `useState<B2cTab>('leads')` → `useState<B2cTab>('weekly')`
- `src/app/admin/crm/components/WeeklyPlan.tsx`: `useState<'plan' | 'today'>('plan')` → `useState<'plan' | 'today'>('today')`
- B2B(`B2bWorkspace.tsx`)는 수정하지 않음 — `dailyView`를 넘기지 않으므로 `subView` 기본값 변경이 화면에 영향 없음, 최상위 탭도 그대로 `'overview'` 유지.

### Dependencies
없음. 상태 초기값만 바꾸는 순수 프론트엔드 변경.

## Traceability Matrix

| REQ ID  | Description                          | Verification | Test File | Status  |
|---------|---------------------------------------|---------------|-----------|---------|
| REQ-001 | B2C 최상위 기본 탭 = 주차 계획·이행   | (BROWSER)     | 수동/Playwright 스크린샷 | Pending |
| REQ-002 | WeeklyPlan 기본 서브뷰 = 오늘 실행     | (BROWSER)     | 수동/Playwright 스크린샷 | Pending |

## Implementation Order

1. REQ-001 — 최상위 탭 기본값부터 변경해야 오늘 실행 화면까지 도달 가능
2. REQ-002 — REQ-001 이후 진입한 weekly 탭에서 서브뷰 기본값 변경

## Out of Scope

- B2B 모드에 "오늘 실행" 개념을 새로 추가하는 것
- crmMode(B2C/B2B) 자체의 기본값 변경
- 기존 "리드 현황·통계", "주간 계획" 등 다른 탭 로직/데이터 변경
