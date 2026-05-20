# Boundaries 세부 분류 분석

**기본 데이터**: 178문제 (Easy:64, Medium:53, Hard:61)
**데이터 출처**: `/workspace/blog_database/sat_questions.db`

---

## 1. Boundaries 스킬의 특성

### 1.1 주요 오답 패턴

| 오답 유형 | 비율 | 의미 |
|---------|------|------|
| **Partial Match** | 49.1% | 문법적으로 부분만 맞는 부호 선택 |
| **Distortion** | 26.8% | 잘못된 부호로 문장 구조 자체를 왜곡 |
| **Misattribution** | 9.5% | 부호의 역할을 다른 문법 규칙으로 혼동 |
| **Pre-Pivot Reading** | 7.7% | 절 구조 파악 없이 일부만 읽고 선택 |
| **Contradiction** | 3.6% | 완전히 반대되는 부호 선택 |

**핵심 인사이트**: Boundaries는 지문의 논리 구조보다 **문장의 문법 구조(독립절 vs 종속절 vs 수식어구)**가 핵심이다. Partial Match(49.1%)가 압도적 1위인 이유는, 선택지 4개 모두가 부호만 다른 형태로 제시되므로 "얼추 맞아 보이는" 부호를 고르는 함정이 강력하기 때문이다.

---

### 1.2 Arc 시퀀스 분석 — PURE_INFO 압도의 이유

| Arc 패턴 | 문제 수 | Easy | Medium | Hard | 비율 |
|---------|--------|------|--------|------|------|
| **PURE_INFO** | 116 | 41 | 37 | 38 | 65.2% |
| **CLAIM_EVIDENCE** | 42 | 15 | 12 | 15 | 23.6% |
| **INFO_TO_CONCL** | 16 | 6 | 4 | 6 | 9.0% |
| **DUAL_CLAIM** | 4 | 2 | 0 | 2 | 2.2% |

**PURE_INFO가 65.2%를 차지하는 구조적 이유**:

Boundaries는 **문법 스킬**이다. 논리 관계(주장-근거, 정보-결론)를 테스트하는 것이 아니라, 어떤 부호가 두 절/구를 올바르게 연결하는지를 테스트한다. PURE_INFO 지문은 단순 사실 나열 구조이므로, 논리 흐름보다 **문장 결합 방식** 자체에 집중하게 만든다. 이것이 문법 스킬 테스트에 가장 적합한 지문 유형이다.

**PURE_INFO 내 난이도 분포**: Easy:41, Medium:37, Hard:38 — 거의 균등하다. 이는 난이도가 지문 유형이 아니라 **부호 선택의 복잡도**에서 결정됨을 의미한다.

**Top 시퀀스** (sequence_simple 기준):

| 시퀀스 | 빈도 | 설명 |
|--------|------|------|
| EXP_I-I | 88 | 설명-정보-정보: 두 개 이상의 정보 절 연결이 핵심 |
| EXP_I | 18 | 단일 정보: 주어-동사 사이 불필요 부호 삽입 함정 |
| EXP_I-I-CL | 12 | 설명-정보-정보-결론: 결론 전 절 연결 |
| ARG_C-CL | 10 | 논증-주장-결론: 주장과 근거 절 연결 |
| ARG_I-C | 9 | 논증-정보-주장: 정보에서 주장으로 전환 |

---

### 1.3 부호별 출제 빈도 분석

정답에 등장하는 부호 유형을 DB에서 직접 분류한 결과:

| 부호 유형 | 정답 빈도 | Easy | Medium | Hard | 대표 Sub-skill |
|---------|---------|------|--------|------|--------------|
| **쉼표(,)** | 50 (28.1%) | 24 | 19 | 7 | BOUND-6 |
| **부호 없음** | 47 (26.4%) | 25 | 9 | 13 | BOUND-1/BOUND-2 |
| **마침표(.)** | 30 (16.9%) | 11 | 7 | 12 | BOUND-4 |
| **세미콜론(;)** | 23 (12.9%) | 3 | 8 | 12 | BOUND-4/BOUND-5 |
| **콜론(:)** | 16 (9.0%) | 0 | 3 | 13 | BOUND-7 |
| **대시(—)** | 12 (6.7%) | 1 | 7 | 4 | BOUND-7 |

