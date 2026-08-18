# Inferences 세부 분류 분석

**기본 데이터**: 1,527개 문제 중 Inference 관련 분석
**데이터 출처**: `blog_database/sat_rw_reference.json`

---

## 1. Inferences 스킬의 특성

### 1.1 주요 오답 패턴
| 오답 유형 | 비율 | 의미 |
|---------|------|------|
| **Out Of Scope** | 64.7% | 지문에 근거 없이 추론하는 오류 (가장 치명적) |
| **Contradiction** | 14.0% | 지문과 모순되는 추론 |
| **Overgeneralization** | 9.6% | 제한된 사례를 과잉 일반화 |

**핵심 인사이트**: Inferences의 핵심은 "지문에서 추론 *가능한* 것" vs "지문을 넘어선 결론"의 구분

### 1.2 Arc 시퀀스 분석

**설명형 (EXP - Expository)**
- `EXP_I`: 440개 — 정보만 제시 (배경 없음)
- `EXP_I_bg-I`: 206개 — 배경→정보
- `EXP_I_bg-I-CL`: 143개 — 배경→정보→결론 (이미 결론이 명시)

**논증형 (ARG - Argumentative)**
- `ARG_C_au-CL_au`: 53개 — 저자주장→저자결론 (저자 의도 파악 필요)
- `ARG_I_bg-C_au`: 31개 — 배경→저자주장 (주장이 암묵적일 수 있음)

**문학형 (LIT - Literary)**
- `LIT_I_bg-C_au`: 34개 — 배경→저자주장 (감정/태도 추론 필요)
- `LIT_I_bg-I-CL`: 22개 — 배경→정보→결론

---

## 2. Inference 세부 sub-skill 분석

### 2.1 Dimension 1: 추론의 "거리" (Inference Distance)

**Level 1: 1단계 추론**
- 한 문장/구절에 직접 근거가 명시
- Arc: `EXP_I` (정보만 제시)
- 오답: Partial Match (부분만 읽음)
- 예: "지문이 'X는 중요하다'고 했으므로 → X가 중요하다고 추론"

**Level 2: 2단계 추론**
- 여러 곳의 정보를 조합해야 함
- Arc: `EXP_I_bg-I`, `EXP_I-I` (여러 정보 연결)
- 오답: Out of Scope (필요한 모든 정보를 못 찾음)
- 예: "배경에서 A, 본문에서 B → 따라서 C라고 추론"

**Level 3: 암묵적 추론**
- 지문에 명시되지 않은 가정이나 전제를 파악해야 함
- Arc: `ARG_I_bg-C_au`, `ARG_C_au-CL_au` (주장이 암묵적)
- 오답: Out of Scope (지문을 넘어섬) / Contradiction (주장을 잘못 파악)
- 예: "저자가 A를 비판했으므로 → 저자는 B를 선호한다"

---

### 2.2 Dimension 2: 추론의 "대상" (Inference Target)

**Intention/Attitude Inference**
- 저자나 화자의 의도, 태도, 평가를 추론
- Arc: `ARG_C_au`, `ARG_I_bg-C_au`, `LIT_I_bg-C_au`
- 특징: 명시적 주장이 없거나 암묵적
- 오답: Misattribution (주체 혼동), Distortion (태도 왜곡)

**Causal Inference**
- 원인-결과 관계를 추론
- Arc: `EXP_I-I`, `EXP_I_bg-I-I-CL`
- 특징: "왜 이런 일이 일어났는가" / "이게 어떤 결과를 낳을까"
- 오답: Overgeneralization (인과관계를 너무 일반화)

**Mechanism/Process Inference**
- 어떻게 작동하는지, 어떤 과정인지 추론
- Arc: `ARG_I-C`, `ARG_C-I-CL`
- 특징: "시스템/프로세스의 흐름" 파악
- 오답: Partial Match (과정의 일부만 이해)

**Implicit Assumption Inference**
- 주장이 암묵적으로 전제하는 가정 파악
- Arc: `ARG_C-CL`, `ARG_I_bg-C_au-CL_au`
- 특징: "이 주장이 성립하려면 뭘 가정해야 하나"
- 오답: Out of Scope (지문 밖의 상식과 혼동)

