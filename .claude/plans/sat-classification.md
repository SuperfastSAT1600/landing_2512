# SAT RW 전체 10개 스킬 세부 분류 체계 설계

## Overview

현재 SAT RW는 10개 스킬로 분류되어 있다. **각 10개 스킬을 문제의 객관적 특성 기준으로 세부 sub-skill로 재분류**하는 것이 목표다.

목표:
- **10개 모든 스킬** 분석 (Central Ideas & Details, Command of Evidence, Inferences, Words in Context, Text Structure & Purpose, Cross-Text Connections, Rhetorical Synthesis, Transitions, Boundaries, Form/Structure/Sense)
- 각 스킬당 **5-8개의 sub-skill** 로 세분화
- **문제 기준** (학생 오류 X): 문제의 구조적, 언어적 특성으로 분류
- 최종 통합 분류 체계 문서화

**산출물**: `.claude/sat-rw/classification/sat-rw-complete-taxonomy.md` (전체 분류 체계 정의서)

---

## Requirements

### REQ-001: Central Ideas and Details 세부 sub-skill 정의
- **Priority**: Must
- **Description**: "Central Ideas and Details" 스킬의 문제들을 분석하여 문제 기준으로 5-8개 sub-skill 정의
- **Acceptance Criteria**: 
  - 세부 sub-skill이 5-8개 정의됨
  - 각 sub-skill별 정의, 특성, 예시 문제(3개 이상) 포함
  - 예상: 주제 파악 / 세부사항 인식 / 주제-세부 관계 분석 등
- **Verification**: (MANUAL) 실제 문제 30개 분류하여 일관성 확인

### REQ-002: Command of Evidence 세부 sub-skill 정의
- **Priority**: Must
- **Description**: "Command of Evidence" (Textual + Quantitative) 스킬의 세부 sub-skill 정의
- **Acceptance Criteria**: 
  - 세부 sub-skill이 5-8개 정의됨
  - Textual과 Quantitative 모두 포함
  - 각 sub-skill별 정의, 특성, 예시 문제(3개 이상) 포함
- **Verification**: (MANUAL) 실제 문제 30개 분류하여 일관성 확인

### REQ-003: Inferences 세부 sub-skill 정의
- **Priority**: Must
- **Description**: "Inferences" 스킬의 문제들을 분석하여 문제 기준으로 5-8개 sub-skill 정의
- **Acceptance Criteria**: 
  - 세부 sub-skill이 5-8개 정의됨
  - 각 sub-skill별 정의, 특성, 예시 문제(3개 이상) 포함
  - 예상: 의도 추론 / 인과 추론 / 태도 추론 / 메커니즘 추론 등
- **Verification**: (MANUAL) 실제 문제 30개 분류하여 일관성 확인

### REQ-004: Words in Context 세부 sub-skill 정의
- **Priority**: Must
- **Description**: "Words in Context" 스킬의 문제들을 분석하여 문제 기준으로 5-8개 sub-skill 정의
- **Acceptance Criteria**: 
  - 세부 sub-skill이 5-8개 정의됨
  - 각 sub-skill별 정의, 특성, 예시 문제(3개 이상) 포함
  - 예상: 은유적 사용 / 의미 추상화 / 문맥 좁혀짐 / 뉘앙스 변화 등
- **Verification**: (MANUAL) 실제 문제 30개 분류하여 일관성 확인

### REQ-005: Text Structure and Purpose 세부 sub-skill 정의
- **Priority**: Must
- **Description**: "Text Structure and Purpose" 스킬의 문제들을 분석하여 문제 기준으로 5-8개 sub-skill 정의
- **Acceptance Criteria**: 
  - 세부 sub-skill이 5-8개 정의됨
  - 각 sub-skill별 정의, 특성, 예시 문제(3개 이상) 포함
  - 예상: 단락 기능 파악 / 텍스트 구조 유형 / 저자 목적 분석 등
- **Verification**: (MANUAL) 실제 문제 30개 분류하여 일관성 확인

