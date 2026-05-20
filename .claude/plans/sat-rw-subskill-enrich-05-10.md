# SAT RW Sub-skill 분석 파일 05-10 강화

## Overview

`sat-classification.md` 스펙(REQ-005~010)에서 생성된 초기 분석 파일(05~10)은 sub-skill 정의만 있고, 실제 DB 데이터 기반 분석이 없다. 파일 01-04 수준(178~252줄)으로 강화하는 것이 목표다.

**강화 대상:**
- `05-text-structure.md` (현재 75줄 → 목표 180+줄)
- `06-cross-text.md` (현재 66줄 → 목표 200+줄)
- `07-rhetorical-synthesis.md` (현재 68줄 → 목표 180+줄)
- `08-transitions.md` (현재 85줄 → 목표 200+줄)
- `09-boundaries.md` (현재 76줄 → 목표 180+줄)
- `10-form-structure-sense.md` (현재 90줄 → 목표 200+줄)

**데이터 소스:** `blog_database/sat_questions.db` (1,609개 문제 + cp_analysis + wrong_answers)

---

## Requirements

### REQ-005E: Text Structure and Purpose 강화
- **Priority**: Must
- **Description**: 05-text-structure.md에 DB 기반 데이터 추가
- **Acceptance Criteria**:
  - Arc 패턴 분포 추가 (INFO_TO_CONCL:51, CLAIM_EVIDENCE:41, PURE_INFO:25, CLASSICAL_ARG:14, DUAL_CLAIM:9)
  - 난이도 분포 (Easy:39, Medium:64, Hard:37)
  - 오답 카테고리 실제 비율 (Out Of Scope:60.4%, Partial Match:12.5%, Distortion:9.5%)
  - 각 sub-skill별 예시 문제 ID + 핵심 분석 (TSP-1~7)
  - 상위 시퀀스 5개 포함 (EXP_I_bg-I-CL:13, EXP_I_bg-I-I-CL:7 등)
- **Verification**: (MANUAL) 파일 길이 180줄 이상, 예시 문제 3개 이상 포함

### REQ-006E: Cross-Text Connections 강화
- **Priority**: Must
- **Description**: 06-cross-text.md에 DB 기반 데이터 추가
- **Acceptance Criteria**:
  - Cross-Text 전용 Arc 패턴 분포 (DUAL_CLAIM:14, CLASSICAL_ARG:13, CLAIM_EVIDENCE:13, COUNTER_REBUTTAL:9)
  - CROSS_ 접두사 시퀀스 분석 (Text1 × Text2 구조)
  - 난이도 분포 (Easy:15, Medium:21, Hard:21 — Hard 비율 높음)
  - 오답 카테고리 (Out Of Scope:50.7%, Distortion:19.9%, Contradiction:13.0%)
  - 각 sub-skill별 예시 (CTC-1~7), CROSS_ 시퀀스 해석 포함
- **Verification**: (MANUAL) 파일 길이 200줄 이상, CROSS_ 시퀀스 구조 설명 포함

### REQ-007E: Rhetorical Synthesis 강화
- **Priority**: Must
- **Description**: 07-rhetorical-synthesis.md에 데이터 추가
- **Acceptance Criteria**:
  - CP 라벨링 없는 이유 설명 (bullet-point 구조 → arc 미적용)
  - 난이도 분포 (Easy, Medium, Hard 비율)
  - 오답 카테고리 (Partial Match:90.8% 압도적)
  - 각 sub-skill별 예시 문제 (RS-1~7)
  - RS만의 특수성: 지문이 아닌 노트 → 합성 문장 선택
- **Verification**: (MANUAL) 파일 길이 180줄 이상, RS 특수성 섹션 포함

### REQ-008E: Transitions 강화
- **Priority**: Must
- **Description**: 08-transitions.md에 DB 기반 데이터 추가
- **Acceptance Criteria**:
  - Arc 패턴 분포 (CLAIM_EVIDENCE:55, PURE_INFO:54, INFO_TO_CONCL:52)
  - 난이도 분포 (Easy:73, Medium:61, Hard:39)
  - 오답 카테고리 (Pre-Pivot Reading:38.5%, Contradiction:35.4%)
  - 전환어 유형별 (인과/대조/추가/양보) 실제 예시 + 시퀀스 연결
  - 각 sub-skill(TRAN-1~7)별 예시 문제
- **Verification**: (MANUAL) 파일 길이 200줄 이상, 전환어 유형 × 시퀀스 연결표 포함

