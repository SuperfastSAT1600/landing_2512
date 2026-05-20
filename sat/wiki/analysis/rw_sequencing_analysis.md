---
title: RW 시퀀싱 패턴 분석
type: analysis
domain: questions
tags: [sat-rw, sequencing, passage-structure, concept-structure]
updated: 2026-05-18
---

# Reading and Writing 시퀀싱 패턴 분석

master_sat_ontology_v3.jsonl의 standard_sequence 데이터 기반 분석입니다.

## 개요

| 항목 | 수치 |
|------|------|
| **시퀀싱 정보 포함** | 1,511개 passage |
| **총 RW 문제** | 1,715개 (88% 커버) |
| **분석 기준** | standard_sequence 패턴 |
| **시퀀스 요소** | INTRODUCE, BACKGROUND, CLAIM, EVIDENCE, ELABORATION, EXAMPLE, FEATURE, FINDING, IMPLICATION, ACTION, PIVOT 등 |

---

## 시퀀싱 기본 개념

### 시퀀스 요소의 의미

| 요소 | 설명 | 빈도 |
|------|------|------|
| **INTRODUCE** | 주제/대상 소개 | 거의 모든 passage의 시작 |
| **BACKGROUND** | 배경 정보 제공 | 매우 높음 |
| **CLAIM** | 주요 주장 제시 | 높음 |
| **EVIDENCE** | 증거/근거 제시 | 매우 높음 |
| **ELABORATION** | 설명/상세화 | 높음 |
| **EXAMPLE** | 구체적 사례 | 중간 |
| **FEATURE** | 특징/속성 설명 | 중간 |
| **FINDING** | 발견/결과 | 중간 |
| **ACTION** | 행동/움직임 | 중간 |
| **PIVOT** | 입장 전환/대조 | 중간 |
| **IMPLICATION** | 함의/의미 | 낮음 |
| **QUALIFICATION** | 한정/조건부 | 낮음 |

---

## 상위 10개 시퀀싱 패턴

### 패턴 1: INTRODUCE → BACKGROUND → (다음)
**빈도: 27회**

```
문장 1: 주제 소개 (INTRODUCE)
문장 2: 배경 정보 (BACKGROUND)
문장 3+: 증거/설명 (EVIDENCE/ELABORATION)
```

**특징**:
- 가장 기본적인 구조
- 배경이 필요한 역사/생물 텍스트에서 빈번
- 학생이 배경을 먼저 이해해야 주요 내용 파악 가능

**예시 스킬**: Central Ideas and Details, Inferences

---

### 패턴 2: INTRODUCE → CLAIM → (다음)
**빈도: 25회**

```
문장 1: 주제/대상 소개 (INTRODUCE)
문장 2: 주요 주장 제시 (CLAIM)
문장 3+: 증거/설명 (EVIDENCE/ELABORATION)
```

**특징**:
- 주장 중심 구조
- 에세이, 평론, 사회과학 텍스트에서 빈번
- 주장을 먼저 명확히 파악하는 것이 중요

**예시 스킬**: Command of Evidence, Rhetorical Synthesis

---

### 패턴 3: INTRODUCE → EVIDENCE → (다음)
**빈도: 24회**

```
문장 1: 주제/대상 소개 (INTRODUCE)
문장 2: 증거/사례 제시 (EVIDENCE)
문장 3+: 설명/함의 (ELABORATION/IMPLICATION)
```

**특징**:
- 증거 중심 구조
- 과학 논문, 신문 기사에서 빈번
- 사실 기반의 직접적인 전개

**예시 스킬**: Command of Evidence, Text Structure and Purpose

---

### 패턴 4: INTRODUCE → PIVOT → EVIDENCE
**빈도: 22회**

```
문장 1: 주제 소개 (INTRODUCE)
문장 2: 입장 전환 (PIVOT) - "그러나", "반면", "다르게는"
문장 3: 증거/설명 (EVIDENCE)
```

**특징**:
- 대조/입장 변화가 있는 구조
- 문학, 역사, 사회과학에서 빈번
- "그러나" 이후의 내용이 중요

**예시 스킬**: Inferences, Rhetorical Synthesis, Transitions

---

### 패턴 5: INTRODUCE → BACKGROUND → EVIDENCE
**빈도: 21회**

```
문장 1: 주제 소개 (INTRODUCE)
문장 2: 배경 정보 (BACKGROUND)
문장 3: 증거/발견 (EVIDENCE)
```

**특징**:
- 맥락 → 증거 구조
- 역사, 과학 텍스트에서 빈번
- 배경 이해가 증거 이해의 열쇠

**예시 스킬**: Central Ideas and Details, Inferences

---

## 시퀀싱 패턴 분류

### 유형 A: 기본 구조 (50% 이상)
```
INTRODUCE → BACKGROUND → ...
INTRODUCE → CLAIM → ...
INTRODUCE → EVIDENCE → ...
```
- 직선적 진행
- 학생이 예측하기 쉬움
- Easy ~ Medium 문제에서 빈번

