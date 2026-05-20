# Central Ideas and Details 세부 분류 분석

**기본 데이터**: 1,527개 문제 중 Central Ideas 관련 분석
**데이터 출처**: `blog_database/sat_rw_reference.json`

---

## 1. Central Ideas and Details 스킬의 특성

### 1.1 주요 오답 패턴
| 오답 유형 | 비율 | 의미 |
|---------|------|------|
| **Out Of Scope** | 57.5% | 지문에 없는 내용, 배경지식으로 선택 |
| **Contradiction** | 16.4% | 지문 내용과 모순 |
| **Distortion** | 7.9% | 지문 내용 왜곡 |

**핵심 인사이트**: "지문이 직접 말하는 것"과 "배경지식으로 아는 것" 분리가 가장 중요. Out of Scope가 57.5%인 이유는 학생들이 자기 배경지식을 답안에 섞기 때문.

---

## 2. Central Ideas and Details 세부 sub-skill 분석

### 2.1 Dimension 1: "무엇"을 찾는가 (Content Type)

**1) Primary Theme (주 주제)**
- 지문 전체를 관통하는 **핵심 아이디어**
- "이 지문은 뭔가를 말하는가?"
- Arc: INFO_TO_CONCL, CLAIM_EVIDENCE (주제가 명확)
- 오답: Out of Scope (배경지식 간섭)

**2) Supporting Details (보조 세부사항)**
- 주 주제를 **뒷받침하는** 예시, 증거, 구체적 정보
- "주제를 증명하는 구체적 근거가 뭔가?"
- Arc: PURE_INFO (정보 나열)
- 오답: Partial Match (일부 세부사항만)

**3) Author's Position/Claim (저자 주장)**
- 지문이 주장하는 **입장, 의견, 평가**
- "저자는 이것에 대해 뭐라고 생각하는가?"
- Arc: CLAIM_EVIDENCE, CLASSICAL_ARG
- 오답: Misattribution (저자 vs 타인 혼동)

**4) Implicit Relationship (암묵적 관계)**
- 세부사항들 사이의 **숨은 연결고리**
- "이 정보들이 어떤 관계를 암시하는가?"
- Arc: INFO_TO_CONCL
- 오답: Out of Scope (관계를 추론하지 못함)

---

### 2.2 Dimension 2: "어디"에서 찾는가 (Scope/Location)

**Explicit Statement (명시된 진술)**
- 지문에 **직접 써 있음**
- 찾기 쉬움 (문장을 찾기만 하면 됨)
- 난이도: Easy

**Paragraph-Specific (단락 수준)**
- 특정 **단락의 기능**을 이해
- "이 단락이 뭘 하는 단락인가?" (배경, 주장, 예시, 반박...)
- 난이도: Medium

**Passage-Wide (지문 전체)**
- 지문 전체를 **통합**해서 파악
- 여러 단락의 정보를 **조합**해야 함
- 난이도: Hard

---

### 2.3 Dimension 3: "어떻게 표현되는가" (Expression Form)

**Direct Expression (직접 표현)**
- "X는 중요하다" ← 명시적
- 난이도: Easy

**Inferred Expression (추론으로 이해)**
- 예시, 수치, 구조를 통해 암묵적으로 표현
- "이런 예시들이 계속 나오므로 → 주제는 X의 중요성"
- 난이도: Medium-Hard

---

## 3. Central Ideas and Details 세부 Sub-skill 정의 (최종)