### REQ-006: Cross-Text Connections 세부 sub-skill 정의
- **Priority**: Must
- **Description**: "Cross-Text Connections" 스킬의 문제들을 분석하여 문제 기준으로 5-8개 sub-skill 정의
- **Acceptance Criteria**: 
  - 세부 sub-skill이 5-8개 정의됨
  - 각 sub-skill별 정의, 특성, 예시 문제(3개 이상) 포함
  - 예상: 저자 입장 비교 / 텍스트 관계 파악 / 상호보완 관계 분석 등
- **Verification**: (MANUAL) 실제 문제 30개 분류하여 일관성 확인

### REQ-007: Rhetorical Synthesis 세부 sub-skill 정의
- **Priority**: Must
- **Description**: "Rhetorical Synthesis" 스킬의 문제들을 분석하여 문제 기준으로 5-8개 sub-skill 정의
- **Acceptance Criteria**: 
  - 세부 sub-skill이 5-8개 정의됨
  - 각 sub-skill별 정의, 특성, 예시 문제(3개 이상) 포함
  - 예상: 정보 통합 유형 / 목적 맞춤 합성 / 논리적 연결 등
- **Verification**: (MANUAL) 실제 문제 30개 분류하여 일관성 확인

### REQ-008: Transitions 세부 sub-skill 정의
- **Priority**: Must
- **Description**: "Transitions" 스킬의 문제들을 분석하여 문제 기준으로 5-8개 sub-skill 정의
- **Acceptance Criteria**: 
  - 세부 sub-skill이 5-8개 정의됨
  - 각 sub-skill별 정의, 특성, 예시 문제(3개 이상) 포함
  - 예상: 인과 연결 / 비교 연결 / 추가 연결 / 대조 연결 등
- **Verification**: (MANUAL) 실제 문제 30개 분류하여 일관성 확인

### REQ-009: Boundaries 세부 sub-skill 정의
- **Priority**: Must
- **Description**: "Boundaries" (문장 부호) 스킬의 문제들을 분석하여 문제 기준으로 5-8개 sub-skill 정의
- **Acceptance Criteria**: 
  - 세부 sub-skill이 5-8개 정의됨
  - 각 sub-skill별 정의, 특성, 예시 문제(3개 이상) 포함
  - 예상: 마침표 vs 반점 vs 콜론 선택 / 독립절-종속절 판별 등
- **Verification**: (MANUAL) 실제 문제 30개 분류하여 일관성 확인

### REQ-010: Form, Structure, and Sense 세부 sub-skill 정의
- **Priority**: Must
- **Description**: "Form, Structure, and Sense" (문법) 스킬의 문제들을 분석하여 문제 기준으로 5-8개 sub-skill 정의
- **Acceptance Criteria**: 
  - 세부 sub-skill이 5-8개 정의됨
  - 각 sub-skill별 정의, 특성, 예시 문제(3개 이상) 포함
  - 예상: 동사 형태 / 대명사 일치 / 수식어 위치 / 병렬 구조 등
- **Verification**: (MANUAL) 실제 문제 30개 분류하여 일관성 확인

### REQ-011: 전체 분류 체계 최종 문서화
- **Priority**: Must
- **Description**: REQ-001~010의 결과를 하나의 통합 md 문서로 작성
- **Acceptance Criteria**:
  - 파일: `.claude/sat-rw/classification/sat-rw-complete-taxonomy.md`
  - 구조: 설계 원칙 → 10개 스킬별 sub-skill 분류 → 비교 분석표 → 버전 관리
  - 각 sub-skill별 명확한 정의와 실제 문제 예시(3개 이상) 포함
  - 추후 확장/수정 가능하도록 설계
- **Verification**: (MANUAL) 분류 체계의 가독성, 명확성, 일관성 최종 검토

### REQ-012: 분류 적용 검증 (전체 샘플 데이터)
- **Priority**: Should
- **Description**: 10개 스킬 모두에 대해 실제 SAT 문제 샘플 분류하여 검증
- **Acceptance Criteria**:
  - 각 스킬별 30-50개 샘플 문제 분류 완료 (총 300-500개)
  - 각 sub-skill별 문제 수 분포표 작성
  - 분류 중복/모호 문제 최소화
  - 오분류율 < 15%
- **Verification**: (MANUAL) 분류 결과 검토 및 피드백

---

## Technical Design

### Architecture

