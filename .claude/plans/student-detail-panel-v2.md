# StudentDetailPanel v2 — 퍼널 가이드 + 기본정보 수정

## Overview

학생 상세 패널의 두 가지 핵심 UX 문제 해결:
1. 퍼널 단계 변경 시 현재 단계에서 무엇을 해야 하는지 컨텍스트가 없음
2. 잘못 입력된 기본 정보(이름, 학년, 연락처 등)를 패널에서 수정할 수 없음

## Requirements

### REQ-001: 퍼널 단계 가이드 박스
- **Priority**: Must
- **Description**: 퍼널 드롭다운 아래에 현재 단계의 의미와 다음 액션을 안내하는 컨텍스트 박스 표시
- **Acceptance Criteria**: 각 단계 선택 시 "지금 할 일"과 "다음 단계" 텍스트 표시. 명확한 다음 단계가 있으면 "다음 단계로 이동" 버튼 제공
- **Verification**: (BROWSER) 각 퍼널 단계 선택 후 안내 텍스트 변경 확인

### REQ-002: 드롭다운에서 'churned' 제거
- **Priority**: Must
- **Description**: 퍼널 드롭다운에서 'churned' 옵션 제거. 이탈은 "학생 상태" 섹션의 "이탈 처리" 버튼으로만 가능
- **Acceptance Criteria**: 드롭다운에 '이탈' 옵션이 없음. 이탈 처리 버튼은 그대로 동작
- **Verification**: (BROWSER) 드롭다운에서 이탈 옵션 미노출 확인

### REQ-003: 기본 정보 편집 모드
- **Priority**: Must
- **Description**: "학생 정보" 섹션에 "편집" 버튼 추가. 클릭 시 인라인 편집 모드로 전환되어 모든 기본 필드를 수정 가능
- **Acceptance Criteria**: 편집 모드에서 name, grade, school_type, contact_type, parent_phone, desired_subjects, previous_score_status, previous_rw_score, previous_math_score, target_score, target_test_date, parent_timezone 수정 가능. 저장 시 PATCH API 호출, 취소 시 원래 값으로 복원
- **Verification**: (BROWSER) 필드 수정 후 저장 → 패널 재오픈 시 변경값 유지 확인

### REQ-004: 인입 정보 편집
- **Priority**: Should
- **Description**: 인입 분류 정보(inquiry_channel, traffic_source, content_author, lead_type, b2b_partner, inquiry_date)도 편집 모드에서 수정 가능
- **Acceptance Criteria**: 편집 모드에서 드롭다운으로 인입 정보 변경 가능
- **Verification**: (BROWSER) 유입소스 변경 저장 후 확인

## Technical Design

### Architecture

- `StudentDetailPanel.tsx` 수정 (단일 파일, 현재 513줄)
- 편집 상태: `isEditing: boolean` state 추가
- 편집 폼 값: `editForm: Partial<Student>` state
- 퍼널 가이드: `FUNNEL_GUIDE` 상수 (컴포넌트 파일 내 정의)
- `SALES_STAGES`만 드롭다운에 노출 (churned 제외)
- 편집 저장: PATCH `/api/crm/students/[id]` with changed fields only
- 컴포넌트 분리: `StudentInfoEdit` 내부 컴포넌트로 추출하여 줄 수 관리

### Key Decisions
- 편집 모드는 인라인(모달 없음) — 패널 자체가 이미 사이드 패널이므로 중첩 모달 불필요
- GRADE_OPTIONS import from crm.ts (방금 추가됨)
- 저장 시 전체 필드가 아닌 변경된 필드만 PATCH

## Traceability Matrix

| REQ ID  | Description | Verification | Status |
|---------|-------------|--------------|--------|
| REQ-001 | 퍼널 가이드 박스 | (BROWSER) | Pending |
| REQ-002 | churned 드롭다운 제거 | (BROWSER) | Pending |
| REQ-003 | 기본정보 편집 모드 | (BROWSER) | Pending |
| REQ-004 | 인입정보 편집 | (BROWSER) | Pending |

## Implementation Order

1. REQ-002 — 가장 단순, 버그 수정 성격
2. REQ-001 — 퍼널 가이드 상수 + UI 추가
3. REQ-003 — 편집 state + 폼 + PATCH 연동
4. REQ-004 — REQ-003 편집 폼에 인입 필드 추가

## Out of Scope

- 상담 타임라인 편집/삭제
- 재활성화 로그 편집
- 코치 매칭 관련 필드
