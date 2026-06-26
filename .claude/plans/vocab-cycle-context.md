# Vocab Cycle Context — SH·TC 내러티브에 단어·레슨 맥락 연결

## Overview

레슨피드백(학습) → SH(연습) → TC(검증) 사이클을 내러티브에서 하나의 맥락으로 연결한다.
현재는 vocab / SH / TC 내러티브가 완전히 분리되어 있어 학습 흐름이 보이지 않는다.

## Requirements

### REQ-001: 최근 틀린 단어를 SH 내러티브 컨텍스트에 추가
- **Priority**: Must
- **Description**: SH 날짜 기준 최근 7일간 vocab.events에서 틀린 단어 목록(terms)을 추출해
  Words in Context 스킬이 있는 SH 내러티브 user content에 `[최근 단어 학습]` 블록으로 추가
- **Acceptance Criteria**: Words in Context 있는 SH에서 최근 틀린 단어가 컨텍스트에 포함됨
- **Verification**: (MANUAL) Words in Context + 최근 vocab miss 있는 학생 내러티브 확인

### REQ-002: 최근 틀린 단어를 TC 내러티브 컨텍스트에 추가
- **Priority**: Must
- **Description**: RW 도메인 TC 세션에서도 동일하게 최근 단어 컨텍스트 추가
- **Acceptance Criteria**: RW TC 내러티브 user content에 [최근 단어 학습] 블록 포함
- **Verification**: (MANUAL)

### REQ-003: coachFeedback 소스를 scheduled_events.feedback 으로 전환
- **Priority**: Must
- **Description**: 현재 `daily_reports.report_md` 앞 500자를 쓰는데, 이는 AI가 작성한 전체 리포트라
  실제 코치 의도와 다를 수 있음. `scheduled_events.feedback` (코치가 직접 입력한 레슨 피드백)을
  우선 사용하고, 없으면 daily_reports fallback 유지.
- **Acceptance Criteria**: coachFeedback이 scheduled_events.feedback에서 우선 조회됨
- **Verification**: (MANUAL) 레슨 피드백 있는 학생 내러티브 마지막 문장 확인

### REQ-004: 프롬프트에 학습 사이클 맥락 명시
- **Priority**: Must
- **Description**: SH/TC 시스템 프롬프트에서 "단어 학습 → SH Words in Context → TC 적용" 사이클을
  코칭 철학 블록에 추가. 내러티브가 사이클 어디에 있는지 읽어낼 수 있게.
- **Acceptance Criteria**: 단어 학습 + Words in Context + TC 데이터 모두 있을 때 연결된 해석 나옴
- **Verification**: (MANUAL)

## Technical Design

### 새 타입
```typescript
type VocabContext = {
  missedTerms: string[];    // 최근 7일 틀린 단어 (최대 6개)
  masteredTerms: string[];  // 최근 7일 마스터한 단어 (최대 3개)
};
```

### 변경 함수
- `generateStudyHallNarrative(stats, tcCrossRef?, coachFeedback?, edenInsight?, vocabContext?)`
- `generateTestCenterNarrative(stats, shCrossRef?, coachFeedback?, vocabContext?)`

### user content 추가 블록 (Words in Context 스킬 있거나 RW 도메인일 때만)
```
[최근 단어 학습 — 최근 7일]
틀린 단어: acknowledge / persevere / ambiguous
마스터한 단어: astute / candid
```

### coachFeedback 우선순위
```
1순위: 최근 scheduled_events.feedback (레슨 피드백 원문)
2순위: 최근 daily_reports.report_md 앞 500자
```
→ `buildSrmReport`에서 scheduled_events 결과가 이미 조회되므로 활용 가능

### 단어 컨텍스트 윈도우 계산
- 각 SH/TC 날짜 기준 -7일 ~ 해당 날짜까지의 vocab.events miss 집계
- termMap에서 term 조회 후 최대 6개

### 수정 파일
- `src/lib/build-srm-report.ts`

### 변경 범위
1. `VocabContext` 타입 추가
2. `buildSrmReport`에서 scheduled_events 조회 (이미 있음) → coachFeedback 우선순위 조정
3. 날짜별 vocab miss 윈도우(최근 7일) 계산 로직 추가
4. `generateStudyHallNarrative` / `generateTestCenterNarrative` 시그니처에 `vocabContext?` 추가
5. user content에 `[최근 단어 학습]` 블록 추가 (조건부)
6. 시스템 프롬프트 코칭 철학에 "단어→SH→TC" 사이클 추가
7. cacheInput에 vocabContext 포함
