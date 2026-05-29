# CRM 리드 삭제 버튼 — 상단 status row 노출

## Overview

StudentDetailPanel 상단 status badges row에 "리드 삭제" 버튼을 추가한다.
현재 이 버튼은 funnel_stage === '0'일 때만 패널 하단 접힌 섹션에 숨어 있다.
리드 평가 흐름 ("의미 있는 리드인가 → 퍼널 배치 → 세일즈 실패 시 이탈")에 맞게
가장 이른 시점에 접근 가능해야 한다.

흐름:
1. 리드 삭제 — 의미 없는 리드 즉시 제거 (funnel_stage === '0'일 때 상단 노출)
2. 리드 인입(퍼널 이동) — 의미 있으면 적절한 퍼널 단계로 배치 (퍼널 pill)
3. 이탈 처리 — 세일즈 실패 시 (이미 상단에 있음)

## Requirements

### REQ-001: 상단 status row에 "리드 삭제" 버튼 추가
- **Priority**: Must
- **Description**: `funnel_stage === '0'` AND `lead_status === 'active'`인 경우 status badges row에 "리드 삭제" 버튼을 표시한다. "이탈 처리" 버튼 앞에 위치시킨다.
- **Acceptance Criteria**: stage 0 학생 패널 열면 상단에 [퍼널pill] [리드 삭제] [이탈 처리] 순으로 보인다.
- **Verification**: (BROWSER) stage 0 학생 클릭 → 패널 상단에 리드 삭제 버튼 확인

### REQ-002: 기존 handleDelete 함수 재사용
- **Priority**: Must
- **Description**: 새 버튼은 기존 `handleDelete()` 함수를 그대로 호출한다. confirm 다이얼로그, API 호출, 패널 닫기 동작 모두 동일.
- **Acceptance Criteria**: 버튼 클릭 시 confirm → DELETE API → 패널 닫힘
- **Verification**: (BROWSER) 리드 삭제 버튼 클릭 → confirm → 삭제 확인

### REQ-003: 하단 "잘못된 리드 삭제" 버튼 제거
- **Priority**: Must
- **Description**: funnel_stage === '0' 조건의 하단 "잘못된 리드 삭제" 버튼(line 740-751)을 제거한다. 상단 버튼과 중복이기 때문.
- **Acceptance Criteria**: 하단에 더 이상 중복 삭제 버튼이 없음
- **Verification**: (BROWSER) stage 0 학생 패널 하단에 삭제 버튼 없음 확인

### REQ-004: 시각적 구분 — 위험 동작 강조
- **Priority**: Should
- **Description**: "리드 삭제"는 되돌릴 수 없는 파괴적 동작이므로 "이탈 처리"보다 더 명확한 빨간 계열로 표시한다. "이탈 처리"는 현재 스타일 유지(gray hover→red).
- **Acceptance Criteria**: 리드 삭제 버튼이 이탈 처리보다 눈에 띄는 빨간 border/text로 표시됨
- **Verification**: (BROWSER) 두 버튼의 색상이 시각적으로 구분됨

## Technical Design

### Architecture
- 수정 파일: `src/app/admin/crm/components/StudentDetailPanel.tsx`
- status badges row (line 498-587):
  - "이탈 처리" 버튼 (line 548-555) 앞에 "리드 삭제" 버튼 조건부 렌더링 추가
  - 조건: `localStudent.funnel_stage === '0' && localStudent.lead_status === 'active'`
- 하단 삭제 버튼 블록 (line 740-751) 제거

### Dependencies
- 기존 `handleDelete()` 함수 그대로 사용
- 기존 `deleting` state 그대로 사용
- 추가 import 불필요

## Traceability Matrix

| REQ ID  | Description                        | Verification | Status  |
|---------|------------------------------------|--------------|---------|
| REQ-001 | 상단 status row에 리드 삭제 버튼    | (BROWSER)    | Pending |
| REQ-002 | 기존 handleDelete 재사용            | (BROWSER)    | Pending |
| REQ-003 | 하단 중복 버튼 제거                 | (BROWSER)    | Pending |
| REQ-004 | 빨간 계열로 시각적 강조             | (BROWSER)    | Pending |

## Implementation Order

1. REQ-001 + REQ-002 — status row에 버튼 추가 (handleDelete 재사용)
2. REQ-004 — 스타일 적용
3. REQ-003 — 하단 중복 버튼 제거

## Out of Scope

- stage 0이 아닌 경우의 삭제 기능 변경
- API 변경
- 삭제 confirm 문구 변경
