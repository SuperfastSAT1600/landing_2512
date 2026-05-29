# CRM StudentDetailPanel — 결제 완료 버튼 추가

## Overview

StudentDetailPanel 상단 status badges row에 "결제 완료" 버튼을 추가한다.
칸반 카드의 결제 완료 버튼과 동일하게 PaymentModal을 열어 결제 정보를 입력받는다.
버튼 위치는 퍼널 pill 다음, 이탈 처리 앞.

순서: [리드 삭제*] → [퍼널 pill] → [결제 완료] → [이탈 처리]
(*stage 0일 때만)

## Requirements

### REQ-001: status row에 "결제 완료" 버튼 추가
- **Priority**: Must
- **Description**: `lead_status === 'active'`인 경우 "결제 완료" 버튼을 퍼널 pill 뒤, 이탈 처리 앞에 표시한다.
- **Acceptance Criteria**: active 학생 패널 상단에 결제 완료 버튼이 보인다.
- **Verification**: (BROWSER) active 학생 패널 열기 → 버튼 확인

### REQ-002: PaymentModal 연동
- **Priority**: Must
- **Description**: 버튼 클릭 시 기존 PaymentModal을 열고, onConfirm에서 student의 lead_status를 onUpdate로 반영한다.
- **Acceptance Criteria**: 모달에서 결제 완료 시 학생 상태가 업데이트됨
- **Verification**: (BROWSER) 결제 정보 입력 → 완료 → 상태 변경 확인

## Technical Design

- 수정 파일: `src/app/admin/crm/components/StudentDetailPanel.tsx`
- `PaymentModal` import 추가
- `showPaymentModal` boolean state 추가
- 결제 완료 버튼: `lead_status === 'active'` 조건, 이탈 처리 앞에 삽입
- PaymentModal 렌더링: 패널 하단(ChurnModal 옆)에 조건부 렌더링
- onConfirm: `onUpdate(student.id, { lead_status: updatedStudent.lead_status })` 호출 후 모달 닫기

## Out of Scope
- PaymentModal 자체 수정
- inactive/reactivating 상태에서의 결제 처리
