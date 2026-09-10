# 윈백 플레이 — 상품 기반 이탈 리드 추천 + 전략·메시지·성과 추적

## Overview

이탈 리드 1,249명에게 AP/SAT 수업권을 파는 "플레이"를 CRM에서 운영한다.
팔려는 상품을 플레이마다 입력하면 그 상품에 맞는 이탈 리드를 근거와 함께 추천하고,
전략 변형(A/B)별로 어떤 메시지를 보냈는지 기록하고 반응·상담 재연결·결제 전환을 측정한다.

기존 "AI 검색"은 제거한다. 잘 안 쓰이는 진짜 이유는 후보 검색이 OpenAI 임베딩에 의존하는데
OpenAI 크레딧 소진(429 `credit_balance_exhausted`)으로 죽어 있고, 백엔드가 조용히 이름 검색으로
폴백하기 때문이다. 같은 원인으로 `sales-strategy`·`strategy-agent`의 유사사례 검색도 깨져 있다.

발송은 시스템이 하지 않는다(이 저장소에 카톡/SMS 발송 API가 없음) — AI가 문구를 만들고 담당자가
카카오톡으로 직접 보낸 뒤 "발송함"을 기록하는 흐름이다.

이 스펙은 **1차 PR**(추천 → 타겟 확정 → 발송 기록) 범위다. 메시지 초안 생성(REQ-007)과
성과 집계 대시보드는 2차 PR로 분리한다.

## Requirements

### REQ-001: 임베딩 공급자 Qwen 전환 + 전량 재임베딩
- **Priority**: Must
- **Description**: `src/lib/embedding.ts`의 `generateEmbedding()`을 OpenAI `text-embedding-3-small`에서
  Qwen(DashScope) `text-embedding-v4`(dimensions 1536)로 교체한다. 1536차원이 동일하므로
  `students.embedding vector(1536)` 컬럼과 `match_students`/`match_students_for_strategy` RPC는 변경하지 않는다.
  함수 시그니처를 유지해 호출처 6곳을 수정하지 않는다. OpenAI 벡터와 Qwen 벡터는 비교 불가하므로
  전 학생 재임베딩 백필 스크립트를 제공한다.
- **Acceptance Criteria**: `generateEmbedding('테스트')`가 1536차원 벡터를 반환하고 OpenAI를 호출하지 않는다.
  백필 스크립트가 `--limit`/`--dry-run`을 지원하며 실패 건을 보고한다.
- **Verification**: (TEST) fetch 모킹으로 엔드포인트·모델·dimensions 파라미터 검증 + 라이브 스모크

### REQ-002: 윈백 플레이 데이터 모델
- **Priority**: Must
- **Description**: `winback_plays`(상품 브리프·귀속창·쿨다운·상태), `winback_play_variants`(전략 변형),
  `winback_targets`(리드별 추천근거·발송·반응·재연결·전환)를 신규 테이블로 만든다(마이그레이션 107).
  후보 집합 내에서만 벡터 유사도를 검색하는 `match_students_in_pool` RPC를 추가한다(마이그레이션 108,
  기존 040/051은 불변). RLS는 `service_role_all` + `anon_deny` 관례를 따른다.
- **Acceptance Criteria**: 마이그레이션 적용 후 세 테이블과 RPC가 존재하고, `unique(play_id, student_id)`가
  중복 타겟을 막는다. `src/types/crm.ts`에 대응 타입이 있다.
- **Verification**: (MANUAL) 사용자가 Supabase에서 적용 → 라우트 스모크로 CRUD 확인

### REQ-003: 상품 브리프 파싱 및 규칙 스코어링
- **Priority**: Must
- **Description**: `src/lib/winback/`에 순수함수를 둔다. `parseBrief()`는 자유 텍스트 브리프에서
  과목군·과목 토큰·대상 학년·시험월·가격을 뽑는다. `scoreWinbackCandidate()`는 학생 1명에 대해
  과목 의도(`campaign_tags`)·상담메모 언급·학년 적합·학제·시험 시기·이탈 사유·이탈 단계·이탈 경과일·
  컨택 피로도·과거 결제·임베딩 유사도 신호로 0~100 점수와 `signals[]`를 만든다.
  **`desired_subjects`는 자동유입에서 `'Both'`로 강제 오염되므로 어떤 신호에도 사용하지 않는다.**
