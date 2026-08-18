# Transitions 세부 분류 분석

**기본 데이터**: 173문제 (Easy:73, Medium:61, Hard:39)
**데이터 출처**: `/workspace/blog_database/sat_questions.db`

---

## 1. Transitions 스킬의 특성

### 1.1 주요 오답 패턴

| 오답 유형 | 비율 | 의미 |
|---------|------|------|
| **Pre-Pivot Reading** | 37.5% | 전환점 이전 내용만 읽고 선택 |
| **Contradiction** | 34.5% | 논리 관계를 반대로 이해 |
| **Distortion** | 13.5% | 관계의 강도·방향을 왜곡 |
| **Partial Match** | 9.8% | 부분적으로만 맞는 전환어 선택 |
| **Out Of Scope** | 2.0% | 지문과 무관한 논리 관계 선택 |

**핵심 인사이트**: Transitions의 가장 큰 함정은 **"전환점(pivot) 이전만 읽는 오류"**. 전환어 뒤에 오는 절이 실제 논리 방향을 결정하므로, 빈칸 직후의 내용이 관계의 핵심이다. Pre-Pivot Reading(37.5%)과 Contradiction(34.5%)이 합산 72%로 대부분의 오답을 차지한다.

---

### 1.2 Arc 시퀀스 분석

| Arc 패턴 | 문제 수 | Easy | Medium | Hard | 특징 |
|---------|--------|------|--------|------|------|
| **CLAIM_EVIDENCE** | 55 | 19 | 18 | 18 | 주장→근거 구조. Hard 비율 33%로 균등 분포 |
| **PURE_INFO** | 54 | 26 | 20 | 8 | 정보 나열. Easy에 집중(48%), Hard 드묾 |
| **INFO_TO_CONCL** | 52 | 26 | 17 | 9 | 정보→결론. Easy 집중(50%), Hard 감소 |
| **DUAL_CLAIM** | 6 | 1 | 4 | 1 | 두 주장 대립. Medium 중심 |
| **CLASSICAL_ARG** | 5 | 0 | 2 | 3 | 고전 논증. Hard 비율 60% |

**Arc별 난이도 패턴 해석**:

- **CLAIM_EVIDENCE**가 Hard에서 두드러지는 이유: 주장(C)과 근거(I/bg) 사이의 전환어를 선택할 때, 지문 내 pivot point가 여러 번 등장하여 Pre-Pivot Reading 오류를 유발한다. 오답 분석에서 CLAIM_EVIDENCE 지문의 Pre-Pivot Reading이 55건으로 전체 Arc 중 최고.

- **PURE_INFO**에서 Contradiction이 44건으로 Pre-Pivot(36건)을 앞서는 이유: 순수 정보 나열 지문에서는 대조 전환어("however")와 추가 전환어("furthermore")를 혼동하는 경우가 많다.

- **INFO_TO_CONCL**의 Pre-Pivot(46건) 우세: 정보 나열 후 결론을 연결하는 빈칸에서, 학생들이 앞 정보 문장만 읽고 "예시" 전환어를 선택하는 패턴이 빈번하다.

**Top 시퀀스** (sequence_simple 기준):

| 시퀀스 | 빈도 | 설명 |
|--------|------|------|
| EXP_I-I-CL | 40 | 설명-정보-정보-결론: 결론 직전 빈칸이 핵심 |
| EXP_I-I | 39 | 설명-정보-정보: 두 번째 정보로 전환 |
| EXP_I-I-I | 12 | 설명-정보×3: 추가/예시 전환어 반복 |
| ARG_C-CL | 9 | 논증-주장-결론: 주장 강화 전환어 |
| EXP_I-I-C | 8 | 설명-정보-정보-주장: 정보에서 주장으로 비약 |

---

### 1.3 전환 카테고리별 출제 분포

