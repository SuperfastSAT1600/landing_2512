# Cross-Text Connections 세부 분류 분석

**기본 데이터**: 57문제 (Easy:15, Medium:21, Hard:21)
**데이터 출처**: `blog_database/sat_questions.db`

---

## 1. Cross-Text Connections 스킬의 특성

### 1.1 주요 오답 패턴

| 오답 유형 | 비율 | 의미 |
|---------|------|------|
| **Out Of Scope** | 49.7% | 두 텍스트 어디에도 근거 없는 선택지 |
| **Distortion** | 19.5% | 한 텍스트의 내용을 왜곡하거나 과도하게 해석 |
| **Contradiction** | 12.8% | 텍스트의 실제 입장과 정반대로 이해 |
| **Overgeneralization** | 10.7% | 한 텍스트의 제한된 주장을 지나치게 일반화 |
| **Misattribution** | 4.7% | 한 텍스트의 주장을 다른 텍스트의 저자에게 귀속 |

**핵심 인사이트**: CTC 오답의 절반은 Out Of Scope이다. 학생들이 두 텍스트를 각각 읽고 이해한 뒤 "그럴듯하게 보이는" 선택지를 고르는 경향이 있으나, SAT는 두 텍스트 모두에 명시적 근거가 있는 선택지만 정답으로 인정한다. 또한 Misattribution은 CTC 특유의 오답 유형으로, 텍스트1 저자의 주장을 텍스트2 저자의 것으로 혼동하거나 그 역을 범하는 실수다.

### 1.2 CTC Arc 패턴 분석

CTC 문제는 두 텍스트 사이의 논리적 관계 유형(relationship_type)으로 분류된다.

| 관계 유형 | 전체 | Easy | Medium | Hard | 설명 |
|---------|------|------|--------|------|------|
| **Disagree** | 11(19.3%) | 2 | 7 | 2 | Text2가 Text1의 주장에 반박 또는 반대 |
| **Agree** | 9(15.8%) | 5 | 3 | 1 | 두 텍스트가 동일한 결론을 지지 |
| **Qualify** | 8(14.0%) | 5 | 1 | 2 | Text2가 Text1을 부분적으로 인정하되 조건 제시 |
| **Extend** | 7(12.3%) | 1 | 3 | 3 | Text2가 Text1을 보완하거나 확장 |
| **Dispute** | 2(3.5%) | 0 | 2 | 0 | Text2가 Text1의 방법론이나 전제를 직접 반박 |
| **Solution** | 1(1.8%) | 0 | 1 | 0 | Text2가 Text1이 제시한 문제의 해결책 제시 |

**DUAL_CLAIM/COUNTER_REBUTTAL이 많은 이유**: CTC 지문은 의도적으로 "입장이 다른 두 저자"를 배치한다. 이는 학생이 단순히 하나의 주장을 이해하는 것을 넘어, 두 관점 사이의 긴장 관계를 파악할 수 있는지 측정하기 위한 설계다. Disagree(반박) + Qualify(조건부 인정)가 전체 33%를 차지하는 것은 논증적 구조가 CTC의 핵심임을 보여준다.

**난이도와 관계 유형의 연관성**:
- Easy: Agree, Qualify 비율 높음 — 관계가 명시적으로 드러남
- Medium: Disagree 비율 압도적(7/21) — 두 입장의 대립 구조 파악 필요
- Hard: Extend, Qualify 비율 높음 — 표면적 동의 속의 미묘한 차이 식별 필요

### 1.3 CROSS_ 시퀀스 구조와 난이도 분포

CTC는 SAT RW 9개 스킬 중 유일하게 두 텍스트를 동시에 처리하는 스킬이다. passage_pattern은 P3~P8 범위로, 두 텍스트 합산 단락 수를 반영한다.

**CTC만의 처리 요구사항**:
1. Text 1을 독립적으로 이해하기 (저자 주장, 근거, 태도)
2. Text 2를 독립적으로 이해하기 (저자 주장, 근거, 태도)
3. 두 텍스트 사이의 관계 유형 파악하기
4. 질문이 요구하는 판단 수행하기 (동의, 반박, 반응, 관계)

**주요 지문 주제 분포**: Science(11), Social Science(6), History(5), Literature(5), Art(4)

---

## 2. Cross-Text Connections 세부 Sub-skill 분석

### 2.1 Dimension 1: 개별 텍스트 이해 (Single-Text Comprehension)

