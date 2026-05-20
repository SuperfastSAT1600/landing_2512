# Form, Structure, and Sense 세부 분류 분석

**기본 데이터**: 193개 문제 분석
**데이터 출처**: `blog_database/sat_questions.db`

---

## 1. Form, Structure, and Sense 스킬의 특성

### 1.1 주요 오답 패턴

| 오답 유형 | 비율 | 의미 |
|---------|------|------|
| **Misattribution** | 55.5% | 행동의 주체/주인을 잘못 파악 (가장 치명적) |
| **Partial Match** | 20.5% | 문법적으로 부분적으로만 맞는 선택 |
| **Contradiction** | 11.9% | 지문의 의미와 모순되는 형태 선택 |
| **Degree Error** | 6.9% | 수 일치·시제의 정도를 잘못 판단 |
| **Distortion** | 4.3% | 문장 구조를 왜곡하여 의미 변형 |

**핵심 인사이트**: FSS의 압도적 함정은 **Misattribution** — "Despite being cheap..." 같은 분사구문(dangling modifier)에서 수식어가 수식해야 할 진짜 주어(주체)를 혼동하는 오류. "누가" 저렴한 것인지, "누가" 행동하는지를 정확히 연결하는 것이 핵심이다.

---

### 1.2 Arc 시퀀스 분석

**FSS는 문법 스킬이므로 지문 구조의 영향을 최소화 받는 특이 스킬이다.**

| Arc 패턴 | 빈도 | 비율 | 의미 |
|---------|------|------|------|
| **PURE_INFO** | 119 | 61.7% | 정보만 나열하는 단순 지문 (문법 독립적 테스트) |
| **CLAIM_EVIDENCE** | 47 | 24.4% | 주장+증거 구조 (주어-동사 의미 관계 복잡) |
| **INFO_TO_CONCL** | 23 | 11.9% | 정보→결론 구조 (시제 일관성 테스트) |
| **DUAL_CLAIM** | 3 | 1.6% | 두 주장 대립 |
| **COUNTER_REBUTTAL** | 1 | 0.5% | 반박 구조 (dangling modifier 집중) |

**Top 시퀀스:**

| 시퀀스 | 빈도 | 특징 |
|--------|------|------|
| `EXP_I_bg-I` | 50 | 배경→정보 흐름, 수 일치 Easy 집중 |
| `EXP_I` | 31 | 정보만 제시, 핵심 문법 테스트 |
| `EXP_I-I` | 15 | 정보 연속, 시제 일관성 |
| `EXP_I_bg-I-CL` | 12 | 배경→정보→결론, 수식어 배치 |
| `EXP_I_bg` | 9 | 배경 단독, 주어 파악 |

**구조적 독립성**: PURE_INFO가 61.7%를 차지한다는 것은 FSS가 복잡한 논증 구조 없이 **문법 자체만을 테스트**하는 스킬임을 보여준다. 지문의 Arc를 이해하기보다 문장 내 문법 관계를 파악하는 것이 핵심이다.

---

### 1.3 난이도 분포

| 난이도 | 빈도 | 비율 | 주요 테스트 포인트 |
|--------|------|------|----------------|
| **Easy** | 89 | 46.1% | 주어-동사 수 일치 (FSS-1), 기본 시제 |
| **Medium** | 48 | 24.9% | 수식어 배치, 대명사 지시, 완료-진행 구분 |
| **Hard** | 56 | 29.0% | Dangling modifier, 복잡한 주체 파악 |

Easy가 절반 가까이를 차지하는 것은 FSS-1(수 일치)이 SAT의 기본 문법 진입점 역할을 하기 때문이다. Hard는 dangling modifier와 복잡한 주어 귀속 문제로 이루어진다.

---

## 2. FSS 세부 Sub-skill 분석

### 2.1 Dimension 1: 동사와 주어의 형태 일치

**FSS-1: Subject-Verb Number Agreement (수 일치)**
- 주어가 단수이면 동사도 단수(-s), 복수이면 복수
- 핵심 함정: 주어와 동사 사이에 삽입구/수식어가 끼어 있는 경우
  - "The radiation **that occurs during** the decay... **is** known"에서 관계절이 주어 "radiation"과 동사 "is" 사이를 갈라놓음
- 난이도: **Easy-Medium**
- 주요 오답: Degree Error (단/복수 혼동), Partial Match (관계절 안의 동사로 혼동)

**FSS-2: Subject-Verb Semantic Logic (의미 관계)**
- 주어와 동사가 의미적으로 맞는 관계인가
- 능동(active) vs 수동(passive) 구분
  - "The problem **is solved**" (수동) vs "They **solve** the problem" (능동)
- 난이도: **Medium**
- 주요 오답: Misattribution (능동/수동을 잘못 선택해 주체 혼동)

**FSS-3: Subject Attribution (진짜 주체 파악)**
- 문장에서 실제 행동을 하는 주어/주체가 누구인가
- 수동태, 분사구문, 접속사 뒤 절에서 주체 귀속을 정확히 판단
- 난이도: **Hard** — Misattribution(55.5%)의 핵심 발생 지점
- 주요 오답: Misattribution (행위자와 수신자 혼동)