| 카테고리 | 빈도 | 대표 전환어 | 해당 Sub-skill |
|---------|------|----------|--------------|
| Contrast | 49 | however, but, yet | TRAN-3 |
| Cause and effect | 45 | therefore, thus, consequently | TRAN-2 |
| Addition | 38 | furthermore, additionally, moreover | TRAN-1 |
| Exemplification | 16 | for example, for instance, specifically | TRAN-5 |
| Chronological/Sequence | 6 | then, next, first | TRAN-7 |
| Comparison | 2 | similarly, likewise | TRAN-4/TRAN-3 |
| Elaboration/Clarification | 2 | namely, in other words | TRAN-6 |

**Contrast(49)와 Cause and effect(45)가 전체의 54%**: 이 두 카테고리가 틀리면 Contradiction 오답(34.5%)으로 직결된다. "however"를 "therefore"로 혼동하거나 그 반대가 가장 흔한 실수.

---

## 2. Transitions 세부 Sub-skill 분석

### 2.1 Dimension 1: 동일 방향 논리 관계

**TRAN-1: Continuation / Addition (연속·추가)**
- 앞 내용을 **이어가거나 추가**: "furthermore", "additionally", "moreover", "also"
- 논리 흐름: A → A+ (같은 방향 강화)
- Arc 적합성: PURE_INFO(EXP_I-I), INFO_TO_CONCL 초반부
- 난이도: **Easy**
- 주요 오답: Pre-Pivot Reading (앞 문장을 대조로 잘못 읽음), Contradiction (반대 전환어 선택)
- 판별 기준: 두 문장이 같은 측면을 공유하는가? 반박/제한 없이 같은 방향인가?

**TRAN-5: Exemplification (예시 제시)**
- 앞의 일반적 진술을 **구체적 예시로 설명**: "for example", "for instance", "specifically"
- 논리 흐름: 일반(General) → 구체(Specific)
- Arc 적합성: EXP_I-I-CL에서 두 번째 I 위치
- 난이도: **Easy-Medium**
- 주요 오답: Partial Match ("specifically"와 "for example"의 범위 차이 혼동)
- 판별 기준: 뒤 문장이 앞 문장의 부분집합인가? 개별 사례인가?

**TRAN-7: Temporal / Chronological (시간 순서)**
- **시간적 흐름** 표현: "then", "next", "subsequently", "first...then"
- 논리 흐름: 사건 A → (시간 후) → 사건 B
- Arc 적합성: ARG_I-C-CL 시퀀스
- 난이도: **Easy-Medium**
- 주요 오답: Contradiction ("similarly"로 혼동 — 시간 순서를 유사성으로 착각)
- 판별 기준: 두 절에 시간 표현이 있는가? 인과 관계 없이 순서만 있는가?

---

### 2.2 Dimension 2: 대립·전환 논리 관계

**TRAN-3: Contrast / Opposition (대조·반대)**
- 앞과 뒤가 **명확히 대립**: "however", "but", "yet", "in contrast", "on the other hand"
- 논리 흐름: A → NOT-A (방향 전환)
- Arc 적합성: CLAIM_EVIDENCE(ARG_C-CL), DUAL_CLAIM
- 난이도: **Medium**
- 주요 오답: Contradiction (대조를 인과로 오인, "therefore" 선택), Pre-Pivot Reading (앞 문장 내용과 일치하는 전환어 선택)
- 판별 기준: 두 문장의 주어가 다른 결과를 갖는가? 예상을 벗어나는 내용이 뒤에 오는가?

**TRAN-4: Concession / Contrast with Qualification (양보적 대조)**
- 앞을 **인정하면서도 뒤에서 역전**: "although", "even though", "while X, Y"
- 논리 흐름: (인정) A → (역전) B — A의 사실을 받아들이되, B가 더 중요
- Arc 적합성: CLASSICAL_ARG (Hard 비율 60%), COUNTER_REBUTTAL
- 난이도: **Hard**
- 주요 오답: Pre-Pivot Reading (양보절 A만 읽고 A를 지지하는 전환어 선택), Contradiction (완전 반대 관계로 잘못 이해)
- 판별 기준: "비록~이지만" 구조인가? 앞 내용이 부분적으로 인정되지만 결론은 반대인가?

