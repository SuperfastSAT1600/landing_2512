---
title: Words in Context — 문항 패턴 분석
type: analysis
domain: questions
tags: [wic, words-in-context, sat-rw, pattern-analysis]
updated: 2026-05-17
source: schema:questions:master_sat_ontology_v3.jsonl
---

# Words in Context — 문항 패턴 분석

`schema:questions:master_sat_ontology_v3.jsonl` 기준. 전체 RW 1,715문항 중 **241문항(14.1%)**.

관련 문서: [[group_framework]] | [[wic_vocab_list]]

---

## 1. 전체 분포

| 구분 | 수 | 비율 |
|------|----|------|
| **전체 WIC** | 241개 | RW의 14.1% |
| Easy | 130개 | 54.0% |
| Medium | 57개 | 23.7% |
| Hard | 54개 | 22.4% |

Easy가 절반 이상이다. 그러나 CB(College Board)는 시험에서 Easy/Medium/Hard를 고르게 출제하므로
**실전에서는 Medium·Hard 비율이 훨씬 높게 느껴진다.**

---

## 2. 문항 유형 (Stem 분류)

WIC 문항은 묻는 방식에 따라 두 가지로 나뉜다.

| 유형 | 비율 | Stem 예시 |
|------|------|----------|
| **Type 1: blank_fill** | 83.4% (201개) | "Which choice completes the text with the most logical and precise word or phrase?" |
| **Type 2: as_used_in** | 15.8% (38개) | "As used in the text, what does the word _X_ most nearly mean?" |
| 기타 | 0.8% (2개) | fill-in 변형 |

### Type 1: blank_fill

패시지에 빈칸(`______`)이 있고, 문맥상 가장 정확한 단어/구를 고른다.

**난이도별 정답 어휘 수준:**

| 난이도 | 정답 예시 | 특징 |
|--------|----------|------|
| Easy | transformed, embraced, speculates, inexperienced with | 일상 어휘, 명확한 문맥 신호 |
| Medium | rectify, concede, irrelevant, impenetrable | 중급 학술 어휘 |
| Hard | dogmatic, surmised, corroborate, sanguine, tenuous, latent | 고급 학술 어휘, 함정 오답 정교 |

**정답 품사 분포 (blank_fill 201개):**

| 품사 | 수 | 비율 |
|------|----|------|
| 동사 | 81개 | 40.3% |
| 형용사 | 57개 | 28.4% |
| 명사 | 43개 | 21.4% |
| 동사+명사 겸용 | 17개 | 8.5% |

> **핵심**: WIC는 동사 빈칸이 40%다. 동사는 문장의 논리 방향을 결정하므로,
> 정답 동사와 오답 동사가 정반대 방향인 경우가 많다.

### Type 2: as_used_in

단어가 해당 문맥에서 어떤 뜻으로 쓰였는지를 묻는다. 패시지에 빈칸이 없다.

**검출된 타겟 단어 목록 (38개):**

| 난이도 | 단어 | 정답 (= 실제 쓰인 뜻) | 흔한 뜻 (= 함정) |
|--------|------|---------------------|----------------|
| Hard | contracted | Developed | Restricted (계약하다) |
| Hard | disputing | Providing resistance to | Arguing about |
| Hard | determine | Dictate | Conclude |
| Hard | endure | Tolerate | Persist |
| Hard | manifest | Perceptible | Realized |
| Medium | assumed | Acquired | Acknowledged |
| Medium | quality | Characteristic | Standard |
| Medium | answers | Fulfills | Explains |
| Easy | disturbed | Alarmed | Disorganized |
| Easy | completing | Finishing | Destroying |
| Easy | clear | Transparent | Simple |

