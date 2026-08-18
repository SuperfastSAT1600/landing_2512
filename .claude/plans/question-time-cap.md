# Fix: Question Time 상한 없음 — 비정상 측정값 재발 방지

## Overview

컴퓨터 잠자기 → 깨어남 시 `recordQuestionTime()`이 벽시계 시간을 그대로 저장해 102분 같은 비정상값 발생.
두 레이어에서 방어: 저장 시점 cap + 표시 시점 보정.

## Requirements

### REQ-001: recordQuestionTime elapsed 상한 적용
- **Priority**: Must
- **Description**: `timeLimitMinutes * 60`을 초과하는 elapsed를 cap. `timeLimitMinutes` 없으면 cap 없음
- **Acceptance Criteria**: 30분 제한 시험에서 한 문제에 기록되는 시간이 1800초를 초과하지 않음
- **Verification**: (TEST) elapsed=6120, timeLimitMinutes=30 → 저장값 1800

### REQ-002: Admin detail API timeLimitMinutes 노출
- **Priority**: Must
- **Description**: `diagnostic_test_results.time_limit_minutes`가 DB에 있지만 API 응답에 누락. 추가
- **Acceptance Criteria**: `/api/admin/diagnosis/results/[id]` 응답에 `timeLimitMinutes` 포함
- **Verification**: (MANUAL)

### REQ-003: TestResult 타입 timeLimitMinutes 추가
- **Priority**: Must
- **Description**: `TestResult` 인터페이스에 `timeLimitMinutes?: number` 추가
- **Acceptance Criteria**: TypeScript 컴파일 에러 없음
- **Verification**: (MANUAL)

### REQ-004: QuestionStatCard 비정상 시간 표시 보정
- **Priority**: Should
- **Description**: `timeLimitMinutes` prop 추가. timeSeconds > timeLimitMinutes * 60이면 "측정 불가" 표시
- **Acceptance Criteria**: 기존 DB의 비정상값이 그대로 노출되지 않음
- **Verification**: (MANUAL)

## Traceability Matrix

| REQ ID  | Description                    | Verification | File                                              |
|---------|--------------------------------|-------------|---------------------------------------------------|
| REQ-001 | recordQuestionTime cap         | (TEST)      | `src/app/diagnosis/utils/__tests__/submit-guard.test.ts` |
| REQ-002 | API timeLimitMinutes 노출      | (MANUAL)    | `src/app/api/admin/diagnosis/results/[id]/route.ts` |
| REQ-003 | TestResult 타입 추가           | (MANUAL)    | `src/types/diagnosis.ts`                          |
| REQ-004 | QuestionStatCard 표시 보정     | (MANUAL)    | `src/app/admin/diagnosis/[id]/QuestionStatCard.tsx` |

## Implementation Order

1. REQ-003 — 타입 먼저 (이후 구현이 의존)
2. REQ-002 — API 노출
3. REQ-001 — 핵심 버그 수정 + 테스트
4. REQ-004 — 표시 보정 (REQ-002, REQ-003 완료 후)