---

### 2.3 Dimension 3: 인과·결론 논리 관계

**TRAN-2: Causality (인과)**
- 앞이 원인, 뒤가 결과: "therefore", "thus", "consequently", "as a result"
- 논리 흐름: 원인 A → 결과 B (필연적 연결)
- Arc 적합성: INFO_TO_CONCL, CLAIM_EVIDENCE의 결론 위치
- 난이도: **Medium**
- 주요 오답: Contradiction ("however"와 혼동), Pre-Pivot Reading (원인-결과를 대조로 오인)
- 판별 기준: 뒤 문장이 앞 문장의 논리적 귀결인가? "왜냐하면" 관계인가?

**TRAN-6: Elaboration / Clarification (상세 설명·재표현)**
- 앞 내용을 **다른 말로 자세히 풀기**: "in other words", "that is", "namely", "indeed"
- 논리 흐름: X → X' (동일 내용의 다른 표현)
- Arc 적합성: EXP_I-I 시퀀스 내 재표현 위치
- 난이도: **Medium**
- 주요 오답: Distortion (같은 내용을 "therefore"로 강화·귀결 관계로 오해), Partial Match ("specifically"와 혼동)
- 판별 기준: 두 문장이 같은 핵심 내용을 담는가? 뒤 문장에 새로운 정보가 없는가?

---

## 3. Sub-skill × 오답 유형 연결표

| Sub-skill | 주 오답 유형 | 원인 | 회피 전략 |
|-----------|-----------|------|---------|
| **TRAN-1** (연속) | Pre-Pivot Reading | 앞 문장을 대조로 잘못 분류 | 두 문장 방향이 같은지 먼저 확인 |
| **TRAN-2** (인과) | Contradiction | "however"↔"therefore" 혼동 | 인과(원인-결과) vs 대조(반대) 구조 명확히 구분 |
| **TRAN-3** (대조) | Pre-Pivot Reading | 빈칸 앞 절의 내용을 지지하는 전환어 선택 | 빈칸 뒤 절이 무엇을 말하는지 먼저 파악 |
| **TRAN-4** (양보) | Pre-Pivot Reading | 양보절(앞 절)만 읽고 판단 | "비록~이지만" 구조 전체 파악 후 결론절 중심 |
| **TRAN-5** (예시) | Partial Match | "specifically"와 "for example" 범위 혼동 | 뒤 문장이 개별 사례인지 vs 세부 사항인지 구분 |
| **TRAN-6** (상세) | Distortion | 재표현을 인과 관계로 왜곡 | 뒤 문장이 새 정보를 추가하는지 확인 |
| **TRAN-7** (시간) | Contradiction | 시간 순서를 유사성으로 오해 | 두 절에 시간 표현 존재 여부 확인 |

**Arc별 주요 오답 패턴**:

| Arc | 1위 오답 | 2위 오답 | 시사점 |
|-----|---------|---------|--------|
| CLAIM_EVIDENCE | Pre-Pivot(55) | Contradiction(48) | 주장-근거 구조에서 pivot 위치 파악이 핵심 |
| INFO_TO_CONCL | Pre-Pivot(46) | Contradiction(36) | 결론 전환어(therefore/thus) vs 대조 전환어 혼동 |
| PURE_INFO | Contradiction(44) | Pre-Pivot(36) | 정보 나열에서 방향 판단 오류 가장 빈번 |
| DUAL_CLAIM | Pre-Pivot(5) | Contradiction(5) | 두 주장 대립 구조에서 어느 쪽이 pivot인지 혼동 |
| CLASSICAL_ARG | Pre-Pivot(6) | Contradiction(5) | 여러 근거 중 빈칸 위치의 논리 역할 파악 필요 |