```
.claude/sat-rw/
├── classification/
│   ├── sat-rw-complete-taxonomy.md     # 최종 통합 분류 체계 (REQ-011)
│   ├── analysis/
│   │   ├── central-ideas-details.md    # Central Ideas & Details 분석 (REQ-001)
│   │   ├── command-evidence.md         # Command of Evidence 분석 (REQ-002)
│   │   ├── inferences.md               # Inferences 분석 (REQ-003)
│   │   ├── words-in-context.md         # Words in Context 분석 (REQ-004)
│   │   ├── text-structure.md           # Text Structure & Purpose 분석 (REQ-005)
│   │   ├── cross-text.md               # Cross-Text Connections 분석 (REQ-006)
│   │   ├── rhetorical-synthesis.md     # Rhetorical Synthesis 분석 (REQ-007)
│   │   ├── transitions.md              # Transitions 분석 (REQ-008)
│   │   ├── boundaries.md               # Boundaries 분석 (REQ-009)
│   │   └── form-structure-sense.md     # Form/Structure/Sense 분석 (REQ-010)
│   └── validation-samples/             # 검증용 샘플 데이터 (REQ-012)
│       └── sample-classifications.json
```

### 분류 설계 원칙

1. **문제 기준** (학생 오류 기준 X)
   - 문제의 객관적, 구조적 특성으로 분류
   - "이 문제가 뭘 묻고 있는가"에 초점

2. **다차원성**
   - 각 스킬은 2-3개의 독립적 차원으로 분류 가능
   - 차원이 겹칠 수 있음 (같은 문제가 여러 차원에 걸칠 수 있음)

3. **명확한 경계**
   - 각 유형 간 겹침 최소화
   - 불명확한 경우는 "경계 사례(Borderline)"로 표기

4. **확장 가능성**
   - 새 문제/패턴 발견 시 쉽게 추가 가능
   - 버전 관리로 변화 추적

5. **일관성**
   - 모든 10개 스킬이 동일한 원칙으로 분류
   - 스킬 간 비교 분석 가능하도록

---

## Traceability Matrix

| REQ ID  | Skill / Output                | Verification | Status  |
|---------|-------------------------------|--------------|---------|
| REQ-001 | Central Ideas and Details     | (MANUAL)     | Pending |
| REQ-002 | Command of Evidence           | (MANUAL)     | Pending |
| REQ-003 | Inferences                    | (MANUAL)     | Pending |
| REQ-004 | Words in Context              | (MANUAL)     | Pending |
| REQ-005 | Text Structure and Purpose    | (MANUAL)     | Pending |
| REQ-006 | Cross-Text Connections       | (MANUAL)     | Pending |
| REQ-007 | Rhetorical Synthesis          | (MANUAL)     | Pending |
| REQ-008 | Transitions                   | (MANUAL)     | Pending |
| REQ-009 | Boundaries                    | (MANUAL)     | Pending |
| REQ-010 | Form, Structure, and Sense    | (MANUAL)     | Pending |
| REQ-011 | 최종 통합 분류 체계 문서화     | (MANUAL)     | Pending |
| REQ-012 | 샘플 데이터 검증              | (MANUAL)     | Pending |

---

## Implementation Order

1. **REQ-001~010 병렬 진행** (같은 방식으로 각 스킬 분석)
   - 각 스킬별 실제 문제 30-50개 수집
   - 문제의 객관적 특성 분석
   - 자연스러운 sub-skill 분류 발견

2. **REQ-011 (최종 문서화)** — REQ-001~010 완료 후
   - 모든 분류 결과를 하나의 md 문서로 통합
   - 스킬 간 비교 분석표 작성
   - 버전 관리 정보 포함

3. **REQ-012 (샘플 검증)** — REQ-011 완료 후 (병렬 진행 가능)
   - 300-500개 추가 문제로 새 분류 적용
   - 오분류율 확인 및 필요시 조정

---

## Out of Scope

- 학생의 오류 패턴 분석 (별도 작업)
- 각 유형별 교육 전략 제시 (분류 정의 후 향후 작업)
- 자동 분류 시스템 구축 (분류 체계 정의 후 향후 작업)
- 기존 10개 스킬과의 매핑 관계 분석 (현재는 각 스킬의 세분화만 대상)