**핵심 관찰**:

- **쉼표(,)와 부호 없음이 합산 54.5%**: Easy에 집중(각각 24, 25건) — 주어-동사 사이 불필요 부호 삽입/삭제 문제가 초급 핵심.
- **콜론(:)은 Hard에만 집중(13/16건)**: 콜론의 쓰임(완전한 절 + 설명/목록)을 이해하지 못하면 Hard에서 실점.
- **세미콜론(;)도 Hard 비율 높음(12/23건)**: 독립절 판별 능력이 핵심.
- **Easy에서 부호 없음이 25건**: 가장 흔한 Easy 유형 — 불필요한 부호 삽입을 거부하는 능력.

---

## 2. Boundaries 세부 Sub-skill 분석

### 2.1 Dimension 1: 절의 독립성 판별

**BOUND-1: Independent Clause Recognition (독립절 인식)**
- **완전한 문장**(주어+동사+의미 완결)을 인식하는 능력
- 핵심 판단: "이 절은 혼자 설 수 있는가?"
- Arc 적합성: EXP_I(단일 정보 절 구조) — 주어-동사 사이 부호 없음이 정답인 Easy 유형
- 난이도: **Easy-Medium**
- 주요 오답: Partial Match (쉼표/대시를 삽입해 절을 끊으려 함)
- 판별 기준: 주어와 동사가 직접 이어지는가? 수식어구가 필수인가 부가적인가?

**BOUND-2: Dependent Clause Recognition (종속절 인식)**
- **불완전한 절**(종속접속사 포함, 또는 주어/동사 누락)을 인식
- 핵심 판단: "이 절만으로 문장이 완결되는가?"
- Arc 적합성: EXP_I-I (두 절 중 하나가 종속절인 구조)
- 난이도: **Easy-Medium**
- 주요 오답: Distortion (종속절을 독립절로 잘못 판단해 세미콜론 삽입 → 문장 왜곡)
- 판별 기준: "which", "that", "when", "because" 등 종속접속사 존재 여부

**BOUND-3: Clause Combination Logic (절 결합 논리)**
- 두 절을 **어떻게 연결할 것인가** 판단 — 독립절+독립절 vs 독립절+종속절
- 핵심 판단: 두 절의 독립성 상태에 따라 허용되는 부호가 결정됨
- Arc 적합성: EXP_I-I, ARG_C-CL (두 절 결합이 핵심인 시퀀스)
- 난이도: **Medium-Hard**
- 주요 오답: Partial Match (쉼표로 두 독립절 연결 → comma splice), Distortion (접속사 없이 세미콜론만으로 연결)
- 판별 기준:
  - 독립절 + 독립절: `;` 또는 `, + 등위접속사(FANBOYS)` 또는 `.`
  - 독립절 + 종속절: `,` (종속절이 앞에 올 때) 또는 부호 없음 (종속절이 뒤에 올 때)

---

### 2.2 Dimension 2: 부호 선택 정밀도

**BOUND-4: Period vs Semicolon (마침표 vs 세미콜론)**
- `.` (완전히 끊기, 두 독립 문장) vs `;` (의미상 긴밀히 연결된 두 독립절)
- 핵심 판단: 두 절이 주제상 밀접하게 연결되는가? 접속부사(however, therefore)가 뒤에 오는가?
- 난이도: **Medium** (마침표 Easy, 세미콜론 Hard)
- 주요 오답: Distortion (콤마 스플라이스), Partial Match (등위접속사와 조합 혼동)
- 실전 규칙: `;` + 접속부사(however/therefore) 조합은 두 독립절 연결의 표준 패턴