---

## 4. 실전 예시 문제

### 예시 1 — Easy (ID: e0bd4f8a)

**Arc**: CLAIM_EVIDENCE | **Sequence**: ARG_I-C-CL | **Category**: Cause and effect (실제 정답은 Temporal)

> In 1942, the 1,500-mile Alaska Highway was constructed in under nine months, largely due to the skilled work of nearly 4,000 African American soldiers from US Army engineering regiments. The soldiers' contribution was overlooked for decades. ______ in 2017, lawmakers declared October 25 a day of recognition—"Alaska Highway Day"—for the troops who helped build this critical roadway.

- A: Lastly,
- B: **Then,** ← 정답
- C: Similarly,
- D: For example,

**분석**:
- **정답 B "Then"**: 수십 년간 간과된 시기 이후, 2017년이라는 시간적 후속 사건을 연결. TRAN-7(시간 순서) 유형.
- **오답 A "Lastly"**: 일련의 요점 중 마지막이라는 의미 — 이 지문은 목록 구조가 아니므로 부적합.
- **오답 C "Similarly"**: 앞 문장(기여가 간과됨)과 유사하다는 신호 — 인정 행사와 무시는 유사하지 않음. Pre-Pivot Reading 유형.
- **오답 D "For example"**: 앞 문장의 구체적 예시 — 2017년 사건은 예시가 아니라 후속 사건.

**핵심 포인트**: "overlooked for decades" 이후 "in 2017"의 시간 갭을 파악하면 시간 순서 전환어가 필요함을 알 수 있다.

---

### 예시 2 — Medium (ID: a40c7aa3)

**Arc**: INFO_TO_CONCL | **Sequence**: EXP_I-I-CL | **Category**: Contrast

> Most of the planets that have been discovered outside our solar system orbit G-type stars, like our Sun. In 2014, ______ researchers identified a planet orbiting KELT-9, a B-type star more than twice as massive and nearly twice as hot as the Sun. Called KELT-9b, it is one of the hottest planets ever discovered.

- A: likewise,
- B: **however,** ← 정답
- C: therefore,
- D: for example,

**분석**:
- **정답 B "however"**: 대부분의 행성은 G형 별(태양 유사) 주위를 도는데, 이 행성은 B형 별(훨씬 뜨겁고 큰)을 도는 예외 사례. TRAN-3(대조) 유형.
- **오답 A "likewise"**: 앞 정보와 유사하다는 신호 — 반대로 B형 별은 G형 별과 대조된다.
- **오답 C "therefore"**: 결과를 나타냄 — KELT-9b 발견은 G형 별 행성 다수의 결과가 아니다.
- **오답 D "for example"**: 예시를 나타냄 — KELT-9b는 G형 별 행성의 예시가 아니라 예외이다.

**핵심 포인트**: EXP_I-I-CL 시퀀스에서 두 번째 I(정보) 위치의 빈칸은 첫 번째 정보와의 관계를 결정한다. "Most orbit G-type" vs "one orbits B-type"의 대립을 파악해야 한다.

---

### 예시 3 — Hard (ID: 4d2736f0)

**Arc**: INFO_TO_CONCL | **Sequence**: LIT_I-I-CL | **Category**: Comparison

> In her poetry collection *Thomas and Beulah*, Rita Dove interweaves the titular characters' personal stories with broader historical narratives. She places Thomas's journey from the American South to the Midwest in the early 1900s within the larger context of the Great Migration. ______ Dove sets events from Beulah's personal life against the backdrop of the US Civil Rights Movement.

- A: Specifically,
- B: Thus,
- C: Regardless,
- D: **Similarly,** ← 정답

