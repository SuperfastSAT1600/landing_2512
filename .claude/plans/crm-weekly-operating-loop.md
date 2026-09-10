# CRM 주차 계획·이행 → 주간 운영 루프

## Overview
`주차 계획·이행` 탭이 목표 수치 + 할 일 체크리스트만 담아 실제 세일즈 활동(이름 붙은 전략을 특정 리드에게 적용)과 끊겨 있어 쓰이지 않았다. 주 단위 운영 루프(계획 → 실행·결과 → 회고 → 다음 주 이어받기)를 한 화면에서 굴리도록 재구성한다. `세일즈 전략` 탭은 라이브러리 + 장기 누적 성과로 남기고 두 탭을 상호 링크한다.

## Requirements

### REQ-001: 이번 주 집중 전략 (계획)
- **Priority**: Must
- **Description**: 전략 라이브러리에서 이번 주에 밀어볼 전략을 골라 전략별 목표·메모와 함께 저장한다.
- **Acceptance Criteria**: 전략 추가·삭제가 즉시 저장되고, 목표·메모는 blur에서 저장된다. 세그먼트(b2c/b2b)별로 분리 저장된다.
- **Verification**: (TEST) `components/__tests__/WeeklyFocusStrategies.test.tsx`

### REQ-002: 실행·결과 자동 집계
- **Priority**: Must
- **Description**: 그 주에 적용된 전략과 리드를 `students.strategy_history.applied_at` 기준으로 집계해 전략별 적용/컨택/결제/매출과 리드 목록을 보여준다. 계획에 없던 실행은 '계획 외'로 구분한다.
- **Acceptance Criteria**: 주 경계는 KST 기준. 한 리드가 여러 전략을 받으면 각 전략에 모두 집계되고, 같은 전략 중복 적용은 최신 1건으로 합친다. 계획됐지만 적용 0건인 전략도 행이 남는다. 리드 클릭 시 학생 패널이 열린다.
- **Verification**: (TEST) `src/lib/__tests__/weekly-execution.test.ts`, `components/__tests__/WeeklyExecution.test.tsx`

### REQ-003: 전략 적용 기록 (quick-log)
- **Priority**: Must
- **Description**: 주간 화면에서 리드 검색 → 전략 선택 → 메모로 `strategy_history` 엔트리를 남긴다(학생 패널과 동일 shape이라 이중 입력·이중 집계가 없다).
- **Acceptance Criteria**: 기록 즉시 실행 블록에 반영된다. 지난 주차를 보고 있으면 그 주 범위 안의 시각으로 기록된다.
- **Verification**: (TEST) `src/lib/__tests__/strategy-history.test.ts` + (BROWSER)

### REQ-004: 주간 회고 + 다음 주 이어받기
- **Priority**: Must
- **Description**: 잘된 것 / 안된 것·원인 / 다음 주에 할 것 3필드. 항목별 '다음 주로' 버튼이 다음 주 할 일로 이관하고 `carried_to`를 남긴다. 지난주 회고가 비어 있으면 상단 배너로 유도한다.
- **Acceptance Criteria**: 텍스트는 blur에 저장, 항목 추가·이관은 즉시 저장. 이관 실패 시 `carried_to`를 기록하지 않는다. 주차 정의 끝이면 이관 버튼을 숨긴다.
- **Verification**: (TEST) `components/__tests__/WeeklyRetro.test.tsx`

### REQ-005: 부분 업데이트 저장
- **Priority**: Must
- **Description**: `PUT /api/crm/weekly-plan`은 body에 있는 키만 갱신한다(회고 저장이 할 일을 지우지 않도록).
- **Acceptance Criteria**: 정제 규칙(유효 지표 키/전략 타입/텍스트 트림)을 통과한 필드만 저장된다. 마이그레이션 112 이전 행도 기본값으로 정규화해 응답한다.
- **Verification**: (TEST) `src/app/api/crm/weekly-plan/__tests__/{sanitize,route}.test.ts`

### REQ-006: 기존 블록 유지 + 크로스 링크
- **Priority**: Must
- **Description**: `목표 vs 실적`, `이번 주 할 일`, `오늘 실행` 서브탭을 유지하고, 주간 ↔ 세일즈 전략 양방향 링크를 둔다(B2B는 전략이 영업 파이프라인 하위 서브탭).
- **Acceptance Criteria**: 기능 동등. B2C/B2B 모두 동작.
- **Verification**: (BROWSER) `/admin/crm` → 주차 계획·이행, B2C·B2B 각각

## Technical Design

### Data
`supabase/migrations/112_weekly_plan_focus_retro.sql` — `weekly_plans`에 `focus_strategies jsonb`, `retrospective jsonb`, `execution_notes jsonb` 추가(새 테이블 없음). **사용자가 Supabase에서 직접 실행.**

### 집계
`src/lib/weekly-execution.ts` (순수) + `src/app/api/crm/weekly-plan/fetch-execution.ts` (조회).
`strategy-stats.ts`의 "타입별 최신 엔트리 1건" 귀속과 달리 **주 범위 내 모든 적용 이력**을 센다 — 그 규칙은 리드가 다음 주에 다른 전략을 받으면 지난주 기록에서 사라져 주차 로그로 쓸 수 없다.
KST 헬퍼는 `src/lib/kst-day.ts`로 추출해 `strategy-stats.ts`와 공유.

### 컴포넌트
`WeeklyPlan.tsx`(셸) + `components/weekly/`: `useWeeklyPlan.ts`, `WeeklyRetroBanner`, `WeeklyFocusStrategies`, `WeeklyExecution`, `WeeklyExecutionCard`, `WeeklyQuickLog`, `WeeklyTargets`, `WeeklyActions`, `WeeklyNotes`, `WeeklyRetro`, `format.ts` — 모두 200줄 이하.

## Traceability Matrix

| REQ ID | Verification | Test File | Status |
|---|---|---|---|
| REQ-001 | (TEST) | `components/__tests__/WeeklyFocusStrategies.test.tsx` | Passing |
| REQ-002 | (TEST) | `src/lib/__tests__/weekly-execution.test.ts`, `components/__tests__/WeeklyExecution.test.tsx` | Passing |
| REQ-003 | (TEST)(BROWSER) | `src/lib/__tests__/strategy-history.test.ts` | Passing / 브라우저 확인 완료 |
| REQ-004 | (TEST) | `components/__tests__/WeeklyRetro.test.tsx` | Passing |
| REQ-005 | (TEST) | `src/app/api/crm/weekly-plan/__tests__/sanitize.test.ts`, `route.test.ts` | Passing |
| REQ-006 | (BROWSER) | B2C/B2B 스크린샷 확인 | Done |

## 미완 / 후속
- **마이그레이션 112 미적용** — 적용 전에는 집중 전략·회고·보완 기록 저장이 500(“주차 계획 저장에 실패했습니다.”)으로 떨어진다. 목표·할 일은 정상.
- 범위 밖: 재결제(renewal) 주간 코호트 연동, 세일즈 전략 탭 주차별 추이, 회고 AI 초안, 월요일 슬랙 리포트 양방향 연동.