**CTC-1: Author Position in Text 1**
- Text1 저자의 핵심 주장과 태도를 정확히 파악
- "Fowler argues that..." 처럼 명시적 주장어 식별
- 난이도: Medium
- 함정: Text1의 근거를 Text1 저자의 주장으로 혼동

**CTC-2: Author Position in Text 2**
- Text2 저자의 핵심 주장과 태도를 정확히 파악
- Text1을 읽고 나서 Text2를 읽기 때문에 Text1의 영향을 받지 않도록 주의
- 난이도: Medium
- 함정: Text2가 Text1을 인용하거나 참조할 때 발화자 혼동

### 2.2 Dimension 2: 텍스트 간 관계 파악 (Inter-Text Relationship)

**CTC-3: Agreement/Alignment**
- 두 저자가 동일한 결론 또는 판단을 공유하는가
- 질문 신호어: "both agree", "would most likely agree"
- 핵심 전략: 두 텍스트에서 각각 독립적으로 지지되는 선택지를 찾는다
- 난이도: Medium
- 함정: 한 텍스트에만 근거가 있는 선택지 (→ Misattribution 오답)

**CTC-4: Disagreement/Contrast**
- 두 저자의 입장이 어떻게 대립하는지 정확히 파악
- 질문 신호어: "how would [Text2 author] respond to", "disagree about"
- 핵심 전략: Text1의 핵심 주장에 대해 Text2가 무엇을 반박하는지 특정
- 난이도: Medium-Hard
- 함정: 전체 방향만 파악하고 반박의 구체적 대상을 틀리게 특정 (→ Distortion)

**CTC-5: Complementary Relationship**
- 한 텍스트가 다른 텍스트를 보완, 확장, 맥락화하는 관계
- 예: Text1은 현상 기술, Text2는 메커니즘 설명
- 난이도: Medium-Hard
- 함정: 두 텍스트가 독립적이라고 판단하고 관계를 과소평가

**CTC-6: Evidence/Support Relationship**
- Text2가 Text1의 주장에 대한 근거, 사례, 반례를 제공하는 관계
- "Extend" 또는 "Qualify" 관계 유형에서 빈번
- 난이도: Medium-Hard
- 함정: Text2의 증거가 Text1을 지지하는지 반박하는지 방향 혼동

### 2.3 Dimension 3: 복합 판단 (Nuanced Cross-Text Judgment)

**CTC-7: Nuanced Relationship**
- 두 텍스트 사이의 미묘하고 복합적인 관계 파악
- 예: "부분적으로 동의하지만 방법론에서 이견", "같은 사실을 다르게 해석"
- 질문 신호어: "how would [Author] most likely respond", "what would both agree" (단, 선택지가 미묘함)
- 난이도: Hard
- 함정: 단순화된 동의/반박으로 관계를 환원 (→ Overgeneralization)

---

## 3. Sub-skill × 오답 유형 연결표

| Sub-skill | 가장 흔한 오답 | 두 번째 오답 | 핵심 오류 메커니즘 |
|-----------|-------------|------------|-----------------|
| CTC-1 (Text1 입장) | Out Of Scope | Misattribution | Text1 범위를 벗어난 추론 |
| CTC-2 (Text2 입장) | Misattribution | Distortion | Text1 관점에서 Text2를 오독 |
| CTC-3 (Agreement) | Misattribution | Out Of Scope | 한 텍스트에만 근거한 선택지 선택 |
| CTC-4 (Disagreement) | Distortion | Contradiction | 반박의 대상과 방향을 잘못 특정 |
| CTC-5 (Complementary) | Out Of Scope | Overgeneralization | 관계의 방향성과 범위 오판 |
| CTC-6 (Evidence) | Distortion | Out Of Scope | 지지/반박 방향 혼동 |
| CTC-7 (Nuanced) | Overgeneralization | Distortion | 복잡한 관계를 단순화 |

**실전 판단 원칙**: 선택지를 평가할 때 반드시 "이 선택지는 Text1에서 지지되는가? Text2에서도 지지되는가?"를 각각 확인한다. 하나라도 지지되지 않으면 오답이다.

---

## 4. 실전 예시 3개

### 예시 1 — Easy (ID: 02fd3da7)

**Relationship Type**: Qualify (Text2가 Text1의 주장에 조건 제시)
**Passage Topic**: Social Science (의무 투표제)

**Text 1**

Public policy researcher Anthony Fowler studied the history of elections in Australia, a country that requires citizens to vote. Fowler argues that requiring citizens to vote leads to a significant increase in voters who would otherwise not have the time or motivation to vote. Thus, election results in countries that require citizens to vote better reflect the preferences of the country as a whole.

