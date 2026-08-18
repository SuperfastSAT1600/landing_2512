# 결제 완료 처리 및 수업중 전환 플로우

## Overview

세일즈 퍼널 7단계("Report 콜 완료") 이후 관리자가 수동으로 결제 완료를 처리하면, 상품과 금액을 입력하고 학생이 "수업 중(enrolled)" 상태로 전환된다. 수업 종료 시 바로 이탈 처리되어 전체 리드풀로 이동한다. 기존 "결제 리드풀" 개념은 제거하고 "수업 중" 뷰로 통합한다.

## Requirements

### REQ-001: 결제 완료 버튼 — 세일즈 칸반 7단계
- **Priority**: Must
- **Description**: SalesKanban에서 `funnel_stage === '7'`인 학생 카드에 "결제 완료" 버튼 노출. 클릭 시 PaymentModal 열림.
- **Acceptance Criteria**: 7단계 카드에만 버튼이 보이고, 다른 단계 카드에는 없음.
- **Verification**: (BROWSER) 세일즈 칸반 7단계 카드에 결제 완료 버튼 확인

### REQ-002: PaymentModal — 상품 선택 + 금액 입력
- **Priority**: Must
- **Description**: 결제 완료 버튼 클릭 시 모달 표시. 상품 트리 선택 후 해당 상품에 시간 입력 필요 여부에 따라 시간 수 입력란 노출. 결제 금액(원) 필수 입력.

상품 목록:
```
SAT 정규수업
  ├─ 관리형 1:1 수업       → 시간 수 입력 필요
  ├─ 관리형 콘텐츠         → 시간 입력 없음
  └─ 비관리형 시간 패키지  → 시간 수 입력 필요
SAT 여름방학 특강          → 시간 입력 없음
AP 정규수업
  └─ 관리형 1:1 수업       → 시간 수 입력 필요
```

- **Acceptance Criteria**: 
  - 카테고리 선택 → 서브 상품 선택 (없으면 바로 금액)
  - 시간 필요 상품 선택 시 시간 수 입력란 표시
  - 금액 미입력 시 확인 버튼 비활성화
  - 확인 클릭 시 결제 기록 저장 + enrolled 전환
- **Verification**: (BROWSER) 모달 상품 선택 트리, 시간 입력, 금액 입력 확인

### REQ-003: 결제 API — payment 기록 저장 + enrolled 전환
- **Priority**: Must
- **Description**: `POST /api/crm/students/[id]/payment` 엔드포인트. payments 테이블에 상품명, 시간 수, 금액, 결제일(오늘) 삽입. students 테이블에서 `lead_status: 'enrolled'` 로 업데이트.
- **Acceptance Criteria**: 
  - payments 행 생성 (product, hours, amount, paid_at)
  - student `lead_status` → `'enrolled'`
  - 응답: `{ data: { payment, student } }`
- **Verification**: (TEST) API 단위 테스트 — 정상 저장, 금액 누락 시 400

### REQ-004: 수업 중 뷰 — lead_status 필터 교체
- **Priority**: Must
- **Description**: EnrolledLeads 컴포넌트의 API 호출을 `paid=true` → `lead_status=enrolled` 로 변경. enrolled 학생만 표시.
- **Acceptance Criteria**: churned/inactive 학생이 수업중 탭에 보이지 않음.
- **Verification**: (BROWSER) 수업중 탭에 enrolled 학생만 표시 확인

### REQ-005: 수업 종료 → 바로 이탈 처리
- **Priority**: Must
- **Description**: EnrolledLeads의 "수업 종료" 버튼 클릭 시 `lead_status: 'inactive'`만 바꾸던 것을 ChurnModal 연결로 교체. 확인 시 `funnel_stage: 'churned'`, `lead_status: 'inactive'` 동시 적용.
- **Acceptance Criteria**: 수업 종료 클릭 → ChurnModal → 이탈 사유 입력 → 전체 리드풀로 이동
- **Verification**: (BROWSER) 수업 종료 후 해당 학생이 리드풀에서 churned 상태로 확인

### REQ-006: 결제 리드풀 탭 제거
- **Priority**: Should
- **Description**: CRM 메인 페이지에서 "결제 리드풀" 탭 키(`enrolled`) 제거. 수업 중 뷰는 기존 EnrolledLeads 컴포넌트를 유지하되 탭 레이블 정리.
- **Acceptance Criteria**: CRM 탭 목록에 별도 "결제 리드풀" 탭 없음.
- **Verification**: (BROWSER) CRM 탭 UI 확인

## Technical Design

### Architecture

**새 파일**
- `src/app/admin/crm/components/PaymentModal.tsx` — 상품 선택 + 금액 입력 모달
- `src/app/api/crm/students/[id]/payment/route.ts` — POST 결제 기록 API

**수정 파일**
- `src/app/admin/crm/components/SalesKanban.tsx` — 7단계 카드에 결제 완료 버튼 + PaymentModal 연결
- `src/app/admin/crm/components/EnrolledLeads.tsx` — API 필터 교체(`lead_status=enrolled`), 수업 종료 → ChurnModal 연결
- `src/app/api/crm/students/route.ts` — `lead_status=enrolled` 필터 지원 추가
- `src/app/admin/crm/page.tsx` — 결제 리드풀 탭 제거

### 상품 데이터 구조

```ts
type ProductCategory = 'sat_regular' | 'sat_summer' | 'ap_regular';
type ProductItem = {
  id: string;
  label: string;
  category: ProductCategory;
  categoryLabel: string;
  requiresHours: boolean;
};
```

### payments 테이블 (기존 스키마 활용)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| student_id | uuid | FK → students |
| product | text | 상품명 (예: "SAT 정규수업 - 관리형 1:1 수업") |
| hours | integer \| null | 시간 수 (해당 없으면 null) |
| amount | integer | 결제 금액 (원) |
| paid_at | date | 결제일 |

### Dependencies
- 기존 `ChurnModal` 컴포넌트 재사용
- Supabase `payments` + `students` 테이블

## Traceability Matrix

| REQ ID  | Description                      | Verification | Status  |
|---------|----------------------------------|--------------|---------|
| REQ-001 | 7단계 카드 결제 완료 버튼         | (BROWSER)    | Pending |
| REQ-002 | PaymentModal 상품 선택 + 금액    | (BROWSER)    | Pending |
| REQ-003 | 결제 API + enrolled 전환          | (TEST)       | Pending |
| REQ-004 | 수업중 뷰 lead_status 필터        | (BROWSER)    | Pending |
| REQ-005 | 수업 종료 → ChurnModal 연결       | (BROWSER)    | Pending |
| REQ-006 | 결제 리드풀 탭 제거               | (BROWSER)    | Pending |

## Implementation Order

1. REQ-003 — API 먼저 (모달이 의존)
2. REQ-002 — PaymentModal (API 완성 후)
3. REQ-001 — SalesKanban 버튼 연결 (모달 완성 후)
4. REQ-004 — EnrolledLeads 필터 교체
5. REQ-005 — 수업 종료 → ChurnModal 연결
6. REQ-006 — 탭 정리

## Out of Scope

- 결제 수단(Stripe/토스/계좌이체) 자동 연동
- 결제 취소/환불 처리
- 시간 소진 추적 (수업 진행 시간 관리)
