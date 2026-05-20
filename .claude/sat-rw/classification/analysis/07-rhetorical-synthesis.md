# Rhetorical Synthesis 세부 분류 분석

**기본 데이터**: 188문제 (Easy:40, Medium:107, Hard:41)
**데이터 출처**: `blog_database/sat_questions.db`

---

## 1. Rhetorical Synthesis 스킬의 특성

### 1.1 주요 오답 패턴

| 오답 유형 | 비율 | 의미 |
|---------|------|------|
| **Partial Match** | 88.2% | 일부 정보만 포함하거나 목적을 부분적으로만 충족 |
| **Contradiction** | 3.1% | 노트의 내용과 반대되는 정보 제시 |
| **Out Of Scope** | 3.1% | 노트에 없는 정보 포함 |
| **Misattribution** | 2.1% | 정보의 출처나 주체를 잘못 귀속 |
| **Overgeneralization** | 2.1% | 노트의 제한된 정보를 지나치게 확장 |

**핵심 인사이트**: RS 오답의 88.2%가 Partial Match이다. 이는 RS가 "맞는 정보를 선택하는 것"이 아니라 "목적에 완전히 일치하면서 모든 필요한 정보를 포함하는 문장을 선택하는 것"임을 보여준다. 학생 대부분은 "관련 있는" 선택지를 고르지만, SAT는 "목적을 정확히 충족하는" 선택지를 요구한다.

### 1.2 CP 라벨링이 없는 이유 — RS만의 특수한 지문 구조

RS는 SAT RW 9개 스킬 중 **유일하게 Clause Pattern(CP) 라벨링이 없는** 스킬이다.

**이유**: CP 라벨링은 "연속적 산문(narrative prose)" — 즉, 논리적 흐름을 가진 문단 구조를 전제로 한다. RS의 지문은 학생이 연구 중 작성한 **bullet-point 노트** 형식이다.

```
While researching a topic, a student has taken the following notes:

[정보 항목 1]
[정보 항목 2]
[정보 항목 3]
...

The student wants to [목적 기술].
Which choice most effectively uses relevant information from the notes to accomplish this goal?
```

이 형식은 각 항목이 독립적 사실(fact)로 나열되어 있고, 항목 사이에 논리적 연결어가 없다. CP 라벨링이 전제하는 "I_bg → C_au → CL_au" 같은 논증 흐름 자체가 존재하지 않는다.

**RS vs 다른 스킬의 지문 구조 비교**:
- 다른 8개 스킬: 산문 지문 → 독해 후 추론/판단
- RS: 노트 목록 → 합성 문장 선택 (독해가 아닌 정보 조합 능력 테스트)

### 1.3 Partial Match 88.2%의 구조적 원인

Partial Match가 압도적으로 높은 것은 RS 선택지 설계 방식에서 비롯된다.

**SAT RS 선택지 설계 패턴**:
- 선택지 A: 목적을 정확히 충족 + 모든 관련 정보 포함 (정답)
- 선택지 B: 관련 정보 포함하지만 목적을 충족하지 못함 (Partial Match — 목적 불일치)
- 선택지 C: 목적과 관련 있지만 핵심 정보를 빠뜨림 (Partial Match — 정보 불완전)
- 선택지 D: 관련 없는 정보 포함하거나 목적을 오해 (Out Of Scope 또는 Contradiction)

**Partial Match 오답의 두 가지 유형**:
1. **정보 불완전형**: 관련 정보를 담지만 목적 달성에 필요한 핵심 세부사항 누락
2. **목적 불일치형**: 정보는 정확하지만 학생의 작성 목적("emphasize", "introduce", "present the study")에 맞지 않음

**학생의 흔한 실수**: "이 선택지도 노트의 정보를 담고 있는데 왜 틀렸지?" — RS에서 "관련 있는 정보 포함"은 필요조건일 뿐 충분조건이 아니다.

### 1.4 난이도 분포 및 특성

| 난이도 | 문제 수 | 비율 | 특성 |
|--------|---------|------|------|
| Easy | 40 | 21.3% | 목적이 단일하고 명시적, 1~2개 핵심 정보만 결합 |
| Medium | 107 | 56.9% | 목적이 복합적, 청중 고려 필요, 여러 정보 조합 |
| Hard | 41 | 21.8% | 목적이 미묘함, 노트 전체를 파악해야 방향 설정 가능 |

**synthesis_task 주요 유형**: Describe data(26), Support a claim(21), Compare findings(7), Introduce a quotation(6), Introduce a concept(4)
**rhetorical_purpose 분포**: Inform(111/59%), Analyze(28/15%), Argue(8/4%)

---