**Text 2**

Governments in democratic countries function better when more people vote. However, forcing people to vote may have negative consequences. Shane P. Singh and Jason Roy studied what happens when a country requires its citizens to vote. They found that when people feel forced to vote, they tend to spend less time looking for information about their choices when voting. As a result, votes from these voters may not reflect their actual preferences.

**Question**: Based on the texts, how would Singh and Roy (Text 2) most likely respond to the research discussed in Text 1?

**Choices**:
- A. Only countries of a certain population size should implement mandatory voting.
- B. People who are forced to vote are likely to become politically engaged in other ways.
- C. Requiring people to vote does not necessarily lead to election outcomes that better represent the preferences of the country as a whole.
- D. Countries that require voting must also make the process of voting easier for their citizens.

**정답**: C

**구조 분석**:
- Text1 핵심 주장: 의무 투표 → 선거 결과가 국가 전체 의향을 더 잘 반영
- Text2 핵심 주장: 의무 투표로 인해 유권자가 덜 informed 상태로 투표 → 실제 의향이 반영 안 될 수 있음
- 관계: Text2가 Text1의 결론("better reflect preferences")에 직접 반박
- 정답 C는 Text2의 핵심 반론을 정확히 요약
- 오답 A, D: Out Of Scope — 두 텍스트 어디에도 근거 없음
- 오답 B: Distortion — Text2는 정치 참여 확대가 아닌 투표 품질 저하를 논함

**Easy인 이유**: Disagree 관계가 명시적("However", "As a result...may not")이어서 관계 파악이 어렵지 않음.

---

### 예시 2 — Medium (ID: 7bf79a90)

**Relationship Type**: Qualify (Text2가 Text1의 발견을 인정하되 해석을 조건화)
**Passage Topic**: Science (남극 미생물)

**Text 1**

Microbes are tiny organisms in the soil, water, and air all around us. They thrive even in very harsh conditions. That's why Noah Fierer and colleagues were surprised when soil samples they collected from an extremely cold, dry area in Antarctica didn't seem to contain any life. The finding doesn't prove that there are no microbes in that area, but the team says it does suggest that the environment severely restricts microbes' survival.

**Text 2**

Microbes are found in virtually every environment on Earth. So it's unlikely they would be completely absent from Fierer's team's study site, no matter how extreme the environment is. There were probably so few organisms in the samples that current technology couldn't detect them. But since a spoonful of typical soil elsewhere might contain billions of microbes, the presence of so few in the Antarctic soil samples would show how challenging the conditions are.

**Question**: Based on the texts, Fierer's team and the author of Text 2 would most likely agree with which statement about microbes?

**Choices**:
- A. Most microbes are better able to survive in environments with extremely dry conditions than in harsh temperatures.
- B. Microbes are likely difficult to detect in the soil at the Antarctic study site because they tend to be smaller than microbes found in typical soil elsewhere.
- C. A much higher number of microbes would probably be found if another sample of soil were taken from the Antarctic study site.
- D. Most microbes are probably unable to withstand the soil conditions at the Antarctic study site.

**정답**: D

**구조 분석**:
- Text1 주장: 남극 환경이 미생물 생존을 "severely restricts"
- Text2 주장: 미생물이 완전히 부재하진 않겠지만 "conditions are challenging"
- 공통점: 두 텍스트 모두 남극 환경이 미생물에게 극도로 불리하다는 결론 공유
- 정답 D: 두 텍스트 모두 지지 — Text1("severely restricts"), Text2("challenging conditions")
- 오답 A: Out Of Scope — 어떤 텍스트도 건조함 vs 온도에 대한 비교 없음
- 오답 B: Distortion — "크기 차이"는 어느 텍스트에도 없음
- 오답 C: Misattribution — Text2는 "기술적 탐지 한계"를 말하지, 더 많이 발견될 것이라고 주장하지 않음

**Medium인 이유**: 두 텍스트가 표면상 약간 다른 설명을 하지만("없다" vs "탐지 못했다") 공통 결론을 추출해야 하므로 단순 Agree보다 복잡한 판단 필요.

---

### 예시 3 — Hard (ID: 97e5bf55)

**Relationship Type**: Agree (두 텍스트 모두 Fletcher의 구별 가능한 문체에 동의)
**Passage Topic**: Literature (희곡 공동 저자 논쟁)

**Text 1**