**BOUND-5: Semicolon vs Comma (세미콜론 vs 쉼표)**
- `;` (독립절 연결) vs `,` (종속절 앞, 삽입구, 등위접속사 앞)
- 핵심 판단: 뒤 절이 독립적인가? 종속적인가?
- 난이도: **Medium-Hard**
- 주요 오답: Partial Match (`,` 사용 → comma splice), Distortion (세미콜론 과잉 사용)
- 실전 규칙: 세미콜론 뒤에는 반드시 독립절이 와야 함. "it/they/he/she + 동사"로 시작하면 독립절 신호.

**BOUND-6: Comma Usage (쉼표의 다양한 쓰임)**
- 쉼표의 적합한 맥락: 삽입구 양쪽 / 등위접속사 앞 / 종속절 앞(선택적)
- 핵심 판단: 쉼표가 필요한 문법 조건이 충족되는가?
- 난이도: **Medium**
- 주요 오답: Partial Match (쉼표가 있긴 하지만 위치나 짝이 틀림), Misattribution (삽입구를 필수 수식어로 혼동)
- 실전 규칙: 삽입구(which, who로 시작하는 비제한적 관계절)는 양쪽 쉼표로 묶어야 함

**BOUND-7: Colon & Dash (콜론과 대시)**
- `:` (완전한 독립절 + 설명/목록/인용): "앞이 완전한 절이어야 함"
- `—` (삽입/강조/추가 설명): 앞뒤 모두 완전하지 않아도 됨, 단 대칭 필요
- 난이도: **Medium-Hard** (콜론은 Hard 집중)
- 주요 오답: Misattribution (콜론과 대시 역할 혼동), Distortion (콜론 앞 절이 불완전한데 삽입)
- 실전 규칙: 콜론은 "앞 절이 완전한 독립절"일 때만 사용 가능. 대시는 삽입구 시작-끝에 짝으로 사용.

---

## 3. Sub-skill × 오답 유형 연결표

| Sub-skill | 주 오답 유형 | 원인 | 회피 전략 |
|-----------|-----------|------|---------|
| **BOUND-1** (독립절 인식) | Partial Match | 주어-동사 사이에 불필요 부호 삽입 | "주어 다음에 동사가 바로 오면 부호 없음" 규칙 적용 |
| **BOUND-2** (종속절 인식) | Distortion | 종속절을 독립절로 오판 → 세미콜론 삽입 | 종속접속사(which/that/when) 확인 |
| **BOUND-3** (절 결합 논리) | Partial Match | comma splice — 두 독립절을 쉼표만으로 연결 | 두 절의 독립 여부 먼저 확인 후 부호 결정 |
| **BOUND-4** (마침표 vs 세미콜론) | Distortion | comma splice 또는 run-on | 독립절+독립절 → `;` 또는 `. ` 사용 |
| **BOUND-5** (세미콜론 vs 쉼표) | Partial Match | `,` 하나로 독립절 연결 (comma splice) | 세미콜론 뒤 절이 독립적인지 확인 |
| **BOUND-6** (쉼표의 쓰임) | Misattribution | 삽입구를 필수 수식어로 혼동 → 쉼표 생략 | "이 구/절을 제거해도 문장이 완전한가?" 테스트 |
| **BOUND-7** (콜론 & 대시) | Misattribution | 콜론 앞 절이 불완전한데 사용 | 콜론 앞 절이 완전한 독립절인지 확인 |

**Arc별 오답 패턴**:

| Arc | Partial Match | Distortion | Misattribution | 시사점 |
|-----|-------------|-----------|--------------|--------|
| PURE_INFO | 높음 | 높음 | 중간 | 단순 정보 절 연결에서도 부호 정밀도 필요 |
| CLAIM_EVIDENCE | 중간 | 중간 | 높음 | 주장절-근거절 연결 시 역할 혼동 빈번 |
| INFO_TO_CONCL | 낮음 | 낮음 | 낮음 | 출제 빈도 자체가 낮음(16문제) |

