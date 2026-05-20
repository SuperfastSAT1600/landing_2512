# Words in Context 세부 분류 분석

**기본 데이터**: 1,527개 문제 중 WIC 관련 분석
**데이터 출처**: `blog_database/sat_rw_reference.json`

---

## 1. Words in Context 스킬의 특성

### 1.1 주요 오답 패턴
| 오답 유형 | 비율 | 의미 |
|---------|------|------|
| **Distortion** | 43.6% | 단어의 의미를 왜곡하거나 부분적으로만 이해 |
| **Contradiction** | 34.1% | 맥락상 모순되는 의미의 단어 선택 |
| **Out Of Scope** | 16.5% | 단어가 없는 사전적 의미 선택 |

**핵심 인사이트**: WIC는 "사전적 정의"를 알아도 "맥락적 의미"를 못하면 틀림. Distortion이 가장 높은 이유는 학생들이 단어의 **일부 의미만** 선택하기 때문.

### 1.2 단어의 의미 변형 방식

**기본 원리**: 같은 단어가 문맥에서 다양한 의미로 쓰인다.
- **사전적 정의** (dictionary meaning) ≠ **문맥적 의미** (contextual meaning)
- 학생들의 오류: 사전적 정의를 고집하거나, 이와 유사한 선택지에 혹함

---

## 2. Words in Context 세부 sub-skill 분석

### 2.1 Dimension 1: 의미 변형의 "종류" (Meaning Transformation Type)

**1) Metaphorical/Figurative Usage (은유적 사용)**
- 단어가 상징적, 은유적 의미로 사용됨
- 예: "bridge the gap" (문자적: 다리를 건설, 실제: 차이를 줄이다)
- 특징: 원래 의미와 현재 의미의 **개념적 거리 큼**
- 선택지 함정: 너무 문자적인 선택지
- 난이도: Hard

**2) Semantic Narrowing (의미 좁혀짐)**
- 폭넓은 사전적 의미가 **특정 맥락에서만** 좁혀짐
- 예: "bank" (금융 vs 강둑) — 문맥에서 하나만 맞음
- 특징: 단어의 **여러 뜻 중 하나** 선택
- 선택지 함탈: 다른 뜻도 맞는 것처럼 보임
- 난이도: Medium-Hard

**3) Semantic Extension/Abstraction (의미 확장 또는 추상화)**
- 구체적 의미에서 **추상적 의미**로 확장
- 예: "hard work" (물리적 강도) → (정신적 노력)
- 특징: 기본 개념은 같지만, **적용 범위 확장**
- 선택지 함정: 구체적 의미만 고수
- 난이도: Medium

**4) Connotation Shift (뉘앙스 변화)**
- 기본 의미는 같지만, **감정/태도** 뉘앙스가 다름
- 예: "ambitious" (긍정: 의욕 있음) vs (부정: 지나친 야심)
- 특징: 같은 단어도 문맥에서 **긍정/부정이 반뒤짐**
- 선택지 함정: 반대 뉘앙스의 동의어
- 난이도: Medium-Hard

**5) Domain-Specific Reinterpretation (분야별 재해석)**
- 특정 분야에서만 **다른 의미**로 쓰임
- 예: "depression" (심리학: 우울증) vs (기상학: 저기압 지역)
- 특징: 문맥(지문의 주제)에서 **어느 분야인지 파악**해야 함
- 선택지 함정: 일반적 의미
- 난이도: Hard

**6) Contextual Idiomatic Usage (문맥적 관용표현)**
- 흔한 관용구나 숙어
- 예: "beat around the bush" (숲을 빙빙 돌다 → 주제를 피하다)
- 특징: 단어 하나하나보다는 **구조 전체**의 의미
- 선택지 함정: 문자적 해석
- 난이도: Medium

**7) Register/Style Shift (격식/문체 변화)**
- 같은 의미지만 **격식 수준**이 다름
- 예: "terminate" (공식) vs "end" (일반) vs "stop" (casual)
- 특징: 문맥의 **격식 수준**을 파악해야 함
- 선택지 함탈: 의미는 같지만 격식이 안 맞는 것
- 난이도: Medium

---

### 2.2 Dimension 2: 혼동 요소 (Distraction/Confusion Factor)

**가. 단어 형태 유사 (Word Form Similarity)**
- 철자, 음운, 어근이 비슷한 단어들
- 예: "affect" vs "effect", "principal" vs "principle"
- 학생 오류: 맥락을 무시하고 형태 비슷한 단어 선택
- 오답 유형: Contradiction (의미 완전히 다름)