In 1916, H. Dugdale Sykes disputed claims that The Two Noble Kinsmen was coauthored by William Shakespeare and John Fletcher. Sykes felt Fletcher's contributions to the play were obvious—Fletcher had a distinct style in his other plays, so much so that lines with that style were considered sufficient evidence of Fletcher's authorship. But for the lines not deemed to be by Fletcher, Sykes felt that their depiction of women indicated that their author was not Shakespeare but Philip Massinger.

**Text 2**

Scholars have accepted The Two Noble Kinsmen as coauthored by Shakespeare since the 1970s: it appears in all major one-volume editions of Shakespeare's complete works. Though scholars disagree about who wrote what exactly, it is generally held that on the basis of style, Shakespeare wrote all of the first act and most of the last, while John Fletcher authored most of the three middle acts.

**Question**: Based on the texts, both Sykes in Text 1 and the scholars in Text 2 would most likely agree with which statement?

**Choices**:
- A. John Fletcher's writing has a unique, readily identifiable style.
- B. The women characters in John Fletcher's plays are similar to the women characters in Philip Massinger's plays.
- C. The Two Noble Kinsmen belongs in one-volume compilations of Shakespeare's complete plays.
- D. Philip Massinger's style in the first and last acts of The Two Noble Kinsmen is an homage to Shakespeare's style.

**정답**: A

**구조 분석**:
- Text1 Sykes 주장: Fletcher는 "distinct style"이 있어 문체만으로 그의 기여를 식별 가능
- Text2 학자들 주장: "on the basis of style" Fletcher가 중간 3막을 썼다는 것이 통설
- 공통점: 두 텍스트 모두 Fletcher의 문체가 식별 가능하다는 전제에서 논의를 전개
- 오답 B: Misattribution — Text1은 여성 묘사를 논하지만 Fletcher가 아닌 Massinger와 연관. Text2는 Massinger 언급 없음
- 오답 C: Contradiction — Sykes는 Shakespeare 공동 저작을 "disputed"했으므로 전집 수록에 반대 입장
- 오답 D: Overgeneralization — Text1은 Massinger의 여성 묘사를 언급하나 Shakespeare와의 오마주 관계는 없음. Text2는 Massinger 자체를 언급 안 함

**Hard인 이유**: 두 텍스트가 표면상 정반대 결론(Sykes는 Shakespeare 아님 주장 vs 학자들은 Shakespeare 공동 저자로 수용)을 내리기 때문에 단순 Agree처럼 보이지 않는다. "두 텍스트가 모두 동의하는 것"을 찾으려면 주장 자체가 아닌 전제 수준에서 공통점을 찾아야 한다.

---

## 5. 문제 유형별 접근 전략

### 전략 1: Agreement 유형 ("both agree" / "both would most likely agree")
1. Text1의 핵심 주장 1~2개를 메모
2. Text2의 핵심 주장 1~2개를 메모
3. 선택지마다 "Text1에서 지지되는가?" + "Text2에서도 지지되는가?" 각각 확인
4. 둘 다 Yes인 선택지가 정답 — 하나라도 No면 오답

### 전략 2: Response/Disagreement 유형 ("how would [Author2] respond to [Text1]")
1. Text1의 정확한 핵심 주장 파악 (무엇을 주장하는가)
2. Text2가 그 주장의 어느 부분에 어떻게 반응하는지 파악
3. 선택지가 Text2 저자의 실제 논거와 일치하는지 확인
4. Text2에 없는 내용이 선택지에 있으면 Out Of Scope 오답

### 전략 3: Nuanced/Hard 유형
1. 두 텍스트의 전체 논리 구조를 먼저 파악
2. 표면적 결론보다 저자들이 공유하는 전제나 방법론의 공통점을 찾는다
3. "저자가 직접 말한 것"과 "추론할 수 있는 것"을 구별
4. Sykes vs 학자들 사례처럼 결론이 달라도 공유하는 전제가 있을 수 있음

### Misattribution 오답 방지 체크리스트
- 이 선택지의 근거가 Text1에 있는가, Text2에 있는가?
- "both would agree" 문제에서는 각 텍스트에서 독립적으로 지지되어야 함
- 한 저자의 주장을 다른 저자에게 귀속하지 않는가?

---

## 6. 버전 관리

| 버전 | 날짜 | 변경사항 |
|------|------|---------|
| 1.0 | 2026-05-11 | 초기 정의 (7개 sub-skill) |
| 2.0 | 2026-05-12 | DB 기반 통계 추가, Arc 패턴 분석, 실전 예시 3개, 전략 섹션 추가 |
