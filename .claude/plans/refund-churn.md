# Spec: 환불 처리 → 이탈 전환

## 목표
수업 중인 학생(lead_status=enrolled)이 환불 요청 시, 환불 결제 기록을 남기고 이탈 처리한다.

## REQ-1: RefundModal 컴포넌트 (BROWSER)
- 파일: `src/app/admin/crm/components/RefundModal.tsx`
- 입력 필드:
  - 환불 금액 (숫자 입력, 필수)
  - 환불 사유 (텍스트, 필수)
  - 이탈 분류: 잠재 복귀 가능 / 완전 종료 (ChurnModal과 동일)
- 확인 버튼 클릭 시 REQ-2 API 호출

## REQ-2: 환불 API (TEST)
- 파일: `src/app/api/crm/students/[id]/refund/route.ts`
- Method: POST
- Body: `{ refund_amount, refund_reason, churn_type }`
- 처리:
  1. payments 테이블에 환불 기록 INSERT
     - amount: -refund_amount (음수)
     - payment_type: '환불'
     - product: '환불'
     - notes: refund_reason
  2. students 테이블 PATCH
     - funnel_stage: 'churned'
     - lead_status: 'inactive'
     - churn_tag: refund_reason
     - churn_type: churn_type

## REQ-3: EnrolledLeads 환불 버튼 (BROWSER)
- 파일: `src/app/admin/crm/components/EnrolledLeads.tsx`
- EnrolledCard에 "환불" 버튼 추가 (수업 종료 버튼 옆)
- 클릭 → RefundModal 오픈

## REQ-4: PaymentHistorySection 환불 표시 (BROWSER)
- 파일: `src/app/admin/crm/components/panel/sections/PaymentHistorySection.tsx`
- payment_type === '환불' 건은 빨간색 + "(환불)" 배지로 표시
- 총 결제액 계산 시 환불 금액 반영 (음수 합산)
