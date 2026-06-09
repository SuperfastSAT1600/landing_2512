# 최초 세일즈 전략 AI 에이전트 (학생 패널 대화형)

## Overview

최초 세일즈 칸반에서 학생 카드를 열면 뜨는 `StudentDetailPanel`에 **"세일즈 전략 AI"** 대화 섹션을 추가한다.
매니저가 현재 신규 리드의 상황을 자연어로 입력하면, 에이전트는

1. **현재 학생의 전체 기록** (상담 타임라인, 직전/목표 점수, 유입 채널, 이탈 이력 등)
2. **유사한 과거 학생들의 결과** (임베딩 유사도 검색 → 결제 전환(enrolled) vs 이탈(churned) 사례와 그들의 상담 내용)

을 취합해, **이 신규 리드를 결제로 이끌기 위한 구체적 세일즈 전략**을 자연어로 논의·추천한다.

기존 AI 인프라를 재사용한다: `@anthropic-ai/sdk`(설치됨), `ANTHROPIC_API_KEY`(.env.local), OpenAI 임베딩
(`src/lib/embedding.ts`), pgvector `students.embedding` + 유사도 검색 RPC.

v1 범위: 대화 저장 안 함(패널 닫으면 초기화). 응답은 스트리밍.

## Requirements

### REQ-001: 유사 과거 학생 결과 인지 검색 RPC
- **Priority**: Must
- **Description**: 기존 `match_students` RPC는 `inactive/reactivating`만 검색해 "결제 전환" 사례를 못 본다. 결과가 확정된 학생(`enrolled` ∪ `inactive` ∪ `reactivating`)을 대상으로 하고 현재 학생을 제외하는 신규 RPC `match_students_for_strategy(query_embedding, exclude_id, match_count)`를 추가한다.
- **Acceptance Criteria**: RPC가 임베딩이 있는 결과-확정 학생을 유사도순으로 반환하고, `exclude_id`는 결과에서 빠진다.
- **Verification**: (MANUAL) 마이그레이션 적용 후 RPC 호출 결과 확인

### REQ-002: 전략 컨텍스트 빌더 (순수 함수)
- **Priority**: Must
- **Description**: `src/lib/sales-strategy-context.ts`에 순수 함수로 (a) 현재 학생 프로필 블록, (b) 유사 과거 사례 블록(각 사례에 전환/이탈 결과 라벨 + 상담 요약), (c) 시스템 프롬프트를 구성한다. `outcomeOf(student)`는 `lead_status`/`funnel_stage` 기준으로 `'converted' | 'churned' | 'in_progress'`를 판정한다.
- **Acceptance Criteria**: 점수/이탈/상담 유무 등 다양한 입력에서 라벨·블록 문자열이 결정적으로 생성된다.
- **Verification**: (TEST) `src/lib/__tests__/sales-strategy-context.test.ts`

### REQ-003: 대화형 전략 추천 API (스트리밍)
- **Priority**: Must
- **Description**: `POST /api/crm/sales-strategy`. Body `{ studentId, messages: [{role,content}] }`. 흐름: 인증 → 현재 학생 조회 → (학생 프로필 + 최근 사용자 메시지)로 임베딩 → `match_students_for_strategy`로 유사 사례 K=6 조회 → 컨텍스트 구성 → Claude(`claude-sonnet-4-6`) 스트리밍 호출(시스템·컨텍스트에 prompt caching) → 텍스트 델타를 스트리밍 응답. 임베딩/RPC 실패 시 유사 사례 없이 현재 학생만으로 답한다(graceful degradation).
- **Acceptance Criteria**: 유효한 studentId + 사용자 메시지로 호출 시 200 + 텍스트 스트림으로 전략 추천이 돌아온다. 미인증 401, 잘못된 body 400, API 키 없음 503.
- **Verification**: (MANUAL) curl로 실제 엔드포인트 스트림 확인

### REQ-004: 학생 패널 대화 UI 섹션
- **Priority**: Must
- **Description**: `SalesStrategySection`(SectionCard 기반)을 `StudentDetailPanel`에 추가. 메시지 목록(매니저/AI 말풍선) + 입력창 + 전송. 전송 시 위 API를 스트리밍으로 읽어 AI 말풍선을 실시간 갱신. 첫 진입 시 사용 안내 문구. 기본 접힘(`defaultOpen=false`). 대화는 패널 로컬 상태(저장 안 함).
- **Acceptance Criteria**: 매니저가 상황을 입력→전송하면 AI 답변이 스트리밍으로 표시되고, 이어지는 메시지로 멀티턴 대화가 된다. 패널을 닫았다 열면 대화는 비어 있다.
- **Verification**: (BROWSER) 학생 패널에서 대화 동작 + 스크린샷

## Technical Design

### Architecture
- `supabase/migrations/051_match_students_for_strategy.sql` — 신규 RPC (read-only, 추가형)
- `src/lib/sales-strategy-context.ts` — 순수 컨텍스트/프롬프트 빌더 (I/O 없음, 테스트 대상)
- `src/app/api/crm/sales-strategy/route.ts` — 스트리밍 챗 엔드포인트 (DB 조회 + 임베딩 + Claude)
- `src/app/admin/crm/components/panel/sections/SalesStrategySection.tsx` — 대화 UI
- `StudentDetailPanel.tsx` — 섹션 1줄 배선 (StrategyHistorySection 아래)

### Data sources (read-only, 기존 컬럼)
`students`: name, grade, school_type, desired_subjects, previous_rw/math_score, target_score,
churn_type, churn_tag, inquiry_channel, traffic_source, lead_status, funnel_stage,
consultation_timeline, reactivation_log, embedding.

### Model
`claude-sonnet-4-6` (전략 추론). 임베딩은 기존 `text-embedding-3-small`. 시스템+컨텍스트 블록에
`cache_control: ephemeral`로 멀티턴 캐시.

### Privacy/Cost
학생 PII가 Claude API로 전송됨(기존 ai-pool-search와 동일 수준). 유사 사례는 K=6로 제한.

### Dependencies
없음(설치된 SDK·키·임베딩·pgvector 재사용). 신규 npm 패키지 없음.

## Traceability Matrix

| REQ ID  | Description                  | Verification | Test File | Status |
|---------|------------------------------|--------------|-----------|--------|
| REQ-001 | 결과 인지 유사 검색 RPC       | (MANUAL)     | manual    | 작성 완료 — 운영 DB 수동 적용 대기 |
| REQ-002 | 컨텍스트/프롬프트 빌더 순수함수 | (TEST)      | sales-strategy-context.test.ts | Done (13/13) |
| REQ-003 | 스트리밍 전략 추천 API         | (MANUAL)     | curl      | Done (401/400/404 + 실제 스트림 확인) |
| REQ-004 | 학생 패널 대화 UI 섹션         | (BROWSER)    | manual (스크린샷) | 구현·타입·린트 완료 — 시각 확인 대기 |

## Implementation Order
1. REQ-001 (마이그레이션) → 2. REQ-002 (TDD: 테스트→빌더) → 3. REQ-003 (API) → 4. REQ-004 (UI) → 배선·검증

## Out of Scope
- 대화 영속화(학생별 저장) — v2
- 전체 퍼널 통계 컨텍스트 주입 — v2
- 재시도 세일즈(RetryKanban)·코치 매칭 통합 — 범위 아님
