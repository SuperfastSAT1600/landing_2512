# Confidence Required Before Next Question

## Overview

답변을 선택한 문제에서 Next 버튼을 누를 때 Confidence Level이 선택되지 않은 경우 이동을 차단하고, ConfidencePicker를 시각적으로 강조하여 선택을 유도한다.

## Requirements

### REQ-001: Next 버튼 — 답변O + confidence 미선택 시 이동 차단
- **Priority**: Must
- **Description**: 현재 문제에 답변이 있고 confidence가 undefined인 경우 Next 클릭 시 이동하지 않음
- **Acceptance Criteria**: 답변 후 Next 클릭 → 이동 안 됨 + ConfidencePicker 강조
- **Verification**: (MANUAL)

### REQ-002: ConfidencePicker 시각적 강조
- **Priority**: Must
- **Description**: 차단 시 ConfidencePicker에 shake 애니메이션 + 파란 테두리 링 + 안내 문구 표시
- **Acceptance Criteria**: "Confidence level을 선택해주세요" 문구와 시각적 강조 표시
- **Verification**: (MANUAL)

### REQ-003: confidence 선택 시 강조 해제
- **Priority**: Must
- **Description**: 강조 상태에서 confidence 선택하면 즉시 강조 해제
- **Acceptance Criteria**: 버튼 클릭 시 애니메이션 사라짐
- **Verification**: (MANUAL)

### REQ-004: Back / NavGrid는 영향 없음
- **Priority**: Must
- **Description**: Back 버튼과 QuestionNavGrid는 제한 없이 자유롭게 이동 가능
- **Acceptance Criteria**: Back, 번호 클릭 시 confidence 검증 없이 이동
- **Verification**: (MANUAL)

## Files

- `src/app/diagnosis/components/DiagnosticTestView.tsx` — 상태 추가, Next 버튼 로직, 전달
- `src/app/diagnosis/components/ConfidencePicker.tsx` — highlight prop 추가, 스타일 적용
- `src/app/globals.css` — shake 키프레임 (이미 있으면 재사용)

## Out of Scope

- 시간 초과 자동 제출에는 영향 없음
- 답변이 없는 문제(unanswered)는 confidence picker 자체가 안 뜨므로 해당 없음