## 2. Rhetorical Synthesis 세부 Sub-skill 분석

### 2.1 Dimension 1: 정보 선택 (Information Selection)

**RS-1: Relevant Information Selection**
- 주어진 목적에 직접 관련된 정보를 노트에서 선별
- 질문 신호: "emphasize [특정 정보]", "introduce [특정 개념]"
- 핵심 전략: 목적 문장을 먼저 읽고, 노트에서 그 목적에 부합하는 항목에 체크
- 난이도: Easy-Medium
- 함정: 전체 노트에서 흥미롭거나 중요해 보이는 정보를 임의로 선택 (→ Partial Match)

**RS-2: Irrelevant Information Exclusion**
- 목적과 무관한 정보를 배제하고 관련 정보만 포함
- 이중 기능: 포함할 정보를 선택 + 포함하지 말아야 할 정보 식별
- 난이도: Medium
- 함정: "노트에 있는 정보이므로 포함해도 된다"는 착각 (→ Out Of Scope)

### 2.2 Dimension 2: 논리적 통합 (Logical Integration)

**RS-3: Logical Flow Integration**
- 선택한 정보들을 논리적 순서(시간순, 인과순, 중요도순)로 배치
- 예: 연구 목적 → 연구 방법 → 연구 결과 순서
- 난이도: Medium
- 함정: 정보를 나열하되 순서를 무시 (→ Partial Match — 논리 흐름 불일치)

**RS-4: Grammatical Coherence**
- 선택한 정보들이 문법적으로 자연스럽게 연결되는 선택지 선택
- 병렬 구조, 관계절, 동격 표현의 정확한 사용
- 난이도: Medium
- 함정: 내용은 맞지만 문법 구조가 어색한 선택지

### 2.3 Dimension 3: 목적 충족 (Purpose Fulfillment)

**RS-5: Purpose Alignment**
- 최종 합성 문장이 "The student wants to [목적]"에 정확히 부합하는가
- 목적 키워드: "emphasize", "present the study", "introduce a concept", "support a claim"
- 난이도: Medium-Hard
- 함정: 관련 있는 내용이지만 목적 동사가 요구하는 방향과 다름 (→ Partial Match)

**RS-6: Tone/Style Matching**
- 합성 문장이 요청된 청중 수준이나 글쓰기 목적과 일치하는 문체인가
- 예: "이미 eDNA를 아는 청중에게" → 기본 정의를 다시 설명하면 안 됨
- 난이도: Medium
- 함정: 정보는 맞지만 청중 수준을 잘못 판단 (→ Partial Match — 청중 불일치)

**RS-7: Conciseness**
- 불필요한 정보 없이 간결하게 목적을 달성하는 문장 선택
- 두 선택지가 비슷한 정보를 담을 때, 더 간결하면서 목적에 정확한 것이 정답
- 난이도: Medium-Hard
- 함정: 정보가 더 많은 선택지를 "더 완전하다"고 판단 (→ 정보 과잉 오류)

---

## 3. Sub-skill × 오답 유형 연결표

| Sub-skill | 가장 흔한 오답 | 두 번째 오답 | 핵심 오류 메커니즘 |
|-----------|-------------|------------|-----------------|
| RS-1 (정보 선택) | Partial Match | Out Of Scope | 목적과 무관한 정보를 "관련 있다"고 오판 |
| RS-2 (무관 정보 배제) | Partial Match | Out Of Scope | 노트에 있는 정보라는 이유로 과잉 포함 |
| RS-3 (논리 흐름) | Partial Match | Contradiction | 정보는 맞지만 배치 순서나 논리 방향 오류 |
| RS-4 (문법 일관성) | Partial Match | — | 문법 구조 어색함으로 의미 흐름 단절 |
| RS-5 (목적 부합) | Partial Match | Misattribution | 목적 동사("emphasize" vs "introduce")를 오해 |
| RS-6 (문체 일치) | Partial Match | Overgeneralization | 청중 수준을 잘못 판단하여 불필요한 정의 추가 |
| RS-7 (간결성) | Partial Match | Out Of Scope | 정보 양을 "완전성"으로 오해 |

**공통 패턴**: RS의 오답은 거의 전부 Partial Match이며, 이는 "맞는 선택지를 찾는 것"이 아니라 "완전히 맞는 선택지를 찾는 것"이 RS의 핵심 과제임을 의미한다.

---

## 4. 실전 예시 3개

### 예시 1 — Easy (ID: 264e7415)

**Synthesis Task**: Emphasize distance (거리 강조)
**Rhetorical Purpose**: Inform
**Passage Topic**: History

**노트 (원문)**

While researching a topic, a student has taken the following notes:

The Philadelphia and Lancaster Turnpike was a road built between 1792 and 1794.

It was the first private turnpike in the United States.

It connected the cities of Philadelphia and Lancaster in the state of Pennsylvania. It was sixty-two miles long.

The student wants to emphasize the distance covered by the Philadelphia and Lancaster Turnpike.

**Question**: Which choice most effectively uses relevant information from the notes to accomplish this goal?

**Choices**:
- A. The sixty-two-mile-long Philadelphia and Lancaster Turnpike connected the Pennsylvania cities of Philadelphia and Lancaster.
- B. The Philadelphia and Lancaster Turnpike was the first private turnpike in the United States.
- C. The Philadelphia and Lancaster Turnpike, which connected two Pennsylvania cities, was built between 1792 and 1794.
- D. A historic Pennsylvania road, the Philadelphia and Lancaster Turnpike was completed in 1794.

**정답**: A

**구조 분석**:
- 목적: "distance covered" 강조 → 62마일이 핵심 정보
- 정답 A: "sixty-two-mile-long"을 형용사로 앞에 배치하여 거리를 문장의 중심에 놓음
- 오답 B: 미국 최초 사설 도로라는 "의의"를 강조 → 목적 불일치 (Partial Match)
- 오답 C: 건설 연도를 강조 → 거리 언급 없음 (Partial Match — 핵심 정보 누락)
- 오답 D: 역사적 중요성 강조 → 거리 언급 없음 (Partial Match)

**Easy인 이유**: 목적("distance")이 단일하고 명시적, 노트에서 해당 정보("sixty-two miles")가 하나뿐이라 선택이 명확하다.

---

### 예시 2 — Medium (ID: b46e0c8a)

**Synthesis Task**: Present study to familiar audience (청중 고려)
**Rhetorical Purpose**: Inform
**Passage Topic**: Science

**노트 (원문)**

While researching a topic, a student has taken the following notes:

Organisms release cellular material into their environment by shedding substances such as hair or skin.

The DNA in these substances is known as environmental DNA, or eDNA.

Researchers collect and analyze eDNA to detect the presence of species that are difficult to observe.

Geneticist Sara Oyler-McCance's research team analyzed eDNA in water samples from the Florida Everglades to detect invasive constrictor snake species in the area.

The study determined a 91% probability of detecting Burmese python eDNA in a given location.

The student wants to present the study to an audience already familiar with environmental DNA.

**Question**: Which choice most effectively uses relevant information from the notes to accomplish this goal?

**Choices**:
- A. Sara Oyler-McCance's researchers analyzed eDNA in water samples from the Florida Everglades for evidence of invasive constrictor snakes, which are difficult to observe.
- B. An analysis of eDNA can detect the presence of invasive species that are difficult to observe, such as constrictor snakes.
- C. Researchers found Burmese python eDNA, or environmental DNA, in water samples; eDNA is the DNA in released cellular materials, such as shed skin cells.
- D. Sara Oyler-McCance's researchers analyzed environmental DNA (eDNA)—that is, DNA from cellular materials released by organisms—in water samples from the Florida Everglades.

**정답**: A

**구조 분석**:
- 목적: eDNA를 이미 아는 청중에게 이 연구를 소개
- 핵심 조건 1: 연구 내용을 구체적으로 제시 (Oyler-McCance의 연구)
- 핵심 조건 2: eDNA의 정의를 설명하지 않아야 함 (청중이 이미 앎)
- 정답 A: 연구 내용을 구체적으로 제시하면서 eDNA 정의 설명 없음
- 오답 B: 특정 연구가 아닌 일반론만 진술 → "present the study" 미충족 (Partial Match)
- 오답 C: "or environmental DNA"로 eDNA를 정의 → 이미 아는 청중에게 불필요 (Partial Match — 청중 불일치)
- 오답 D: "that is, DNA from cellular materials..."로 상세 정의 제공 → 청중 수준 오판 (Partial Match)

**Medium인 이유**: 목적이 "이미 아는 청중에게"라는 추가 조건을 포함하여, 정보 선택뿐 아니라 문체와 청중 수준까지 고려해야 한다.

---

### 예시 3 — Hard (ID: afec1a70)

**Synthesis Task**: Present the primary aim of the research study (연구 주요 목적 제시)
**Rhetorical Purpose**: Inform
**Passage Topic**: Science (조류 둥지 역학)

**노트 (원문)**

While researching a topic, a student has taken the following notes:

As engineered structures, many bird nests are uniquely flexible yet cohesive.

A research team led by Yashraj Bhosale wanted to better understand the mechanics behind these structural properties.

Bhosale's team used laboratory models that simulated the arrangement of flexible sticks into nest-like structures.