- **Acceptance Criteria**: 같은 입력에 같은 점수·같은 signals 순서가 나오고, 점수는 0~100으로 클램프된다.
  `desired_subjects` 값을 바꿔도 점수가 변하지 않는다.
- **Verification**: (TEST) `src/lib/__tests__/winback-score.test.ts`, `winback-brief.test.ts`

### REQ-004: 추천 API
- **Priority**: Must
- **Description**: `POST /api/crm/winback/recommend` — 규칙 사전필터로 후보를 좁히고(이탈풀 한정),
  브리프 임베딩으로 후보 내 유사도를 구해 규칙 점수와 합산한 뒤 상위 25명을 Qwen `fast`로 재랭킹해
  적합도(1~5)와 근거 한 문장을 받는다. 임베딩·LLM 실패 시 규칙 점수만으로 degrade하되 응답에
  degrade 사실을 노출한다(조용한 폴백 금지). 결과는 저장하지 않는다.
- **Acceptance Criteria**: 브리프를 주면 점수·근거·신호가 붙은 후보 목록과 `stats`(사전필터 수,
  임베딩 사용 여부, LLM 사용 여부, degrade 이유)가 반환된다. 인증 없으면 401, 브리프 없으면 400.
- **Verification**: (TEST) 응답 파서·zod 검증 유닛 테스트 + (MANUAL) dev 실호출

### REQ-005: 플레이·타겟 CRUD와 발송 기록 미러
- **Priority**: Must
- **Description**: 플레이/변형/타겟 CRUD 라우트와 타겟 상태 갱신(단건·일괄)을 만든다.
  타겟 확정 시 전략 변형을 균등 배정하고 중복은 skip한다. `mark_sent` 시
  `students.lead_status='reactivating'` + `appendConsultationEntry()`로 상담 타임라인에 발송 문구 기록 +
  `reactivation_log`에 미러 엔트리를 남겨 기존 재활성화 UI·활동 피드가 윈백을 그대로 인식하게 한다.
- **Acceptance Criteria**: 타겟 확정 → 발송 기록 시 위 세 부수효과가 함께 일어나고, 같은 학생을 같은
  플레이에 두 번 추가해도 중복 행이 생기지 않는다.
- **Verification**: (TEST) 미러 매핑·변형 배정 순수함수 테스트 + (BROWSER) 발송 기록 후 상담 타임라인 확인

### REQ-006: 이탈 리드풀 UI — 플레이 하위탭 + 컨텍스트 바
- **Priority**: Must
- **Description**: 이탈 리드풀 하위탭에 `플레이`를 추가하고(목록 ↔ 상세 마스터-디테일, 모달 아님),
  기존 AI 검색 자리에는 진행 중 플레이 선택·새 플레이·미니 지표를 보여주는 컨텍스트 바를 둔다.
  플레이 선택 시 리드 카드에 타겟 배지(순위·점수·발송 여부)가 보이고 일괄 액션에 "플레이에 추가"가 붙는다.
  파일은 `components/winback/`로 분리해 각 200줄 미만을 유지한다.
- **Acceptance Criteria**: 플레이 생성 → 추천 → 타겟 확정 → 발송 기록을 브라우저에서 끝까지 수행할 수 있다.
- **Verification**: (BROWSER) Playwright로 플레이 1건 E2E

### REQ-007: AI 검색 제거
- **Priority**: Must
- **Description**: `LeadPool.tsx`의 AI 검색 state/핸들러/파생값/JSX와 `api/crm/ai-pool-search` 라우트를
  제거한다. 삭제 전에 `buildStudentProfile`과 LLM JSON 파싱 로직을 `src/lib/winback/`으로 옮겨 재사용한다.
  공유 인프라(`embedding.ts`, `students.embedding`, `match_students`, `match_students_for_strategy`,
  `qwen.ts`)는 건드리지 않는다.
- **Acceptance Criteria**: `grep`으로 `ai-pool-search`·`AiPoolSearchMatch` 잔여 참조가 0건이고,
  이탈 리드풀의 나머지 기능(필터·칩·페이지네이션·일괄 액션)이 그대로 동작한다.
- **Verification**: (TEST) 기존 테스트 통과 + `grep` 0건 + (BROWSER) 리드풀 정상 렌더