---

## 4. 실전 예시 문제

### 예시 1 — Easy (ID: de55ec71)

**Arc**: PURE_INFO | **Sequence**: EXP_I | **부호 유형**: 부호 없음

> Generations of mystery and horror ______ have been influenced by the dark, gothic stories of celebrated American author Edgar Allan Poe (1809–1849).

- A: **writers** ← 정답
- B: writers,
- C: writers—
- D: writers;

**분석**:
- **정답 A "writers"**: 주어("Generations of mystery and horror writers") 다음에 동사("have been influenced")가 바로 이어진다. 주어와 동사 사이에는 어떤 부호도 필요 없다. BOUND-1(독립절 인식) 유형.
- **오답 B "writers,"**: 주어-동사 사이에 쉼표 삽입 — 불필요한 부호로 문장을 끊음. Partial Match.
- **오답 C "writers—"**: 주어-동사 사이에 대시 삽입 — 문법적으로 허용되지 않는 위치. Partial Match.
- **오답 D "writers;"**: 세미콜론은 두 독립절을 연결할 때 사용 — 여기서는 절이 하나이므로 불가. Distortion.

**핵심 포인트**: EXP_I 시퀀스(단일 정보 절)에서 가장 흔한 유형. "주어-동사 사이에 부호가 개입하면 항상 오답"이라는 규칙을 적용하면 쉽게 풀린다.

---

### 예시 2 — Medium (ID: 89fbc3eb)

**Arc**: PURE_INFO | **Sequence**: EXP_I-I | **부호 유형**: 세미콜론(;)

> The Mission 66 initiative, which was approved by Congress in 1956, represented a major investment in the infrastructure of overburdened national ______ it prioritized physical improvements to the parks' roads, utilities, employee housing, and visitor facilities while also establishing educational programming for the public.

- A: parks and
- B: parks
- C: **parks;** ← 정답
- D: parks,

**분석**:
- **정답 C "parks;"**: 빈칸 앞 절("The Mission 66 initiative...national parks")과 뒤 절("it prioritized...public")이 각각 완전한 독립절이다. 두 독립절은 세미콜론으로 연결 가능. BOUND-5(세미콜론 vs 쉼표) 유형.
- **오답 A "parks and"**: 등위접속사 "and" 앞에는 쉼표가 필요("parks, and") — 쉼표 누락. Partial Match.
- **오답 B "parks"**: 부호 없이 두 독립절 연결 → run-on sentence. Distortion.
- **오답 D "parks,"**: 쉼표 하나로 두 독립절 연결 → comma splice. 이것이 가장 흔한 Partial Match 함정.

**핵심 포인트**: 빈칸 뒤가 "it prioritized..."로 시작 — 대명사 "it"이 주어이고 "prioritized"가 동사인 독립절. 독립절 신호를 파악하면 세미콜론이 정답임을 알 수 있다.

---

### 예시 3 — Hard (ID: 960dec02)

**Arc**: CLAIM_EVIDENCE | **Sequence**: EXP_I-C | **부호 유형**: 부호 없음

> A recent study tracked the number of bee species present in twenty-seven New York apple orchards over a ten-year period. ______ found that when wild growth near an orchard was cleared, the number of different bee species visiting the orchard decreased.

- A: Entomologist Heather Grab:
- B: Entomologist, Heather Grab,
- C: **Entomologist Heather Grab** ← 정답
- D: Entomologist Heather Grab,

