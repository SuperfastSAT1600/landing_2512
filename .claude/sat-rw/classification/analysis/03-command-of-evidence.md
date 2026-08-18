# Command of Evidence 세부 분류 분석

**기본 데이터**: 1,527개 문제 중 CoE 관련 분석
**데이터 출처**: `blog_database/sat_rw_reference.json`

---

## 1. Command of Evidence 스킬의 특성

### 1.1 주요 오답 패턴
| 오답 유형 | 비율 | 의미 |
|---------|------|------|
| **Partial Match** | 35.4% | 관련 있지만 주장을 **완전하게** 지지하지 않는 근거 |
| **Contradiction** | 25.0% | 주장과 **상충**하는 근거 |
| **Out Of Scope** | 19.7% | 주장과 **무관**한 정보 |

**핵심 인사이트**: CoE는 "근거 찾기"가 아니라 "**주장을 가장 잘 뒷받침하는** 근거 찾기". 관련만 되고 충분하지 않으면 오답.

### 1.2 두 가지 유형
- **Textual Evidence** — 어떤 문장/구절이 주장을 가장 잘 지지하는가?
- **Quantitative Evidence** — 표/그래프의 데이터가 주장을 지지하는가?

---

## 2. Command of Evidence 세부 sub-skill 분석

### 2.1 Dimension 1: 증거의 "매칭 방식" (Evidence-Claim Matching)