**나. 의미 부분 일치 (Partial Semantic Match)**
- 선택지가 단어의 **일부 의미만** 맞음
- 예: "run" (달리다, 흘러가다, 운영하다...) 중 일부만 맞음
- 학생 오류: 모든 의미가 맞다고 착각
- 오답 유형: Distortion (부분적 의미 선택)

**다. 맥락 신호 부족 (Weak Context Clues)**
- 단어 주변에 명시적 단서가 적음
- 예: "It was interesting" (흥미로운? 이상한? 긍정? 부정?)
- 학생 오류: 문맥 전체를 읽지 않고 국소적으로만 판단
- 오답 유형: Out of Scope (지문 밖의 일반적 의미 선택)

**라. 동의어 함정 (Near-Synonym Trap)**
- 비슷한 의미의 단어들이 모두 선택지에 있음
- 예: "happy" "joyful" "cheerful" "delighted" 중 하나만 맞음
- 학생 오류: 모두 비슷하다고 생각하고 임의로 선택
- 오답 유형: Distortion (뉘앙스 무시)

**마. 대척 의미 함정 (Opposite Trap)**
- 정반대 의미의 단어도 선택지에 있음
- 예: "promote" (권장) vs "discourage" (낙담)
- 학생 오류: 문맥을 잘못 읽으면 정반대 선택
- 오답 유형: Contradiction (완전 모순)

---

### 2.3 Dimension 3: 맥락 제시 방식 (Context Presentation)

**1) Explicit Definition (명시적 정의)**
- 문맥에서 단어의 의미를 **직접 설명**
- 예: "The treaty was defunct, meaning it was no longer in effect"
- 난이도: Easy (거의 선택지를 고르기만 하면 됨)

**2) Example Context (예시를 통한 맥락)**
- 단어 사용 **예시**로 의미 암시
- 예: "He was pragmatic, deciding to compromise rather than win at all costs"
- 난이도: Medium (예시에서 의미 추론)

**3) Surrounding Logic (주변 논리를 통한 맥락)**
- 문장의 논리적 흐름에서 **유일하게 맞는 의미**
- 예: "Although he was critical of the proposal, his feedback was constructive"
- 난이도: Medium-Hard (대조 / 인과 관계 파악)

**4) Passage-Wide Tone (전체 지문의 톤)**
- 지문 전체의 **주제, 톤, 스타일**에서만 알 수 있는 의미
- 예: 과학 지문에서 "theory"는 "추측"이 아니라 "체계적 이론"
- 난이도: Hard (지문 구조 이해 필수)

---

## 3. Words in Context 세부 Sub-skill 정의 (최종)

| Sub-skill | 정의 | 변형 종류 | 혼동 요소 | 맥락 제시 | 난이도 |
|-----------|------|---------|---------|---------|--------|
| **WIC-1: Direct Definition** | 문맥에서 단어의 의미를 직접 설명 | Any | 명시적 | Explicit | Easy |
| **WIC-2: Narrowed Meaning** | 여러 뜻 중 맥락에 맞는 하나를 선택 | Narrowing | Word Form Similarity | Explicit/Example | Medium |
| **WIC-3: Figurative Intent** | 은유, 비유, 상징적 의미 파악 | Metaphorical | Literal vs Figurative | Example | Hard |
| **WIC-4: Connotation Nuance** | 단어의 감정/태도 뉘앙스 파악 | Connotation Shift | Near-Synonym | Surrounding Logic | Medium-Hard |
| **WIC-5: Domain-Specific** | 특정 분야에서만 쓰이는 의미 파악 | Domain-Specific | Field Knowledge | Passage-Wide Tone | Hard |
| **WIC-6: Contextual Register** | 문맥의 격식 수준에 맞는 단어 선택 | Register Shift | Style Mismatch | Surrounding Logic | Medium |
| **WIC-7: Logic-Based Inference** | 문장 논리에서 **유일하게 맞는** 의미 추론 | Extension/Narrowing | Semantic Partial Match | Surrounding Logic | Hard |

---

## 4. 각 Sub-skill별 예시 및 특성

### WIC-1: Direct Definition
**정의**: 문맥에서 단어의 정의를 **직접 제시**하는 경우
**특징**:
- "X means..." / "X, or..." / "that is..." 같은 신호어 있음
- 거의 문맥만 읽으면 답이 보임
- "왜 이 단어를 선택하는가"가 명확
**선택지 함정**: 관련 있지만 다른 의미
**난이도**: Easy-Medium
**예시**: "The treaty was defunct—in other words, **no longer in effect**"