The researchers analyzed the points where sticks touched one another.

When pressure was applied to the model nests, the number of contact points between the sticks increased, making the structures stiffer.

The student wants to present the primary aim of the research study.

**Question**: Which choice most effectively uses relevant information from the notes to accomplish this goal?

**Choices**:
- A. Bhosale's team wanted to better understand the mechanics behind bird nests' uniquely flexible yet cohesive structural properties. The researchers used laboratory models that simulated the arrangement of flexible sticks and analyzed the points where sticks touched one another.
- B. After analyzing the points where sticks touched, the researchers found that the structures became stiffer when pressure was applied.
- C. As analyzed by Bhosale's team, bird nests are uniquely flexible yet cohesive engineered structures.
- D. Bhosale's team used laboratory models and analyzed contact points to show that increasing pressure increases stiffness.

**정답**: A

**구조 분석**:
- 목적: "primary aim" 제시 → 연구가 "왜" 수행되었는가
- 핵심 정보: "wanted to better understand the mechanics behind these structural properties" (연구 목적)
- 정답 A: 목적을 첫 문장에 명시 + 방법론으로 이어지는 구조 → "primary aim"을 맥락 속에 제시
- 오답 B: 결과("structures became stiffer")를 제시 → "왜 했는가"가 아닌 "무엇을 발견했는가" (Partial Match — 목적 불일치)
- 오답 C: 일반적 특성("flexible yet cohesive")을 기술 → 연구 목적이 아닌 연구 배경만 제시 (Partial Match)
- 오답 D: 연구 결과를 중심으로 기술 → 목적이 아닌 발견에 초점 (Partial Match)

**Hard인 이유**: "primary aim"이라는 목적 동사가 미묘하다. "연구 결과"와 "연구 목적"을 혼동하기 쉬우며, 정답이 목적 + 방법론을 함께 담고 있어 "왜 목적만 말하지 않는가"라는 혼란을 야기한다.

---

## 5. RS 특수 전략: "목적 우선, 완전성 검증" 2단계 접근

### 단계 1: 목적(Goal) 분석 — 선택지보다 먼저
1. "The student wants to [목적]" 문장을 먼저 읽는다
2. 목적 동사를 밑줄: **emphasize** / **introduce** / **present** / **support** / **describe** / **contrast**
3. 목적 동사에 따라 선택지에서 기대할 정보의 종류를 미리 결정

| 목적 동사 | 요구되는 선택지 특성 |
|---------|-----------------|
| emphasize [X] | X를 문장의 핵심 위치(앞 또는 강조 구조)에 배치 |
| introduce [개념] | 개념의 정의 또는 맥락 제시 (청중이 모른다고 가정) |
| present the study | 연구의 주체, 내용, 맥락을 구체적으로 기술 |
| support a claim | 주장과 그것을 뒷받침하는 증거/사례 함께 제시 |
| describe data | 수치나 측정 결과를 중심으로 기술 |
| present primary aim | "왜 연구했는가"를 중심에 두어야 함 |

### 단계 2: 완전성(Completeness) 검증 — Partial Match 방지
정답 후보를 찾은 뒤 다음을 확인한다:
- 목적 달성에 필요한 핵심 정보가 모두 포함되어 있는가?
- 목적과 무관한 정보가 포함되어 선택지를 희석시키지 않는가?
- 청중 조건이 있다면 (예: "already familiar with"), 그 조건을 충족하는가?
- 노트에 없는 정보가 포함되어 있지 않은가?

### RS 함정 유형별 대응
| 함정 | 식별법 | 대응 |
|------|--------|------|
| 정보는 있지만 목적 불일치 | 선택지 내용이 노트에는 있으나 목적 문장의 동사와 안 맞음 | 목적 동사 재확인 |
| 핵심 정보 누락 | 선택지가 부분 정보만 담음 | 목적 달성에 필요한 모든 정보가 있는지 체크 |
| 청중 수준 오판 | eDNA 정의 재설명처럼 이미 아는 내용을 설명 | 청중 조건 문장을 먼저 파악 |
| 결과 vs 목적 혼동 | "연구가 밝힌 것"을 "연구의 목적"으로 오해 | "왜 했는가" vs "무엇을 발견했는가" 구별 |

---

## 6. 버전 관리

| 버전 | 날짜 | 변경사항 |
|------|------|---------|
| 1.0 | 2026-05-11 | 초기 정의 (7개 sub-skill) |
| 2.0 | 2026-05-12 | DB 기반 통계 추가, CP 라벨링 없는 이유 설명, Partial Match 구조 분석, 실전 예시 3개, 2단계 전략 섹션 추가 |
