# 학부모 포털 메뉴 순서 재편

## Overview

학부모 포털의 탭 순서를 학생 상태(수업 중 여부)에 따라 다르게 표시.
- **수업 중** (`hasSrmData=true`): [학습 리포트] → [상담 기록] → [학생 기본 정보] / 진단 테스트는 학생 기본 정보 내부로 이동
- **수업 중 아님** (`hasSrmData=false`): [상담 기록] → [학생 기본 정보] → [진단 테스트] (기존 유지)

## Requirements

### REQ-001: 수업 중 학생 — 탭 순서 변경
- **Priority**: Must
- **Description**: `hasSrmData=true`일 때 nav 탭 순서를 [학습 리포트, 상담 기록, 학생 기본 정보]로 변경하고 기본 뷰를 `study_hall`로 설정
- **Acceptance Criteria**: 학습 리포트 탭이 첫 번째로 표시되고 포털 진입 시 학습 리포트 화면이 보임
- **Verification**: (BROWSER) 포털 접속 후 첫 화면이 학습 리포트인지 확인

### REQ-002: 수업 중 학생 — 진단 테스트를 학생 기본 정보 내부로 이동
- **Priority**: Must
- **Description**: `hasSrmData=true`일 때 진단 테스트 탭을 제거하고 학생 기본 정보 뷰 하단에 진단 테스트 진입 버튼/섹션 추가
- **Acceptance Criteria**: 학생 기본 정보 탭에서 스크롤 하면 진단 테스트로 이동하는 버튼이 있고, 클릭 시 DiagnosticOverlay가 열림
- **Verification**: (BROWSER) 학생 기본 정보 하단에서 진단 테스트 카드 확인 + 클릭 동작 확인

### REQ-003: 수업 중 아님 학생 — 기존 순서 유지
- **Priority**: Must
- **Description**: `hasSrmData=false`일 때 탭 순서 [상담 기록, 학생 기본 정보, 진단 테스트] 유지
- **Acceptance Criteria**: 수업 중이 아닌 학생의 포털은 기존과 동일하게 동작
- **Verification**: (BROWSER) 수업 중 아닌 학생 포털 확인

## Technical Design

### Architecture
- `src/app/portal/[token]/components/PortalContent.tsx` — 탭 목록 및 순서 로직 변경
- `src/app/portal/[token]/components/StudentInfoOverlay.tsx` — 하단에 진단테스트 진입 섹션 추가 (optional prop)

### Key Changes
1. `PortalContent.tsx`:
   - `allNavItems` 계산 로직: hasSrmData에 따라 다른 배열 반환
   - 초기 `view` 상태: hasSrmData 로드 후 'study_hall'로 설정
   - `StudentInfoOverlay`에 `onShowDiagnostic` 콜백 전달 (hasSrmData && hasDiagnostic 시)
2. `StudentInfoOverlay.tsx`:
   - `onShowDiagnostic?: () => void` prop 추가
   - prop 있을 때 하단에 진단 테스트 카드 렌더링

## Traceability Matrix

| REQ ID  | Description                    | Verification | Status  |
|---------|--------------------------------|--------------|---------|
| REQ-001 | 수업 중 — 탭 순서 + 기본 뷰   | (BROWSER)    | Pending |
| REQ-002 | 수업 중 — 진단테스트 내부 이동 | (BROWSER)    | Pending |
| REQ-003 | 수업 중 아님 — 기존 유지       | (BROWSER)    | Pending |

## Implementation Order

1. REQ-001 — PortalContent nav 배열 + 초기 뷰 변경
2. REQ-002 — StudentInfoOverlay에 진단테스트 진입 UI 추가
3. REQ-003 — 기존 로직 그대로이므로 별도 작업 없음, 회귀 확인만

## Out of Scope

- DiagnosticOverlay 내부 UI 변경
- ConsultationOverlay 내부 UI 변경
- LearningReport 내부 UI 변경