**분석**:
- **정답 D "Similarly"**: Thomas의 이야기(대이주와 연결)와 Beulah의 이야기(민권운동과 연결)가 동일한 패턴 — 개인사와 역사적 사건의 엮기. TRAN-1/TRAN-3 혼합이 아닌 비교(Comparison) 유형.
- **오답 A "Specifically"**: Beulah 내용이 Thomas 내용의 세부 사항이라는 신호 — 실제로는 동등한 병렬 사례.
- **오답 B "Thus"**: Thomas 이야기의 결과로 Beulah 이야기가 나온다는 신호 — 인과 관계 없음.
- **오답 C "Regardless"**: Thomas 이야기에도 불구하고 Beulah 이야기가 성립한다는 신호 — 대조 관계 없음.

**핵심 포인트 (Hard 특성)**: "specifically"가 직관적으로 매력적으로 보이지만(Beulah를 더 구체적으로 다루는 것처럼 느껴짐), 실제로 두 단락은 동등한 병렬 구조이다. 첫 문장("interweaves... with broader historical narratives")이 두 사례 모두를 아우르는 주제임을 파악해야 한다. Pre-Pivot Reading 함정: 두 번째 문장(Thomas)만 보고 세 번째 문장이 그것의 세부 설명이라고 착각.

---

## 5. Pre-Pivot Reading 패턴 심층 분석

### 5.1 함정의 구조

Pre-Pivot Reading은 Transitions 문제에서 37.5%의 빈도로 발생하는 핵심 오류 패턴이다. 구조적으로 두 가지 형태가 있다.

**형태 A — 양보절 함정 (TRAN-4 연관)**:
```
[빈칸]. + [주절]
```
예: "The results were inconclusive. ______, researchers decided to expand the study."

- Pre-Pivot Reading 오답: "Similarly" (앞 내용과 같다고 오해)
- 정답: "Therefore" (결론 도출) 또는 "However" (역접)
- 학생 오류: 빈칸 앞 "inconclusive"라는 키워드만 보고 부정적 전환어를 고름

**형태 B — 대조 구조 함정 (TRAN-3 연관)**:
```
[배경 정보]. ______, [반전 사실].
```
예: "Most X do Y. ______, this X does Z."

- Pre-Pivot Reading 오답: "Additionally" (앞 내용 추가로 오해)
- 정답: "However"
- 학생 오류: 앞 문장 "Most X do Y"만 읽고 뒤도 같은 방향이라고 가정

### 5.2 Arc별 Pre-Pivot Reading 발생 빈도

| Arc | Pre-Pivot 건수 | 해당 Arc 총 오답 중 비율 |
|-----|-------------|----------------------|
| CLAIM_EVIDENCE | 55 | 41.4% |
| INFO_TO_CONCL | 46 | 39.3% |
| PURE_INFO | 36 | 32.1% |
| DUAL_CLAIM | 5 | 33.3% |
| CLASSICAL_ARG | 6 | 40.0% |

CLAIM_EVIDENCE에서 Pre-Pivot이 41.4%로 가장 높다 — 주장(Claim) 다음에 오는 근거(Evidence) 구조에서, 학생들이 주장 부분만 보고 "주장을 지지하는" 전환어를 선택하기 때문이다.

### 5.3 해결 전략 3단계

1. **빈칸 뒤 절을 먼저 읽는다** — 빈칸 앞이 아니라 뒤의 내용이 전환어의 방향을 결정한다.
2. **두 절의 핵심어를 대조한다** — 같은 키워드가 반복되면 추가/예시, 반대 키워드가 등장하면 대조.
3. **pivot 위치를 확인한다** — "although/while/despite"가 앞에 있으면 그것이 양보절이고 뒤가 결론이다.

---

## 6. 버전 관리

| 버전 | 날짜 | 변경사항 |
|------|------|---------|
| 1.0 | 2026-05-11 | 초기 정의 (7개 sub-skill) |
| 2.0 | 2026-05-12 | Arc 시퀀스 분석, Dimension 구조, Sub-skill × 오답 연결표, 실전 예시 3개, Pre-Pivot 심층 분석 추가 |