---

### 2.2 Dimension 2: 시제와 상(Aspect)

**FSS-4: Tense Consistency (시제 일관성)**
- 지문의 시간 흐름에 맞게 시제가 일관되는가
- 과거 서술 중 갑자기 현재 시제가 나타나는 오류 방지
- 난이도: **Medium**
- 주요 오답: Partial Match (지엽적 문장만 보고 시제 선택)

**FSS-5: Aspect — Perfect vs Progressive (완료·진행 구분)**
- 완료(have/has done): 과거에 시작해 현재까지 영향
- 진행(am/is/are doing): 지금 이 순간 진행 중
- 습관(do/does): 반복되는 행동/상태
- 문맥의 시간 관계를 정확히 읽어야 함
- 난이도: **Medium-Hard**
- 주요 오답: Distortion (시간 관계 왜곡)

---

### 2.3 Dimension 3: 수식어와 지시어

**FSS-6: Modifier-Noun Placement (수식어 배치)**
- 수식어(분사구, 형용사절, 전치사구)가 수식하려는 명사 바로 앞/뒤에 위치해야 함
- **Dangling modifier**: 수식어가 실제 수식 대상과 멀리 떨어지거나 잘못된 명사에 붙는 오류
  - "Despite being cheap... **two problems** are associated..." → 문제들이 저렴한 것이 아니라 plastics가 저렴한 것
- 난이도: **Medium-Hard**
- 주요 오답: Misattribution (수식어가 가리키는 대상 혼동)

**FSS-7: Pronoun Reference (대명사 지시)**
- 대명사(he, she, it, they, this)가 모호하지 않고 명확한 선행사(antecedent)를 가리키는가
- 선행사가 복수일 때 대명사도 복수, 단수일 때 단수
- 난이도: **Medium**
- 주요 오답: Misattribution (대명사가 잘못된 선행사를 가리킴)

---

## 3. Sub-skill × 오답 유형 연결표

| Sub-skill | 핵심 개념 | Misattribution | Partial Match | Contradiction | Degree Error | Distortion |
|-----------|---------|:-----------:|:-----------:|:-----------:|:----------:|:--------:|
| FSS-1: 수 일치 | 단수/복수 일치 | | O | | O(주) | |
| FSS-2: 의미 관계 | 능동/수동 선택 | O(주) | O | O | | |
| FSS-3: 주체 파악 | 행위자 귀속 | O(주) | | O | | |
| FSS-4: 시제 일관성 | 시간 흐름 | | O(주) | O | O | |
| FSS-5: 완료/진행 | 시간 상(Aspect) | | | | | O(주) |
| FSS-6: 수식어 배치 | Dangling modifier | O(주) | | | | O |
| FSS-7: 대명사 지시 | 선행사 연결 | O(주) | O | | | |

**(주): 해당 sub-skill의 주요 오답 유형**

**Misattribution 집중 지점**: FSS-2, FSS-3, FSS-6, FSS-7 — 모두 "어떤 명사/대명사가 어떤 행위나 속성을 소유하는가"를 묻는 sub-skill들이다.

---

## 4. 실전 예시

### Easy 예시 — FSS-1: Subject-Verb Number Agreement

**ID**: `e38b3e4f` | **난이도**: Easy | **Arc**: PURE_INFO / EXP_I

**지문:**
> The radiation that ______ during the decay of radioactive atomic nuclei is known as gamma radiation.

**선택지:**
- A) occurs
- B) have occurred
- C) occur
- D) are occurring

**정답**: A

**구조 분석:**
- 주어: "The radiation" (단수)
- 함정: 관계절 "that _____ during the decay of radioactive atomic nuclei"가 주어와 동사 사이에 삽입됨
- 관계절의 주어도 "that" → radiation을 대신하는 단수 관계대명사
- 따라서 동사는 단수형 "occurs"가 맞음

**오답 분석:**
- B) "have occurred": 복수 동사, 관계절 주어를 복수로 혼동 (Degree Error)
- C) "occur": 복수 동사 기본형 (Degree Error)
- D) "are occurring": 복수 진행형 (Degree Error + Distortion — 반복 현상을 진행으로 혼동)

**학습 포인트**: 삽입된 관계절을 괄호로 묶어 제거하면 "The radiation _____ is known"이 드러남. 핵심 주어-동사 관계를 먼저 파악하라.

---

### Medium 예시 — FSS-6: Modifier-Noun Placement (Dangling modifier)

**ID**: `6f08641e` | **난이도**: Medium | **Arc**: CLAIM_EVIDENCE / ARG_I_bg-C_au-CL_au

**지문:**
> On April 5, 1977, Kitty Cone and 150 other disability rights activists entered a San Francisco federal building. After pleading for years—to no effect—for the passage of key antidiscrimination legislation, ______ until their demands were addressed. Finally, on April 28, the legislation was signed.

