# Report Narrative v3 — Cross-Reference & Coach Feedback

## Overview

스터디홀/테스트센터/단어 내러티브 생성 함수에 교차 참조 데이터와 코치 피드백을 추가한다.
v2는 각 활동 데이터만 보고 내러티브를 생성했으나, v3는 다른 시스템 데이터와 코치 피드백을
함께 참조하여 코칭 철학 기반의 통합 해석을 제공한다.

## Requirements

### REQ-001: 스터디홀 ↔ 테스트센터 교차 참조
- **Priority**: Must
- **Description**: 스터디홀 내러티브 생성 시 동일 스킬의 최근 테스트센터 정답률을 비교해 격차를 user content에 포함
- **Acceptance Criteria**: tcCrossRef 데이터가 있으면 "압박 하 적용" 해석이 내러티브에 반영됨
- **Verification**: (MANUAL) 같은 스킬의 sh/tc 정답률 격차가 큰 학생 내러티브에 격차 해석 포함 확인

### REQ-002: 테스트센터 ↔ 스터디홀 교차 참조
- **Priority**: Must
- **Description**: 테스트센터 내러티브 생성 시 동일 스킬의 최근 스터디홀 정답률을 비교
- **Acceptance Criteria**: shCrossRef 데이터가 있으면 연습-검증 격차가 내러티브에 반영됨
- **Verification**: (MANUAL) 내러티브 출력 확인

### REQ-003: 코치 피드백 참조
- **Priority**: Must
- **Description**: 세 내러티브 모두 최근 코치 레슨 피드백을 user content에 포함. 마지막 문장이 AI 추측이 아닌 코치 계획 기반으로 생성됨
- **Acceptance Criteria**: coachFeedback 있으면 마지막 문장이 그 피드백을 반영함
- **Verification**: (MANUAL) 코치 피드백이 있는 학생과 없는 학생의 마지막 문장 비교

### REQ-004: 교차 데이터 없을 때 기존 동작 유지
- **Priority**: Must
- **Description**: 교차 참조 데이터와 코치 피드백이 모두 없으면 v2와 동일하게 동작
- **Acceptance Criteria**: 선택적 파라미터 미전달 시 기존 내러티브 품질 유지
- **Verification**: (MANUAL) 데이터 없는 케이스 출력 확인

## Technical Design

### Architecture
- 수정 파일: `src/lib/build-srm-report.ts`
- 수정 함수: `generateStudyHallNarrative`, `generateTestCenterNarrative`, `generateVocaNarrative`, `buildSrmReport`
- 새 타입: `SkillCrossRef`, `CoachFeedback`
- 코치 피드백 조회: `supabaseAdmin`의 기존 레슨 피드백 테이블 (확인 필요)

### Dependencies
- Supabase: 코치 레슨 피드백 테이블 스키마 확인 필요
- 기존 캐시 로직 유지 (input_hash에 교차 참조 데이터 포함)
