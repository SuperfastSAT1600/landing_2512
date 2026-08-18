# Eden Insight Narrative — 학습 대화 기반 인사이트 추출

## Overview

스터디홀에서 학생이 Eden AI와 나눈 대화를 분석해 학생의 강점·약점·학습 의도를 추출하고,
이를 학부모 포털 내러티브에 반영한다.

## Requirements

### REQ-001: Eden 대화 데이터 수집
- **Priority**: Must
- **Description**: `study_hall_unit_attempts`에서 `chat_messages, time_spent_seconds, confidence_level` 추가 fetch
- **Acceptance Criteria**: 기존 쿼리에 컬럼 추가, limit 유지
- **Verification**: (MANUAL) 데이터 로드 확인

### REQ-002: EdenInsight 추출 함수
- **Priority**: Must
- **Description**: 세션별 Eden 대화를 LLM으로 분석해 강점/약점/학습 의도 추출
- **Acceptance Criteria**: 대화가 없거나 2턴 미만이면 undefined 반환, 있으면 EdenInsight 반환
- **Verification**: (MANUAL) 실제 대화 데이터로 인사이트 확인

### REQ-003: 내러티브 통합
- **Priority**: Must
- **Description**: EdenInsight가 있으면 generateStudyHallNarrative user content에 `[Eden 대화 인사이트]` 블록 추가
- **Acceptance Criteria**: 인사이트 블록이 내러티브 마지막 문장에 반영됨
- **Verification**: (MANUAL) Eden 대화 있는 학생의 내러티브 확인

### REQ-004: 캐시 통합
- **Priority**: Must
- **Description**: EdenInsight를 cacheInput에 포함해 대화 변경 시 내러티브 재생성
- **Acceptance Criteria**: 대화 내용이 바뀌면 새 내러티브 생성됨
- **Verification**: (MANUAL)

## Technical Design

### 새 타입
```typescript
type EdenInsight = {
  strengths: string[];      // 잘 하는 것 (예: "문장 구조를 빠르게 파악함")
  weaknesses: string[];     // 약한 부분 (예: "대명사 선행사 연결에서 반복 실수")
  intentions: string[];     // 이해하려는 것 (예: "연결어가 문장 관계를 어떻게 결정하는지")
};
```

### 새 함수: extractEdenInsights(conversations)
- 입력: `{ skill: string; isCorrect: boolean; messages: { role: string; content: string }[] }[]`
- 조건: 학생 발화(`role: 'user'`)가 3개 이상인 대화만 포함 (단순 "yes/no" 제외)
- 조건: 대화가 하나도 없으면 `undefined` 반환
- LLM: GPT-4o-mini, max_tokens: 300
- 캐시: `portal_narrative_cache` item_type='eden_insight'

### 수정 파일
- `src/lib/build-srm-report.ts`

### 변경 범위
1. `study_hall_unit_attempts` 쿼리에 `chat_messages, time_spent_seconds, confidence_level` 추가
2. `EdenInsight` 타입 추가
3. `extractEdenInsights()` 함수 추가 (humanizeNarrative 위)
4. `shByDate` 집계 시 대화 데이터 누적
5. `generateStudyHallNarrative()` 시그니처에 `edenInsight?` 추가
6. user content 템플릿에 `[Eden 대화 인사이트]` 블록 추가
7. `buildSrmReport()` 에서 Eden 인사이트 추출 후 narrative에 전달
8. `cacheInput`에 `edenInsight` 포함