### 유형 B: 전환 구조 (20%)
```
INTRODUCE → PIVOT → ...
INTRODUCE → BACKGROUND → PIVOT → ...
```
- 입장/방향 전환
- 학생이 놓치기 쉬움
- Medium ~ Hard 문제에서 빈번

### 유형 C: 복합 구조 (30%)
```
INTRODUCE → BACKGROUND → EVIDENCE → ELABORATION
INTRODUCE → CLAIM → EVIDENCE → IMPLICATION
INTRODUCE → FEATURE → EXAMPLE → FINDING
```
- 3개 이상의 요소 결합
- 고도의 이해 필요
- Hard 문제에서 빈번

---

## 시퀀싱과 난이도의 관계

### Easy (Simple Sequence)
- 요소 2~3개
- INTRODUCE로 시작
- 직선적 진행
- PIVOT 거의 없음

**예**: INTRODUCE → BACKGROUND → EVIDENCE

### Medium (Moderate Complexity)
- 요소 3~4개
- 하나의 PIVOT 포함 가능
- 부가 정보 포함
- ELABORATION/EXAMPLE 자주 포함

**예**: INTRODUCE → BACKGROUND → EVIDENCE → ELABORATION

### Hard (Complex Structure)
- 요소 4개 이상
- 여러 PIVOT 포함
- 미묘한 대비/전환
- IMPLICATION/QUALIFICATION 포함

**예**: INTRODUCE → BACKGROUND → PIVOT → EVIDENCE → IMPLICATION

---

## 스킬별 주요 시퀀싱

### Command of Evidence
- INTRODUCE → CLAIM → EVIDENCE
- INTRODUCE → BACKGROUND → EVIDENCE → IMPLICATION
- 증거를 찾기 위해 시퀀스 흐름 파악 필수

### Words in Context
- INTRODUCE → ELABORATION (단어의 맥락)
- INTRODUCE → EXAMPLE (단어 사용 패턴)
- 문맥의 명확한 이해가 중요

### Rhetorical Synthesis
- INTRODUCE → CLAIM → PIVOT → COUNTER-EVIDENCE
- 여러 입장을 종합하는 구조
- 시퀀스의 전환점이 중요

### Transitions
- PIVOT 연결 (그러나, 그래서, 또한)
- 요소 간의 논리적 연결
- 시퀀스 요소 간의 관계 이해

### Text Structure and Purpose
- 전체 시퀀싱 패턴의 의미
- "왜 이 순서인가?"에 대한 이해
- 저자의 의도 파악

---

## 학습 전략

### 시퀀싱 파악 연습

**Step 1: 요소 식별**
```
각 문장을 읽으면서 INTRODUCE / BACKGROUND / CLAIM / EVIDENCE 등 표시
```

**Step 2: 패턴 인식**
```
"이 패턴은 어떤 구조인가?"
→ 기본 구조 vs 전환 구조 vs 복합 구조 판단
```

**Step 3: 함의 파악**
```
"이 구조에서 중요한 정보는?"
→ 시퀀스 흐름으로 예상할 수 있는 정보
```

**Step 4: 문제 해결**
```
시퀀싱 이해를 바탕으로 문제 풀이
```

---

## 실전 예시

### 예시 1: 기본 구조 (Easy)
```
1. [INTRODUCE] Scientists have long studied the behavior of bees.
2. [BACKGROUND] Bees live in colonies organized by strict hierarchies.
3. [EVIDENCE] Research shows that individual bees can communicate 
             through specific movements called dances.

문제: 이 passage의 주요 내용은?
해석: 과학자들이 꿀벌의 행동 연구 → 계층 구조 설명 → 의사소통 방식 제시
```

### 예시 2: 전환 구조 (Medium)
```
1. [INTRODUCE] Many people believe that older workers are less productive.
2. [BACKGROUND] This assumption has influenced hiring practices.
3. [PIVOT] However, recent studies contradict this stereotype.
4. [EVIDENCE] Data shows that experienced workers often outperform 
             younger employees in complex tasks.

문제: 저자는 어떤 입장인가?
해석: 일반적 편견 제시 → PIVOT로 반박 → 증거로 새로운 주장 지지
```

---

## 통계 요약

```
시퀀싱 커버: 1,511개 (88%)
미커버: 204개 (12%, Math 문제 포함)

주요 시작 요소: INTRODUCE (거의 모든 passage)
주요 시퀀스 위치 2: BACKGROUND (약 50%)
주요 시퀀스 위치 3: EVIDENCE (약 40%)

전환점(PIVOT) 포함:
- Easy: 5%
- Medium: 20%
- Hard: 35%
```

---

## 다음 단계

- [[rw_skills_analysis]] — 스킬별 상세 분석
- [[rw_concept_tags]] — 개념 태그 분석
- [[transitions]] — 전환 표현 마스터