**Literary/Figurative Inference**
- 문학적 표현, 비유, 상징 해석
- Arc: `LIT_I_bg-C_au`, `LIT_I_bg-I-CL`, `LIT_I-C-CL`
- 특징: 표면적 의미 vs 실제 의도의 간극
- 오답: Literal reading (문자적으로만 읽음), Distortion

---

### 2.3 Dimension 3: 증거 구조 (Evidence Structure)

**Single Source (한곳에 집중)**
- 증거가 1-2개 문장에 집중
- Arc: `EXP_I` (440개)
- 특징: 문맥을 좁게 집중해서 읽어야 함
- 오답: Partial Match (핵심 문장만 놓침)

**Multi-Source (분산된 증거)**
- 증거가 여러 문장/단락에 흩어짐
- Arc: `EXP_I_bg-I`, `EXP_I_bg-I-I-CL`, `EXP_I_bg-I-I-I-CL`
- 특징: 전체 구조를 파악하고 연결해야 함
- 오답: Out of Scope (필요한 모든 증거를 못 찾음)

**Implicit Evidence (명시되지 않은 증거)**
- 근거가 암묵적이거나 전체 맥락에 깔려 있음
- Arc: `ARG_C_au`, `ARG_I_bg-C_au`
- 특징: "왜 이렇게 추론하는가"의 논리 체인이 생략됨
- 오답: Out of Scope (생략된 부분을 보충할 수 없음)

---

## 3. Inference 세부 Sub-skill 정의 (최종)

| Sub-skill | 정의 | 거리 | 대상 | 증거 구조 | 주요 Arc | 오답 |
|-----------|------|------|------|---------|---------|------|
| **INF-1: Direct Textual** | 한 문장/구절에서 직접 읽을 수 있는 추론 | Level 1 | Causal/Process | Single | EXP_I | Partial Match |
| **INF-2: Multi-Source Logic** | 여러 정보를 논리적으로 연결하는 추론 | Level 2 | Causal/Mechanism | Multi | EXP_I_bg-I, EXP_I-I | Out of Scope |
| **INF-3: Author Intent** | 저자의 의도, 주장, 태도를 파악하는 추론 | Level 2-3 | Intention/Attitude | Single/Implicit | ARG_I_bg-C_au, ARG_C_au | Misattribution, Contradiction |
| **INF-4: Implicit Assumption** | 주장이 암묵적으로 전제하는 가정 찾기 | Level 3 | Assumption | Implicit | ARG_C-CL, ARG_I_bg-C_au-CL_au | Out of Scope |
| **INF-5: Scope Boundary** | 추론의 범위를 정확히 제한하기 | Level 1-3 | Scope | Any | Any | Overgeneralization |
| **INF-6: Literary/Symbolic** | 문학적 표현, 비유의 의미 해석 | Level 2-3 | Figurative | Implicit | LIT_I-C, LIT_I_bg-C_au | Distortion, Literal Reading |
| **INF-7: Conclusion Logic** | 주장에서 결론으로의 논리 체인 | Level 2 | Logic Chain | Multi/Implicit | ARG_C_au-CL_au, ARG_C-I-CL | Contradiction, Out of Scope |

---

## 4. 각 Sub-skill별 예시 및 특성

### INF-1: Direct Textual Inference
**정의**: 한 문장이나 인접한 문장에서 명시적으로 읽을 수 있는 추론
**특징**:
- 정보가 명확하게 제시됨
- "추론"이라기보다는 "읽기"에 가까움
- 하지만 정확한 부분만 찾아야 함 (Partial Match 함정)
**주요 오답**: Partial Match
**Arc**: EXP_I (440개)
**난이도**: Easy-Medium (부분만 읽을 위험)

### INF-2: Multi-Source Logic Inference
**정의**: 여러 곳에 흩어진 정보를 모아서 논리적으로 연결하는 추론
**특징**:
- 구조 파악 능력 필요
- "배경→정보→정보" 흐름 추적
- 전체 맥락 이해 필수
**주요 오답**: Out of Scope (필요한 정보를 못 찾거나 전체 그림을 못 봄)
**Arc**: EXP_I_bg-I (206개), EXP_I_bg-I-I-CL (58개)
**난이도**: Medium