**분석**:
- **정답 C "Entomologist Heather Grab"**: "Entomologist"는 "Heather Grab"의 직함(title)으로, 고유명사와 직함 사이에는 부호가 필요 없다. 또한 주어("Entomologist Heather Grab") 다음 동사("found")가 바로 이어지므로 주어-동사 사이 부호도 필요 없다. BOUND-1 + BOUND-6 복합 유형.
- **오답 A ":"**: 콜론은 완전한 독립절 뒤에 사용 — "Entomologist Heather Grab"은 절이 아니라 명사구이므로 불가. Misattribution.
- **오답 B "Entomologist, Heather Grab,"**: 이름 앞뒤에 쉼표를 붙이면 이름이 삽입구(동격)가 됨 → "Entomologist"가 누구인지 다른 사람이 있다는 뉘앙스 발생. 실제로는 "Heather Grab = Entomologist"이므로 불필요한 부호. Misattribution.
- **오답 D "Entomologist Heather Grab,"**: 주어-동사 사이 쉼표 삽입 — BOUND-1의 기본 규칙 위반. Partial Match.

**핵심 포인트 (Hard 특성)**: 선택지 B는 "Entomologist, Heather Grab,"처럼 이름을 동격으로 설정하는 구조인데, 이것이 문법적으로 "그럴듯해 보이는" 함정이다. 직함+이름 조합(Dr. Smith, Professor Lee)에서는 쉼표 없이 연결함을 기억해야 한다.

---

## 5. Partial Match 오답 심층 분석 — 왜 49.1%인가

### 5.1 Boundaries 문제 구조의 특수성

Transitions 문제는 논리 관계를 묻지만, Boundaries 문제는 **4개의 선택지가 모두 같은 단어에 다른 부호만 조합**하여 제시된다. 예를 들면:

```
A: parks and        (등위접속사, 쉼표 누락)
B: parks            (부호 없음, run-on)
C: parks;           (세미콜론, 정답)
D: parks,           (쉼표, comma splice)
```

이 구조에서 **모든 오답은 "parks"라는 올바른 단어를 포함**한다. 즉, 내용은 맞고 부호만 틀린다 — 이것이 Partial Match(부분적으로 맞는 선택)가 49.1%로 압도적인 이유다.

### 5.2 Partial Match가 발생하는 3대 패턴

**패턴 1: Comma Splice (가장 흔함)**
- 두 독립절을 쉼표 하나로 연결
- 예: "The results were positive, researchers decided to continue." (오답: `,`)
- 왜 유혹적인가: 영어에서 쉼표는 매우 흔하게 사용되므로 "당연히 있겠지"라고 생각

**패턴 2: 불필요한 부호 삽입**
- 주어-동사 사이, 또는 동사-목적어 사이에 부호 삽입
- 예: "Generations of writers, have been influenced..." (오답: `,`)
- 왜 유혹적인가: 긴 주어 뒤에 잠시 쉬는 느낌이 자연스러워 보임

**패턴 3: 짝 없는 대시/쉼표**
- 삽입구 시작 부호만 있고 끝 부호가 없는 경우
- 예: "and in the process—" (끝 대시 없이 문장 이어짐) → 오답
- 왜 유혹적인가: 대시 이후 내용이 연장되는 것처럼 보임

### 5.3 Partial Match 해결 전략

1. **2단계 점검**: 선택지를 고른 후 반드시 "이 부호가 여기서 문법적으로 허용되는가?"를 확인
2. **절의 독립성 먼저**: 빈칸 앞뒤 절이 각각 독립절인지 종속절인지 먼저 분류
3. **부호별 허용 규칙**:
   - 두 독립절: `;` / `. ` / `, + FANBOYS`
   - 독립절 + 종속절: 부호 없음 (종속절이 뒤) / `,` (종속절이 앞)
   - 삽입구: 양쪽에 같은 부호(`, ~~,` 또는 `— ~~—`)
   - 주어-동사 사이: 부호 없음 (삽입구 없는 경우)

---

## 6. 버전 관리

| 버전 | 날짜 | 변경사항 |
|------|------|---------|
| 1.0 | 2026-05-11 | 초기 정의 (7개 sub-skill) |
| 2.0 | 2026-05-12 | Arc 시퀀스 분석, 부호별 출제 빈도 분석, Dimension 구조 재편, Sub-skill × 오답 연결표, 실전 예시 3개, Partial Match 심층 분석 추가 |