| Sub-skill | 정의 | 내용 타입 | 범위 | 표현 | 난이도 |
|-----------|------|---------|------|------|--------|
| **CIA-1: Main Theme** | 지문 전체의 **중심 주제** 파악 | Primary Theme | Passage-Wide | Direct | Medium |
| **CIA-2: Author Claim** | 저자의 **주장/입장** 파악 | Author's Position | Passage-Wide | Direct/Inferred | Medium |
| **CIA-3: Key Details** | 주제를 **직접 지지하는** 세부사항 선택 | Supporting Details | Paragraph/Passage | Explicit | Easy-Medium |
| **CIA-4: Implicit Link** | 세부사항 간의 **숨은 연결고리** 파악 | Implicit Relationship | Passage-Wide | Inferred | Hard |
| **CIA-5: Scope Boundary** | 주제의 **범위 제한** (과잉 일반화 방지) | Theme Scope | Paragraph | Inferred | Hard |
| **CIA-6: Information Purpose** | 각 정보가 **주제에서 하는 역할** 파악 | Supporting Details | Paragraph | Inferred | Medium-Hard |
| **CIA-7: Factual vs Opinion** | 사실과 저자 의견의 구분 | Content Type | Any | Direct | Medium |

---

## 4. 각 Sub-skill별 특성

### CIA-1: Main Theme
**정의**: 지문 전체를 관통하는 **단 하나의 핵심 아이디어**
**특징**:
- "이 지문을 한 문장으로 요약하면?"
- 너무 좁거나 너무 넓으면 안 됨
- 지문의 구조 전체에서 나오는 아이디어
**오답**: Out of Scope (배경지식), Too Narrow (부분만), Too Broad (너무 일반적)
**난이도**: Medium

### CIA-2: Author Claim
**정의**: 저자가 **주장하는 입장**
**특징**:
- "저자가 찬성하는가, 반대하는가?"
- "저자의 평가는 긍정인가, 부정인가?"
- 명시적일 수도, 암묵적일 수도 있음
**오답**: Misattribution (저자 vs 연구자 vs 일반인 혼동)
**난이도**: Medium-Hard

### CIA-3: Key Details
**정의**: 주제를 **직접 뒷받침하는** 구체적 정보
**특징**:
- 근거, 예시, 통계
- 주제와 **직접 연결**되는 것만
- 관련 있지만 주제와 다른 세부사항은 제외
**오답**: Partial Match (관련은 있지만 주제를 직접 지지하지 않음)
**난이도**: Easy-Medium

### CIA-4: Implicit Link
**정의**: 여러 세부사항들 간의 **숨은 패턴/관계** 파악
**특징**:
- "왜 저자가 이 3개 예시를 나란히 제시했는가?"
- "이 정보들의 공통점은?"
- 정보들이 암묵적으로 암시하는 것
**오답**: Out of Scope (지문 밖의 연결 생각), Missing the Pattern (패턴 못 봄)
**난이도**: Hard

### CIA-5: Scope Boundary
**정의**: 주제가 **어디까지 적용되는가**의 범위 정확히 파악
**특징**:
- "모든 X에 적용되나, 특정 X만 적용되나?"
- "과잉 일반화" 방지
- 제한사항, 예외 파악
**오답**: Overgeneralization (범위를 넘게 확대)
**난이도**: Hard

### CIA-6: Information Purpose
**정의**: 각 정보/세부사항이 **주제와 관련해서 어떤 역할**을 하는가
**특징**:
- "이 예시는 주제를 증명하나, 반박하나, 설명하나?"
- "이 정보는 왜 필요한가?"
- 정보의 기능 파악
**오답**: Misinterpreting Function (역할을 잘못 파악)
**난이도**: Medium-Hard

### CIA-7: Factual vs Opinion
**정의**: **사실**과 **저자의 의견/해석**을 구분
**특징**:
- "지문이 사실로 제시한 것: X"
- "저자의 평가: X는 중요하다"
- 둘을 혼동하면 오답
**오답**: Confusing Fact with Interpretation
**난이도**: Medium

---

## 5. 스킬 간 연결성

| 스킬 | 연결점 |
|------|--------|
| **Command of Evidence** | 중심 아이디어를 읽은 후 → 그를 지지하는 근거 찾기 |
| **Inferences** | 암묵적 주제는 추론해서 찾기 |
| **Text Structure** | 텍스트 구조에서 주제의 위치/역할 파악 |

---

## 6. 버전 관리

| 버전 | 날짜 | 변경사항 |
|------|------|---------|
| 1.0 | 2026-05-11 | 초기 정의 (7개 sub-skill) |
