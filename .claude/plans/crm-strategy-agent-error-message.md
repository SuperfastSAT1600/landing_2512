# CRM 전략 챗 에러 메시지 정확화

## Overview

전략 AI 챗(`/api/crm/strategy-agent`)이 실패하면 원인과 무관하게 항상 "웹 검색이 계정에 활성화되어 있는지 확인해주세요"를 출력해 오진을 유발한다. 실제로는 크레딧 부족(`credit balance too low`)이 원인이었다. 에러 종류를 구분해 정확한 안내를 제공한다.

## Requirements

### REQ-001: Anthropic 에러 → 사용자 메시지 매핑 헬퍼
- **Priority**: Must
- **Description**: `anthropicErrorMessage(err)`를 추가. 크레딧 부족 / 인증 실패 / rate limit·overloaded / 웹 검색 / 기타를 구분해 한국어 메시지 반환.
- **Acceptance Criteria**: 각 케이스에 맞는 메시지를 반환하고, 미분류는 일반 메시지로 폴백.
- **Verification**: (TEST) 케이스별 입력 에러에 대해 기대 메시지 반환.

### REQ-002: 두 라우트의 catch에서 헬퍼 사용
- **Priority**: Must
- **Description**: `strategy-agent`·`sales-strategy` 라우트의 stream catch가 고정 문구 대신 `anthropicErrorMessage(err)`를 enqueue.
- **Acceptance Criteria**: 크레딧 부족 시 "AI 크레딧 잔액이 부족합니다…" 메시지가 나온다.
- **Verification**: (TEST) 헬퍼 단위 테스트로 대체. (MANUAL) 크레딧 충전 후 정상 동작 확인.

## Technical Design
- 신규: `src/lib/anthropic-error.ts` (+ `src/lib/__tests__/anthropic-error.test.ts`).
- 수정: `src/app/api/crm/strategy-agent/route.ts`, `src/app/api/crm/sales-strategy/route.ts` — catch 블록만.
- 동작/비즈니스 로직 변경 없음(메시지·로깅만).

## Traceability Matrix
| REQ ID  | Description            | Verification | Test File                                   | Status  |
|---------|------------------------|--------------|---------------------------------------------|---------|
| REQ-001 | 에러 메시지 매핑 헬퍼  | (TEST)       | `src/lib/__tests__/anthropic-error.test.ts` | Pending |
| REQ-002 | 라우트 catch 적용      | (TEST)       | 위 헬퍼 테스트로 커버                       | Pending |

## Implementation Order
1. REQ-001 헬퍼 + 테스트 (TDD).
2. REQ-002 라우트 적용.

## Out of Scope
- 실제 크레딧 충전(계정/billing — 코드 아님).
- web_search 도구 자체 동작 변경.