**Level 1: Direct Restatement (직접 재언**
- 주장이 지문에 명시되고, 그 부분을 그대로 찾기
- Arc: CLAIM_EVIDENCE (주장+근거 명확)
- 난이도: Easy-Medium
- 오답: Partial Match (비슷한 부분만 찾음)

**Level 2: Logical Support (논리적 지지)**
- 주장이 명시적이지 않거나, 근거가 주장을 **간접적으로** 지지
- Arc: CLASSICAL_ARG (여러 근거 조합)
- 난이도: Medium
- 오답: Partial Match (일부만 지지), Out of Scope (무관)

**Level 3: Quantitative Matching (정량적 매칭)**
- 표/그래프의 범위와 **주장의 범위가 일치**하는가?
- 특징: 표의 "부분 데이터"와 "전체 주장"의 범위 일치 확인
- 난이도: Medium-Hard
- 오답: Partial Match (표는 맞지만 범위 다름)

---

### 2.2 Dimension 2: 근거의 "강도" (Evidence Strength)

**Sufficient Evidence (충분한 근거)**
- 주장을 **완전하게 지지**하는 근거
- 예: "X는 영향력 있다" → 근거: "X가 Y를 초래했다"
- 난이도: Easy

**Partial Evidence (부분적 근거)**
- 주장의 **일부만** 지지하는 근거
- 예: "X는 영향력 있다" → 근거: "X의 부작용이 있다" (영향력 있지만 불완전)
- 함정: 학생들은 "관련 있다"고 생각하고 선택
- 난이도: Hard (가장 까다로운 함정)

**No Evidence (무관 또는 모순)**
- 주장과 무관하거나 반박
- 난이도: Easy-Medium (명백함)

---

### 2.3 Dimension 3: 증거 타입 (Evidence Type)

**Direct Quote/Paraphrase (직접 인용 또는 의역)**
- 근거가 명시적 문장
- "저자가 '이렇게 말했다' → 따라서 저자의 입장은..."
- 난이도: Easy-Medium

**Implicit/Contextual Evidence (암묵적 근거)**
- 근거가 전체 맥락에 깔려 있음
- "이런 예시들이 계속 나오므로 → 저자의 주장은..."
- 난이도: Hard

**Numerical/Statistical Evidence (통계적 근거)**
- 표, 그래프, 숫자
- 특징: 범위, 시간 범위, 표본 크기 확인 필수
- 난이도: Medium-Hard

**Counterfactual Evidence (반사실적 근거)**
- "만약 X가 아니었다면..." 형식
- 부재의 증거를 통한 주장 지지
- 난이도: Hard

---

## 3. Command of Evidence 세부 Sub-skill 정의 (최종)

| Sub-skill | 정의 | 매칭 방식 | 강도 | 타입 | 난이도 |
|-----------|------|---------|------|------|--------|
| **CoE-1: Direct Match** | 주장과 근거가 직접 일치하는 경우 | Direct | Sufficient | Quote/Paraphrase | Easy |
| **CoE-2: Logical Support** | 주장을 논리적으로 지지하는 근거 찾기 | Logical | Sufficient | Implicit/Contextual | Medium |
| **CoE-3: Sufficient Chain** | 여러 근거를 연결하여 주장 지지 | Multiple | Sufficient | Contextual | Medium-Hard |
| **CoE-4: Partial Recognition** | 관련 있지만 **불충분한** 근거 배제 | Logical | Partial | Any | Hard |
| **CoE-5: Scope Matching** | 통계 범위와 주장 범위의 일치 확인 | Quantitative | Sufficient | Numerical | Medium-Hard |
| **CoE-6: Data Interpretation** | 표/그래프의 데이터를 올바르게 해석 | Quantitative | Sufficient | Numerical | Medium-Hard |
| **CoE-7: Counterfactual** | 없음을 통해 있음을 증명 (반사실적 증거) | Implicit | Sufficient | Counterfactual | Hard |

---

## 4. 각 Sub-skill별 특성

### CoE-1: Direct Match
**정의**: 주장이 **명시적**이고, 근거도 **그 부분을 직접** 지지
**특징**:
- 가장 명확한 유형
- "저자가 'X가 중요하다'고 말함" → 그 문장을 고르면 됨
**오답 함정**: Partial Match (비슷한 부분이 있지만 정확한 지지 아님)
**난이도**: Easy-Medium

### CoE-2: Logical Support
**정의**: 주장이 **명시적이지 않거나**, 근거가 **논리적으로** 주장을 지지
**특징**:
- "저자가 이런 예시들을 제시했으므로 → 저자의 주장은 (암묵적) ..."
- 주장을 **읽고 추론**해야 함
- 그 추론된 주장을 **가장 잘 지지하는** 근거 찾기
**오답 함정**: Out of Scope (무관), Partial Match (일부만 지지)
**난이도**: Medium

### CoE-3: Sufficient Chain
**정의**: **여러 문장/근거를 연결**하여 주장을 완성적으로 지지
**특징**:
- "A를 말하고, B를 말하고, 그리고 C를 말했으므로 → 주장은..."
- 한 문장이 아니라 **전체 구조** 이해
- 다양한 근거 조합 필요
**오답 함정**: Partial Match (일부 근거만 고름), Out of Scope (일부만 무관)
**난이도**: Medium-Hard

### CoE-4: Partial Recognition (가장 까다로운 유형)
**정의**: 근거가 **관련 있지만 주장을 완전하게 지지하지 못하는** 경우 **배제하기**
**특징**:
- "이 문장도 맞고, 저 문장도 맞는데, 어느 게 **가장** 잘 지지하나?"
- "이 문장은 주장의 일부만 맞고, 다른 부분은..."
- **충분성** 판단이 핵심
**오답**: Partial Match 함정에 빠짐
**난이도**: Hard (가장 높은 오답률 35.4%)

### CoE-5: Scope Matching
**정의**: **통계 데이터의 범위**와 **주장의 범위**가 **일치하는가** 확인
**특징**:
- 표: 2020-2022년 데이터 / 주장: "최근 10년..." → 불일치
- 표: 미국 데이터 / 주장: "전 세계..." → 불일치
- 표: 샘플 500명 / 주장: "모든 사람..." → 과잉 일반화
**오답**: Partial Match (범위가 안 맞음)
**난이도**: Medium-Hard

### CoE-6: Data Interpretation
**정의**: 표/그래프의 **데이터를 올바르게 읽고 해석**
**특징**:
- 증가/감소 추세 파악
- 비교 데이터 (A vs B의 크기 비교)
- 백분율 vs 절대값
- 시계열 데이터의 변화
**오답**: Misreading (데이터를 잘못 읽음), Contradiction (반대로 읽음)
**난이도**: Medium-Hard

### CoE-7: Counterfactual
**정의**: **반사실적 표현**을 통해 주장을 지지
**특징**:
- "만약 X가 없었다면 Y가 일어나지 않았을 것이다" → X의 중요성 증명
- "X를 제외했을 때만 Y가 일어났다" → X의 필요성
- 부재의 증거, 역설적 증거
**오답**: Out of Scope (반사실적 구조 못 이해)
**난이도**: Hard

---

## 5. Textual vs Quantitative의 차이

| 측면 | Textual Evidence | Quantitative Evidence |
|-----|-----------------|----------------------|
| 근거 형태 | 문장, 구절 | 표, 그래프, 숫자 |
| 핵심 스킬 | 주장-근거 논리 매칭 | 범위, 시간, 데이터 정확성 확인 |
| 주요 오답 | Partial Match, Out of Scope | Partial Match (범위 불일치) |
| 난이도 | Medium | Medium-Hard |

---

## 6. 스킬 간 연결성

| 스킬 | 연결점 |
|------|--------|
| **Inferences** | 주장이 암묵적일 때, Inference 능력으로 읽은 후 CoE로 지지 찾기 |
| **Central Ideas** | 중심 아이디어를 읽고, 그를 지지하는 세부사항 찾기 |
| **Text Structure** | 텍스트의 주장-근거 구조 파악 → CoE |

---

## 7. 버전 관리

| 버전 | 날짜 | 변경사항 |
|------|------|---------|
| 1.0 | 2026-05-11 | 초기 정의 (7개 sub-skill) |
