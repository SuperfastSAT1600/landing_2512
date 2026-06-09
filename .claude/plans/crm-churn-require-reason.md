# 리드 이탈 처리 — 모든 태그에 사유 입력 필수화

## Overview

현재 이탈 처리(ChurnModal)는 "기타" 태그를 고를 때만 자유 사유 입력을 요구한다.
모든 태그(회신 없음·노쇼·미응시·미결제·기타)에 대해 **구체적 사유 입력을 필수**로 만들어,
이탈 데이터의 질을 높인다.

저장은 기존 환불 플로우(`churn_tag: "환불: {사유}"`)와 동일한 패턴으로 `churn_tag`에 `"{태그}: {사유}"`로 합쳐 쓴다.
LeadPool의 카테고리 필터는 정확 일치 → prefix 일치로 바꿔 그대로 동작하게 한다.
DB 마이그레이션·API·onConfirm 시그니처 변경 없음.

## Requirements

### REQ-001: 모든 태그에 사유 입력 필수
- **Priority**: Must
- **Description**: ChurnModal에 항상 보이는 필수 "사유" 입력을 둔다. 태그 선택 후 사유가 비어 있으면 "이탈 사유를 입력해주세요" 에러를 띄우고 확정을 막는다. 확정 시 `churn_tag = "{선택 태그}: {사유}"`로 합쳐 `onConfirm`에 전달한다(시그니처 불변).
- **Acceptance Criteria**: 어떤 태그든 사유가 비면 이탈 처리 버튼이 동작하지 않고, 입력하면 `"노쇼: 콜 당일 무응답"` 형태로 저장된다.
- **Verification**: (BROWSER) ChurnModal에서 사유 없이 확정 시도 → 차단, 입력 시 통과

### REQ-002: 이탈풀 카테고리 필터 유지
- **Priority**: Must
- **Description**: `churn_tag`에 사유가 합쳐져도 LeadPool의 카테고리 필터가 동작하도록, 필터 비교를 정확 일치(`!==`)에서 prefix 일치(`startsWith`)로 변경한다. 기존 데이터(사유 없는 bare 태그)도 정상 매칭.
- **Acceptance Criteria**: "노쇼" 필터가 `"노쇼"`와 `"노쇼: ..."` 모두 매칭한다.
- **Verification**: (MANUAL) 코드 리뷰 + 동작 확인

## Technical Design

### Architecture
- `src/app/admin/crm/components/ChurnModal.tsx` (수정) — 항상 보이는 필수 사유 입력, finalTag 합성
- `src/app/admin/crm/components/LeadPool.tsx` (수정) — churnTag 필터 startsWith
- onConfirm 시그니처 `(churnTag, churnType)` 불변 → 4개 호출부(SalesKanban/MatchingKanban/EnrolledLeads/useFunnel) 변경 불필요
- 카드의 `churn_tag` 칩은 합쳐진 문자열을 그대로 표시(truncate로 오버플로 방지)

### Dependencies
없음. `churn_tag`은 TEXT 컬럼(기존 환불 플로우가 이미 합쳐 사용).

## Traceability Matrix

| REQ ID  | Description              | Verification | Test File | Status  |
|---------|--------------------------|--------------|-----------|---------|
| REQ-001 | 모든 태그 사유 필수      | (BROWSER)    | manual (스크린샷) | Done |
| REQ-002 | 카테고리 필터 prefix     | (MANUAL)     | manual    | Done |

## Implementation Order
1. REQ-001 (ChurnModal) → 2. REQ-002 (LeadPool 필터)

## Out of Scope
- 별도 `churn_reason` 컬럼 추가(마이그레이션) — 기존 합성 패턴 유지로 회피
- 환불 플로우(RefundModal)는 이미 사유 필수 — 변경 없음
