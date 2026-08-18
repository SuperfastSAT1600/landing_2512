# Lina 코치 후기 4개 추가

## Overview

Lina 코치 프로필(SAT RW 전략, Academic Writing, 1:1 맞춤 수업, Vice Principal 경력)을 바탕으로 신규 후기 4개를 reviews.json에 추가한다. 날짜 범위는 2026년 1~4월.

## Requirements

### REQ-001: 후기 4개 데이터 추가
- **Priority**: Must
- **Description**: lina-r-005 ~ lina-r-008 ID로 후기 4개를 reviews.json에 추가
- **Acceptance Criteria**: coachSlug: "lina", status: "published", 날짜 2026.01~04 범위
- **Verification**: (MANUAL) /coaches/lina 후기 탭에서 4개 노출 확인

## Technical Design

### Architecture
- 대상 파일: `src/data/reviews.json`
- 기존 lina-r-001~004 다음에 lina-r-005~008 추가
- 커버 주제: RW 고득점 달성, 주제 파악 속도 향상, Personal Statement, 학부모(오답 원인 분석)

## Traceability Matrix

| REQ ID  | Description       | Verification | Status  |
|---------|-------------------|--------------|---------|
| REQ-001 | 후기 4개 JSON 추가 | (MANUAL)     | Pending |

## Implementation Order

1. REQ-001 — reviews.json에 lina-r-005~008 추가

## Out of Scope

- 후기 컴포넌트 UI 변경 없음
- 기존 후기 수정 없음
