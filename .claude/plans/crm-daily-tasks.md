# CRM "오늘 할 일" 탭 — 액션 필요 명단 + 오늘 취한 액션

## Overview

CRM은 "오늘 반드시 액션을 취해야 하는 인원"(미연락 5일+ / 단계 SLA 정체)을 동적으로 계산하지만 칸반 상단 배너로만 보여주고, "완료" 체크는 localStorage에만 저장한다 — 브라우저 한정·팀 미공유·기록 없음. 또한 "그래서 오늘 무슨 액션을 취했는지"를 보는 화면이 없다.

이 기능은 새 탭 **"오늘 할 일"** 을 추가해 (1) 오늘 액션이 필요한 명단과 (2) 오늘 실제 취한 액션을 한 화면에 보여주고, 완료 체크를 DB에 영구 저장(팀 공유)한다.

## Requirements

### REQ-001: 완료 상태 DB 영구 저장 컬럼
- **Priority**: Must
- **Description**: `students.daily_action_done_at TIMESTAMPTZ` 컬럼을 추가해 액션 완료 체크 시각을 저장한다. "오늘 완료" 판정은 KST(Asia/Seoul) 날짜 == 오늘 기준.
- **Acceptance Criteria**: 마이그레이션 적용 후 컬럼 존재. PATCH로 값 저장 시 새로고침 후에도 유지.
- **Verification**: (TEST) `isActionDoneToday`가 KST 자정 경계에서 올바르게 today를 판정한다.

### REQ-002: 날짜 헬퍼 (KST)
- **Priority**: Must
- **Description**: `kstDateStr(ms)`, `isActionDoneToday(s, nowMs)`, `todaysMemos(s, nowMs)`를 `src/types/crm.ts`에 추가. UTC 기준 기존 localStorage 키 버그(오전 9시 리셋)를 KST 기준으로 교정.
- **Acceptance Criteria**: 오늘/어제 경계의 타임스탬프를 KST 기준으로 정확히 분류.
- **Verification**: (TEST) `todaysMemos`가 오늘 메모만 반환, 어제 메모는 제외. KST 00:00 경계 케이스 통과.

### REQ-003: "오늘 할 일" 탭 — 액션 필요 명단 (섹션 A)
- **Priority**: Must
- **Description**: 새 탭에서 `stalledStudents`(정체일수 desc) + `followUpStudents`(미연락일수 desc)를 등급 우선 정렬로 표시. `isActionDoneToday` 학생 제외. 각 행: 완료 체크박스, 이름, 사유(N일 정체/N일 미연락), 현재 단계, 권장 액션. 체크 시 `onStudentUpdate(id, { daily_action_done_at })` 저장.
- **Acceptance Criteria**: 명단이 사유·권장 액션과 함께 표시되고, 체크하면 명단에서 사라지며 DB에 저장된다.
- **Verification**: (BROWSER) 오늘 할 일 탭에서 명단 표시 → 체크 → 새로고침 후 유지 확인.

### REQ-004: "오늘 할 일" 탭 — 오늘 취한 액션 (섹션 B)
- **Priority**: Must
- **Description**: `students` 중 오늘(KST) 작성된 메모가 있거나 오늘 완료 체크된 학생을 표시. 이름 + 오늘 메모 텍스트(없으면 "처리 완료").
- **Acceptance Criteria**: 학생에 오늘 메모를 남기면 섹션 B에 메모 내용과 함께 등장.
- **Verification**: (BROWSER) 패널에서 메모 작성 → 섹션 B에 노출 확인.

### REQ-005: 칸반 배너 완료 체크를 DB로 통일
- **Priority**: Should
- **Description**: `SalesKanban` 배너의 localStorage 완료 체크를 `daily_action_done_at`(via `onStudentUpdate`)로 교체하고 죽은 localStorage 코드 제거. 배너와 새 탭이 동일 DB 상태 공유.
- **Acceptance Criteria**: 배너에서 체크한 항목이 새 탭에서도 완료 처리됨.
- **Verification**: (BROWSER) 배너 체크 → 오늘 할 일 탭 교차 확인.

## Technical Design

### Architecture
- DB: 마이그레이션 `supabase/migrations/055_daily_action_done.sql` (단일 컬럼 추가).
- 타입/헬퍼: `src/types/crm.ts` (기존 `isStageStalled`/`daysInStage` 옆).
- UI: `src/app/admin/crm/components/DailyTasks.tsx` (신규), `page.tsx` 탭 추가, `SalesKanban.tsx` 배너 정리.
- 저장: 기존 PATCH `/api/crm/students/[id]`(임의 필드 통과) + `handleStudentUpdate`(낙관적 업데이트). 신규 API 없음.
- 재사용: `followUpStudents`/`stalledStudents`(page.tsx), `FUNNEL_NEXT_ACTION`, `FUNNEL_STAGE_LABELS`, `effectiveLeadTier`, 기존 메모 플로우(`MemoSection`).

### Dependencies
- 기존 Supabase, vitest. 신규 외부 의존성 없음.

## Traceability Matrix

| REQ ID  | Description                  | Verification | Test File                              | Status  |
|---------|------------------------------|--------------|----------------------------------------|---------|
| REQ-001 | daily_action_done_at 컬럼    | (TEST)       | `src/lib/__tests__/daily-tasks.test.ts` | Pending |
| REQ-002 | KST 날짜 헬퍼                | (TEST)       | `src/lib/__tests__/daily-tasks.test.ts` | Pending |
| REQ-003 | 명단 섹션 A                  | (BROWSER)    | manual + Playwright                    | Pending |
| REQ-004 | 오늘 취한 액션 섹션 B        | (BROWSER)    | manual + Playwright                    | Pending |
| REQ-005 | 배너 DB 통일                 | (BROWSER)    | manual + Playwright                    | Pending |

## Implementation Order

1. REQ-002 — 헬퍼 + 단위 테스트 먼저 (TDD red→green).
2. REQ-001 — 마이그레이션 + Student 타입.
3. REQ-003, REQ-004 — DailyTasks 컴포넌트 + 탭.
4. REQ-005 — 배너 정리(헬퍼 의존).

## Out of Scope

- 예정 일정(OT/콜) 기반 명단, 재시도 리드 명단, 수동 지정(이번 범위 제외 — 사용자 확인).
- 액션 유형 구조화 로그(별도 테이블) — 이번엔 기존 메모 재사용.
- 다일치 완료 이력(히스토리) — 메모 타임라인이 이력 역할.
