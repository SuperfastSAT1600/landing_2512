# Confidence Level 차트 버그 수정 + 어드민 표시 개선

## Overview

두 가지 문제 수정:
1. **차트 버그**: ConfidencePicker는 `0/25/50/75/100` (%) 값을 저장하지만 차트 Y축은 `[0.5, 5.5]` 도메인(1~5 스케일)을 사용 → 모든 점이 domain 밖에 그려져 잘못된 위치에 표시됨.
2. **어드민 표시**: confidence level이 조건부로 숨겨지고, 표시될 때도 raw 숫자(75/5 같이 의미없는 형식)만 나옴.

## Root Causes

- `ConfidencePicker`: values = `0, 25, 50, 75, 100`
- `ReportBehavioralMatrix` Y-axis: `domain={[0.5, 5.5]}`, `ticks={[1,2,3,4,5]}`
- → 75는 domain 밖 → 점이 차트 경계를 벗어나 잘못된 위치에 찍힘
- Admin: `{confidenceLevels[questionId]}/5` → "75/5" 표시 (의미 없음)
- Admin: `confidenceLevels[questionId] !== undefined` 조건으로 old 데이터(null confidence) 숨겨짐

## Requirements

### REQ-001: 차트 Y축 도메인을 실제 데이터(0-100)에 맞게 수정
- **Priority**: Must
- **Description**: Y-axis domain을 `[-12.5, 112.5]`, ticks를 `[0, 25, 50, 75, 100]`으로 변경
- **Acceptance Criteria**: 각 점이 올바른 Y 위치에 표시됨
- **Verification**: (MANUAL) 리포트 페이지에서 차트 확인

### REQ-002: 차트 Y축 라벨을 의미있는 이름으로 표시
- **Priority**: Must
- **Description**: tick formatter로 0→"No Idea", 25→"Guess", 50→"50%", 75→"Sure", 100→"100%"
- **Acceptance Criteria**: Y축 눈금에 숫자 대신 라벨 표시
- **Verification**: (MANUAL)

### REQ-003: 어드민 confidence 표시 항상 보이도록 수정
- **Priority**: Must
- **Description**: answered 문제에 대해 confidence가 없으면 "N/A", 있으면 라벨+% 표시
- **Acceptance Criteria**: 모든 answered 문제마다 confidence row 표시
- **Verification**: (MANUAL) 어드민 상세 페이지 확인

### REQ-004: 어드민 confidence 라벨 의미있게 표시
- **Priority**: Must
- **Description**: raw 숫자 대신 "Fairly Sure (75%)" 형태로 표시, 색상 배지 추가
- **Acceptance Criteria**: 어드민에서 "75/5" 대신 "Fairly Sure · 75%" 표시
- **Verification**: (MANUAL)

## Traceability Matrix

| REQ ID  | Description              | Verification | Status  |
|---------|--------------------------|--------------|---------|
| REQ-001 | Y축 도메인 수정           | (MANUAL)     | Pending |
| REQ-002 | Y축 라벨 formatter        | (MANUAL)     | Pending |
| REQ-003 | 어드민 항상 표시           | (MANUAL)     | Pending |
| REQ-004 | 어드민 라벨 개선           | (MANUAL)     | Pending |

## Implementation Order

1. REQ-001, REQ-002 → `ReportBehavioralMatrix.tsx`
2. REQ-003, REQ-004 → `src/app/admin/diagnosis/[id]/page.tsx`

## Out of Scope

- DB 스키마 변경 (값 형식 유지)
- 과거 데이터 마이그레이션