### WIC-2: Narrowed Meaning
**정의**: 단어의 **여러 사전적 의미** 중 문맥에 맞는 하나만 고르기
**특징**:
- 단어가 다양한 의미를 가짐 (homonym, polysemy)
- 문맥에서 **유일하게 타당한** 의미만 선택
- 다른 의미들도 "맞는 것처럼 보이지만" 문맥 무시
**선택지 함정**: 다른 뜻도 그럴듯하게 보임
**난이도**: Medium
**예시**: "The bank approved the loan" (금융 기관), vs "The river bank was scenic" (강변)

### WIC-3: Figurative Intent
**정의**: 은유, 비유, 상징, 이중 의미의 **실제 의미** 파악
**특징**:
- 단어가 "표면적 의미"와 "실제 의미" 다름
- 문학적, 감정적 표현
- 문자적 해석하면 틀림
**선택지 함정**: 너무 문자적 의미
**난이도**: Hard
**예시**: "He was drowning in paperwork" (literally: water, actually: **overwhelmed**)

### WIC-4: Connotation Nuance
**정의**: 기본 의미는 같지만, **감정/평가 톤**을 파악
**특징**:
- 같은 행동을 긍정/부정으로 표현
- "decisive" (긍정) vs "stubborn" (부정) — 둘 다 "고집스럽다"는 뜻
- 문맥의 톤(칭찬/비판)을 읽어야 함
**선택지 함정**: 의미는 비슷하지만 뉘앙스 반대
**난이도**: Medium-Hard
**예시**: "She was ambitious" (긍정 톤) vs (부정 톤) — 선택지가 "aspiring" vs "overzealous"

### WIC-5: Domain-Specific
**정의**: 특정 분야(과학, 문학, 경제)에서만 **다른 의미**로 쓰임
**특징**:
- 일반 의미 vs 학술 의미
- 지문의 **분야 이해** 필수
- 배경지식 없으면 어려움
**선택지 함정**: 일반적 의미
**난이도**: Hard
**예시**: "depression" (psychology: 우울증) vs (meteorology: 저기압) vs (economics: 경기 침체)

### WIC-6: Contextual Register
**정의**: 문맥의 **격식/문체 수준**에 맞는 단어 선택
**특징**:
- 의미는 같지만 어감이 다름
- "terminate", "end", "finish" — 모두 비슷하지만 격식이 다름
- 학술/공식 vs 일상적 어조
**선택지 함탈**: 의미는 맞지만 격식이 안 맞음
**난이도**: Medium
**예시**: 공식 문서에서 "elucidate" (명확히 하다, 공식) vs "explain" (설명) vs "spill" (일상)

### WIC-7: Logic-Based Inference
**정의**: 문장의 **논리 구조**에서 **반드시 그 의미**여야만 하는 단어 선택
**특징**:
- "Although X, Y" — X와 Y의 **대조** 관계에서만 맞는 의미
- "Because X, Y" — X와 Y의 **인과** 관계에서만 맞는 의미
- 문맥의 **논리적 구조** 파악이 핵심
**선택지 함정**: 의미는 연관 있지만 논리에 안 맞음
**난이도**: Hard
**예시**: "Despite her rigorous training, she remained clumsy" (clumsy는 반드시 training의 **결과가 아닌** 단어)

---

## 5. 스킬 간 연결성

| 스킬 | 연결점 | 예시 |
|------|--------|------|
| **Inferences** | 의도 파악 | "Author Intent" inference와 "Connotation" WIC 연결 |
| **Text Structure** | 구조와 의미 | 단어의 의미가 **문장의 논리 구조**에 따라 결정됨 |
| **Transitions** | 연결어 의미 | 전환어도 WIC와 유사 (따라서, 그러나, 그래서의 의미) |
| **Central Ideas** | 주제 이해 | 주제를 모르면 단어의 의도적 의미 파악 어려움 |

---

## 6. 검증 (표본 30개 분류)

**검증 샘플**: 실제 SAT 문제에서 추출한 WIC 30개
**분류 결과**: (구현 단계에서 추가)
**오분류율 목표**: < 10%
**경계 사례**: WIC-2와 WIC-7의 경계 (의미 선택 vs 논리 추론)

---

## 7. 버전 관리

| 버전 | 날짜 | 변경사항 |
|------|------|---------|
| 1.0 | 2026-05-11 | 초기 정의 (7개 sub-skill) |