**선택지:**
- A) pressure on lawmakers increased when the activists staged a sit-in protest
- B) a sit-in protest staged by the activists increased pressure on lawmakers
- C) lawmakers came under increased pressure when the activists staged a sit-in protest
- D) the activists increased pressure on lawmakers by staging a sit-in protest

**정답**: D

**구조 분석:**
- 분사구문 "After pleading for years... for the passage of key antidiscrimination legislation"
- 이 수식어가 가리키는 주체: 법안 통과를 위해 수년간 탄원해온 사람들 = **the activists**
- 빈칸 첫 명사가 수식어의 주체와 일치해야 함

**오답 분석 (모두 dangling modifier):**
- A) "pressure on lawmakers" → 압력이 탄원한 것이 됨 (Misattribution)
- B) "a sit-in protest" → 시위가 탄원한 것이 됨 (Misattribution)
- C) "lawmakers" → 의원들이 탄원한 것이 됨 (Misattribution — 문맥상 가능해 보이나 지문은 activists가 탄원했음을 명시)

**학습 포인트**: "After doing X, **[누가]** Y를 했다"에서 빈칸의 첫 명사가 바로 X의 주체여야 한다. 선택지 A/B/C는 모두 첫 명사가 탄원의 주체가 아님.

---

### Hard 예시 — FSS-3 + FSS-6: Dangling Modifier × Subject Attribution

**ID**: `37e5c794` | **난이도**: Hard | **Arc**: COUNTER_REBUTTAL / ARG_C_ct

**지문:**
> Despite being cheap, versatile, and easy to produce, ______ they are made from nonrenewable petroleum, and most do not biodegrade in landfills.

**선택지:**
- A) there are two problems associated with commercial plastics:
- B) two problems are associated with commercial plastics:
- C) commercial plastics' two associated problems are that
- D) commercial plastics have two associated problems:

**정답**: D

**구조 분석:**
- 분사구문 "Despite being cheap, versatile, and easy to produce"
- 이 수식어의 주체: **commercial plastics** (저렴하고 다용도인 것은 플라스틱)
- 빈칸 첫 명사 = 수식어의 주체 = "commercial plastics"

**오답 분석:**
- A) "there" → 문법적으로 허수의 주어, 수식어 주체 연결 불가 (Misattribution)
- B) "two problems" → 문제들이 저렴하다는 의미가 됨 (Misattribution)
- C) "commercial plastics' two associated problems" → 문제들이 저렴한 것이 됨 (Misattribution — 소유격 사용으로 교묘히 위장)

**핵심 함정 분석**: C는 "commercial plastics"를 포함하고 있어 정답처럼 보이지만, 소유격 뒤의 명사 "two associated problems"가 수식어의 논리적 주어 자리에 오게 된다. SAT Hard 수준에서 자주 등장하는 위장형 dangling modifier다.

**학습 포인트**: 소유격('s) 구조는 dangling modifier를 교정하지 못한다. 수식어 바로 뒤에 오는 명사가 수식어의 주체여야 하며, "X's Y"에서 논리적 주어는 X가 아닌 Y이다.

---

## 5. Misattribution 심층 분석 (55.5%)

FSS에서 Misattribution이 절반 이상을 차지하는 이유는 SAT가 의도적으로 "주체 혼동"을 유발하는 문장 구조를 설계하기 때문이다.

**Misattribution 발생 3대 구조:**

| 구조 | 설명 | 예시 |
|------|------|------|
| **Dangling modifier** | 분사구/전치사구가 수식해야 할 명사와 단절 | "Despite being cheap, **two problems**..." |
| **수동태 + 행위자 혼동** | 수동태 문장에서 행위자(by ~)와 주어를 혼동 | "The treaty was signed by the general" → 주어는 treaty |
| **대명사 선행사 모호** | 복수 명사가 여럿 있을 때 they/it이 누구를 가리키는지 불분명 | "When the scientists met the journalists, **they** were excited" |

**해결 전략:**
1. 분사구문 → "이 행동을 한 주체가 누구인가?" 먼저 확인
2. 수동태 → 문장의 주어(주어 자리 명사)와 행위자(by ~)를 구분
3. 대명사 → 앞에 나온 명사 중 가장 논리적으로 맞는 것을 선행사로 지정

---

## 6. 스킬 간 연결성

| 스킬 | 연결점 |
|------|--------|
| **Boundaries** | 문장 경계에서의 주어-동사 일치 — 두 독립절로 분리 시 주어 재파악 필요 |
| **Inferences** | 수동태 구조에서 "누가 행동했는가"를 추론하는 INF-3(Author Intent)와 연결 |
| **Command of Evidence** | 증거 문장의 주체가 누구인지(FSS-3)를 파악해야 정확한 증거 해석 가능 |

---

## 7. 버전 관리

| 버전 | 날짜 | 변경사항 |
|------|------|---------|
| 1.0 | 2026-05-11 | 초기 정의 (7개 sub-skill) |
| 2.0 | 2026-05-12 | Arc 분석, Misattribution 심층 분석, 실전 예시 3개 추가, 난이도 분포 확장 |