> Type 2는 [[group_framework#Group B]] 단어 집합과 직결된다.
> SAT는 의도적으로 단어의 **2번째·3번째 뜻**을 정답으로 설정한다.
> "contracted = 계약하다"를 아는 학생이 "Developed"를 고르지 못하는 것이 함정의 핵심.

---

## 3. 패시지 유형

| 장르 | 수 | 비율 |
|------|----|------|
| Informational (연구·과학·사회) | 99개 | 41.1% |
| Literary (소설·희곡·시) | 57개 | 23.7% |
| 분류 불명 | 85개 | 35.3% |

**장르별 특성:**

- **Informational**: 연구 결과 요약 → 빈칸은 연구자의 행위 동사(surmised, corroborated, demonstrated) 또는 결과 형용사(innocuous, negligible, tenuous)
- **Literary**: 소설 지문 → as_used_in 문제 비율 높음. 고전 소설(George Eliot, Oscar Wilde, James Baldwin) 등에서 단어의 문어체 용법을 테스트

---

## 4. 오답 함정 패턴 (Hard 기준)

Hard blank_fill 48개 분석에서 오답 선지는 4가지 함정으로 분류된다.

### Trap A — 방향 반전 (Polarity Flip)

정답과 반대 방향의 단어를 오답으로 배치.

| 정답 | 방향반전 오답 | 패시지 핵심 |
|------|------------|-----------|
| repudiates (거부) | proclaims (선언) | "Rejecting the premise..." |
| negating (부정) | substantiating (입증) | "close analysis... undermined attribution" |
| intersect (교차) | diverge (분기) | "fine art and fashion rarely ___" |
| disparate (이질적) | complementary (상호보완) | "tension among his ___ influences" |
| paucity of (부족) | profusion of (풍부) | "inspired by their ___ research" |

**전략**: 패시지에서 긍정/부정 방향을 먼저 결정하고, 방향이 맞는 선지만 남긴다.

### Trap B — 관련 어휘 함정 (Related-but-Wrong)

같은 의미 영역에 있지만 문맥의 정확한 뉘앙스와 다른 단어.

| 정답 | 관련 오답 | 왜 틀리나 |
|------|---------|---------|
| corroborate | circumvent, disseminate, implement | 모두 "연구 결과에 대한 행위"지만, 패시지는 "일치 여부 확인" |
| surmised | questioned, contrived | questioned는 방향 반전, contrived는 의도성 함의 과도 |
| buttress | annotate, reciprocate | 모두 학술 동사이나 "논거를 강화한다"는 뜻이 아님 |
| exhaustive | imaginative, questionable | 모두 연구 성격 형용사이나 패시지는 "완전성" 요구 |

**전략**: 답지 4개 중 2-3개가 비슷한 영역에 몰려 있으면, 패시지의 정확한 논리 관계(원인/결과, 대조, 인과)를 기준으로 필터링.

### Trap C — 극성 과잉 (Intensity Mismatch)

정답보다 강하거나 약한 단어.

| 정답 | 과잉/부족 오답 | 설명 |
|------|-------------|------|
| stymie (방해) | compound (악화), outstrip (추월) | 동일 부정적 맥락이지만 강도·방향 다름 |
| tenuous (약한) | nuanced (미묘한), disorienting (혼란스러운) | "weak claim"이지 "nuanced"가 아님 |
| latent (잠재적) | predetermined, replicable | 시간축·확실성 축이 다름 |

**전략**: 패시지가 주장의 **강도**를 암시하는 부사/형용사(barely, merely, simply, thoroughly, entirely)를 찾는다.

### Trap D — as_used_in 의미 동결 함정

Type 2 특유의 함정. 학생이 외운 "주요 뜻"을 오답으로 배치.

| 단어 | 외운 뜻 (함정) | 실제 문맥 뜻 (정답) |
|------|-------------|-----------------|
| contracted | 계약했다 | 습득했다 (Developed) |
| determine | 결정하다 | 지배하다 (Dictate) |
| endure | 지속되다 | 견디다 (Tolerate) |
| manifest | 나타나다 (v.) | 인식 가능한 (adj., Perceptible) |
| disputing | 논쟁하다 | 저항을 제공하다 (Providing resistance to) |

> 이 함정은 [[group_framework#Group B]] (의미 동결 오류)의 직접적 발현이다.
> 처방: 단어의 어원과 의미 분화 경로를 "뜻의 뿌리"로 학습.

---

## 5. 난이도 판별 기준 (귀납)

**Easy → Hard 전환 지표:**

| 요소 | Easy | Hard |
|------|------|------|
| 정답 어휘 | 일상어 | 학술 어휘 (Latin계) |
| 오답 차이 | 분명히 다름 | 미묘하게 다름 |
| 패시지 길이 | 1-3문장 | 4-6문장 |
| 빈칸 위치 | 첫 문장 | 마지막 문장 (결론부) |
| 문맥 신호 | 명시적 | 대조·양보 구조 내 암묵적 |

**Hard 빈칸이 결론부에 오는 이유**: 학생이 패시지 전체를 읽고 논리 방향을 종합해야만 정답을 고를 수 있도록 설계됨.

---

## 6. 풀이 전략 요약

### Type 1 (blank_fill) 접근법

```
1. 빈칸 앞뒤 1-2문장의 논리 방향 결정
   → 긍정/부정, 원인/결과, 대조/인정

2. 방향이 맞는 선지 2개로 압축

3. 두 선지 중 문맥의 정확한 뉘앙스에 맞는 것 선택
   → 강도(intensity), 관계(relation), 행위자(agent) 확인
```

### Type 2 (as_used_in) 접근법

```
1. 타겟 단어를 포함한 문장 전체 읽기
   → 단어를 블랭크로 치환하고 문맥만으로 뜻 추론

2. 주요 뜻을 버리고 문맥 뜻으로 생각하기
   → "contracted"를 "계약"으로 읽지 않고 "무언가가 생겼다"로 읽기

3. 정답 확인: 추론한 뜻과 선지의 paraphrase 매칭
```

---

## 데이터 기반 근거

```python
# schema/questions/master_sat_ontology_v3.jsonl 집계 재현
import json, re
from pathlib import Path
from collections import Counter

qs = [json.loads(l) for l in Path('schema/questions/master_sat_ontology_v3.jsonl').read_text().splitlines() if l.strip()]
wic = [q for q in qs if 'Words in Context' in q.get('skill', '')]
print(f'WIC: {len(wic)}개')
print(Counter(q['difficulty'] for q in wic))
```