### INF-3: Author Intent Inference
**정의**: 저자의 숨은 의도, 입장, 태도를 파악해야 하는 추론
**특징**:
- 주장이 명시적이지 않을 수 있음
- "저자가 A를 비판했으므로, 저자는 B를 지지한다" 유형
- 주체(저자 vs 타인)를 정확히 파악해야 함
**주요 오답**: Misattribution (주체 혼동), Contradiction (의도를 잘못 파악)
**Arc**: ARG_I_bg-C_au (31개), ARG_C_au (18개)
**난이도**: Hard

### INF-4: Implicit Assumption Inference
**정의**: 주장이 성립하기 위해 **반드시 참**이어야 하는 전제/가정 찾기
**특징**:
- 지문에 명시되지 않은 "생략된 논리"
- "이 결론에 도달하려면, 뭘 가정해야 하나?"
- Out of Scope의 최대 함정 (일반적인 지식과 혼동)
**주요 오답**: Out of Scope (생략된 가정이 상식인지 지문에서 나온 건지 헷갈림)
**Arc**: ARG_C-CL (89개), ARG_I_bg-C_au-CL_au (16개)
**난이도**: Hard

### INF-5: Scope Boundary Inference
**정의**: 추론을 **어디까지 할 수 있는가**의 경계를 정확히 파악
**특징**:
- "지문이 암시하는 것" vs "지문을 넘어선 것"의 구분
- Overgeneralization 방지
- "반드시 그럴까?" vs "아마 그럴 것"
**주요 오답**: Overgeneralization (특정 사례를 일반화), Out of Scope (지문 밖으로 나감)
**Arc**: All (모든 구조에서 나타남)
**난이도**: Hard (가장 까다로운 Inference)

### INF-6: Literary/Symbolic Inference
**정의**: 문학적 표현, 은유, 상징, 이중 의미의 추론
**특징**:
- 표면적 의미 vs 실제 의도의 간극
- 인물의 심리 상태, 감정 파악
- 문학형(LIT) 지문에서 주로 나타남
**주요 오답**: Distortion (비유를 문자적으로 읽거나 과장), Literal Reading
**Arc**: LIT_I_bg-C_au (34개), LIT_I-C (52개)
**난이도**: Hard

### INF-7: Conclusion Logic Inference
**정의**: 주장(C)에서 결론(CL)으로 이어지는 **논리 체인** 파악
**특징**:
- "왜 이 주장에서 이 결론이 나올까?"
- 생략된 중간 단계 보충
- 논증의 타당성 판단 필요
**주요 오답**: Contradiction (논리를 잘못 이해), Out of Scope (논리의 빈틈 과장)
**Arc**: ARG_C_au-CL_au (53개), ARG_C-I-CL (37개)
**난이도**: Hard

---

## 5. 스킬 간 연결성 (다른 스킬과의 관계)

| 스킬 | 연결점 | 예시 |
|------|--------|------|
| **Command of Evidence** | 근거 찾기 + 추론 | Inference의 증거 구조가 CoE의 "적절한 근거" 찾기와 연결 |
| **Words in Context** | 의도 파악 | Author Intent Inference와 단어의 맥락적 의미 연결 |
| **Text Structure** | 구조 이해 | Multi-Source Inference에서 텍스트 구조 파악 필수 |
| **Cross-Text** | 비교 추론 | 암묵적 비교/대조 추론 (단일 지문) |
| **Central Ideas** | 주제 파악 | 저자 의도 → 주제 도출 |

---

## 6. 검증 (표본 30개 분류)

**검증 샘플**: 실제 SAT 문제에서 추출한 Inference 30개
**분류 결과**: (구현 단계에서 추가)
**오분류율 목표**: < 10%
**경계 사례**: INF-2와 INF-3의 경계, INF-4와 INF-5의 경계

---

## 7. 버전 관리

| 버전 | 날짜 | 변경사항 |
|------|------|---------|
| 1.0 | 2026-05-11 | 초기 정의 (7개 sub-skill) |
