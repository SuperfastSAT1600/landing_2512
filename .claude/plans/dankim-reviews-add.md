# Dan Kim 코치 후기 5개 추가

## Overview

Dan Kim 코치 프로필(SAT Math/RW, AP Calculus BC, AP Physics, 1:1 맞춤 수업, 매주 학부모 피드백)을 바탕으로 신규 후기 5개를 reviews.json에 추가한다.

## Requirements

### REQ-001: 후기 5개 데이터 추가
- **Priority**: Must
- **Description**: dankim-r-001 ~ dankim-r-005 ID로 후기 5개를 reviews.json에 추가
- **Acceptance Criteria**: coachSlug: "dankim", status: "published"
- **Verification**: (MANUAL) /coaches/dankim 후기 탭 노출 확인

## Technical Design

- 대상 파일: `src/data/reviews.json`
- 커버 주제: SAT Math 함정 유형, SAT RW 구조 읽기, AP Calc BC 5점, AP Physics 개념 설명, 학부모 피드백 후기

## Traceability Matrix

| REQ ID  | Description       | Verification | Status  |
|---------|-------------------|--------------|---------|
| REQ-001 | 후기 5개 JSON 추가 | (MANUAL)     | Pending |

## Out of Scope
- 컴포넌트 UI 변경 없음