### REQ-009E: Boundaries 강화
- **Priority**: Must
- **Description**: 09-boundaries.md에 DB 기반 데이터 추가
- **Acceptance Criteria**:
  - Arc 패턴 분포 (PURE_INFO:116 압도적 — 65.2%)
  - 난이도 분포 (Easy:64, Medium:53, Hard:61 — Hard 비율 높음)
  - 오답 카테고리 (Partial Match:49.5%, Distortion:27.1%)
  - 부호별(마침표/세미콜론/쉼표/콜론/대시) 예시 문제
  - 각 sub-skill(BOUND-1~7)별 예시 + 오답 유형 연결
- **Verification**: (MANUAL) 파일 길이 180줄 이상, 부호 유형별 예시 포함

### REQ-010E: Form, Structure, and Sense 강화
- **Priority**: Must
- **Description**: 10-form-structure-sense.md에 DB 기반 데이터 추가
- **Acceptance Criteria**:
  - Arc 패턴 분포 (PURE_INFO:119 압도적 — 61.7%)
  - 난이도 분포 (Easy:89, Medium:48, Hard:56)
  - 오답 카테고리 (Misattribution:56.4% 1위, Partial Match:20.8%)
  - 문법 유형별(동사형태/주어일치/수식어/대명사) 예시
  - 각 sub-skill(FSS-1~7)별 예시 + Misattribution 패턴 집중 분석
- **Verification**: (MANUAL) 파일 길이 200줄 이상, Misattribution 패턴 섹션 포함

---

## Technical Design

### 강화 구조 (파일 01-04 참조)

각 파일에 다음 섹션 추가:

```
# {Skill} 세부 분류 분석

## 1. 스킬의 특성
  1.1 주요 오답 패턴 (비율 + 의미)
  1.2 Arc 시퀀스 분석 (어떤 arc에서 주로 출제되는가)
  1.3 난이도 분포

## 2. 세부 Sub-skill 분석 (차원 × 레벨 구조)
  Dimension 1: [차원명]
    Level 1~3: 세부 sub-skill (난이도 기준)
  Dimension 2: ...

## 3. Sub-skill × 오답 유형 연결표

## 4. 실전 예시 문제
  [Easy] 예시 + 분석
  [Medium] 예시 + 분석
  [Hard] 예시 + 분석

## 5. 버전 관리
```

### 데이터 추출 위치
- `blog_database/sat_questions.db`
- Tables: questions, cp_analysis, wrong_answers
- 파일 01-04가 이미 이 구조를 사용 중

---

## Traceability Matrix

| REQ ID   | Description           | Verification | 파일                                    | Status  |
|----------|-----------------------|--------------|----------------------------------------|---------|
| REQ-005E | TSP 강화              | (MANUAL)     | `.claude/sat-rw/classification/analysis/05-text-structure.md` | Pending |
| REQ-006E | CTC 강화              | (MANUAL)     | `.claude/sat-rw/classification/analysis/06-cross-text.md`     | Pending |
| REQ-007E | RS 강화               | (MANUAL)     | `.claude/sat-rw/classification/analysis/07-rhetorical-synthesis.md` | Pending |
| REQ-008E | TRAN 강화             | (MANUAL)     | `.claude/sat-rw/classification/analysis/08-transitions.md`    | Pending |
| REQ-009E | BOUND 강화            | (MANUAL)     | `.claude/sat-rw/classification/analysis/09-boundaries.md`     | Pending |
| REQ-010E | FSS 강화              | (MANUAL)     | `.claude/sat-rw/classification/analysis/10-form-structure-sense.md` | Pending |

---

## Implementation Order

1. REQ-008E (TRAN) — Pre-Pivot 오답 패턴이 명확해서 arc-subskill 연결이 쉬움, 먼저 패턴 확인
2. REQ-009E (BOUND) — PURE_INFO 압도적, 문법 문제 특수성 확인
3. REQ-010E (FSS) — Misattribution 패턴 집중 분석
4. REQ-005E (TSP) — arc 다양성 높음, 구조 패턴 × 저자의도 매핑
5. REQ-006E (CTC) — CROSS_ 시퀀스 구조 특수성 분석
6. REQ-007E (RS) — CP 라벨링 없는 특수 케이스, 마지막에 처리

## Out of Scope

- REQ-012 샘플 검증 (별도 작업)
- 분류 적용 자동화 스크립트 (별도 작업)
- sat-rw-complete-taxonomy.md 업데이트 (강화 완료 후 별도)