## Technical Design

### Architecture

```
LeadPool (이탈 리드풀)
 ├─ WinbackPlayBar          ← AI 검색 자리 대체(진행 플레이 선택·새 플레이·미니 지표)
 └─ poolTab 'plays' → WinbackPlaysTab
      ├─ WinbackPlayList        플레이 목록
      └─ WinbackPlayDetail      타겟 표(발송함·반응·재연결·전환 마킹)

POST /api/crm/winback/recommend
  → buildPrefilter(rules)                    규칙 사전필터(SQL+JS)
  → generateEmbedding(buildBriefQueryText)   Qwen text-embedding-v4
  → rpc match_students_in_pool               후보 한정 유사도
  → scoreWinbackCandidate                    규칙 점수 + signals
  → Qwen fast 재랭킹 → parseRecommendResponse(zod)

POST /api/crm/winback-plays[/id/variants|/id/targets]   CRUD
PATCH /api/crm/winback-targets/[id] · POST .../bulk     상태·발송 기록(+미러 라이트)
```

순수함수(`src/lib/winback/`): `brief.ts` · `prefilter.ts` · `score.ts` · `profile.ts` · `parse.ts` · `mirror.ts`

### Dependencies
- Qwen(DashScope 국제): 임베딩 `text-embedding-v4`(compatible-mode), 재랭킹 `qwenModel('fast')` — 기존 `QWEN_API_KEY`
- Supabase: 마이그레이션 107·108 (사용자가 직접 적용)
- 재사용: `effectiveChurnStage`(funnel-stats) · `aggregateChurn`(churn-breakdown) ·
  `appendConsultationEntry`(consultation-timeline) · `netAmount`(payment-utils) · `PRODUCT_TREE`(PaymentModal) ·
  `pricing.ts`(AP_PACKAGES/HOUR_PACKAGES)

## Traceability Matrix

| REQ ID  | Description                     | Verification | Test File                                             | Status  |
|---------|---------------------------------|--------------|-------------------------------------------------------|---------|
| REQ-001 | 임베딩 Qwen 전환 + 백필          | (TEST)       | `src/lib/__tests__/embedding.test.ts`                 | Pending |
| REQ-002 | 데이터 모델(107·108)             | (MANUAL)     | —                                                     | Pending |
| REQ-003 | 브리프 파싱·규칙 스코어링         | (TEST)       | `src/lib/__tests__/winback-score.test.ts`, `winback-brief.test.ts` | Pending |
| REQ-004 | 추천 API                        | (TEST)       | `src/lib/__tests__/winback-parse.test.ts`             | Pending |
| REQ-005 | CRUD + 발송 미러                 | (TEST)       | `src/lib/__tests__/winback-mirror.test.ts`            | Pending |
| REQ-006 | 리드풀 UI(하위탭·컨텍스트 바)     | (BROWSER)    | Playwright 스크립트(스크래치패드)                      | Pending |
| REQ-007 | AI 검색 제거                     | (TEST)       | 기존 테스트 + grep 0건                                 | Pending |

## Implementation Order

1. REQ-001 — 임베딩이 살아야 추천의 유사도 레그가 의미 있다. 백필이 선행돼야 품질이 나온다.
2. REQ-002 — 타입·테이블이 있어야 이후 라우트/UI가 붙는다.
3. REQ-003 — 순수함수가 추천 API의 토대. 테스트 먼저.
4. REQ-004 — REQ-002·003 위에 얹힌다.
5. REQ-005 — 추천 결과를 저장·발송 기록하는 경로.
6. REQ-006 — 백엔드가 검증된 뒤 UI 배선.
7. REQ-007 — 새 경로가 동작한 뒤 구경로 제거(프로필 빌더 이동 후).

## Out of Scope

- 카카오톡/SMS 자동 발송 연동 (발송 API 자체가 없음 — 수동 발송 전제)
- 메시지 초안 생성 API·UI, 성과 집계(귀속·통계·변형 비교) 대시보드 → 2차 PR
- 상품 마스터 DB 및 `src/app/admin/products/*` 관리 화면
- 진단테스트 취약점 연동 (AP 진단 없음, `weak_areas`/`vocab_weakness_level` 컬럼 미존재)
- B2B 세그먼트 윈백
