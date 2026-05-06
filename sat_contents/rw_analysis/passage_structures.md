# SAT RW 지문 구조 패턴 6종

> 1,527개 SAT RW 문제 지문을 CP(Content Point) 라벨링으로 분석한 결과  
> 모든 SAT RW 지문은 아래 6가지 구조 중 하나에 해당함

---

## 구조 패턴 분포 개요

| 패턴 | 한글명 | 문제 수 | 비율 | 주요 오답 |
|------|--------|--------|------|-----------|
| PURE_INFO | 순수 정보형 | 472 | 30.9% | Partial Match(27%), Distortion(18%) |
| INFO_TO_CONCL | 정보→결론형 | 401 | 26.3% | Out Of Scope(34%), Contradiction(20%) |
| CLAIM_EVIDENCE | 주장+근거형 | 492 | 32.2% | Out Of Scope(22%), Partial Match(22%) |
| CLASSICAL_ARG | 고전 논증형 | 61 | 4.0% | Out Of Scope(47%), Contradiction(16%) |
| COUNTER_REBUTTAL | 반박+재반박형 | 33 | 2.2% | Out Of Scope(44%), Contradiction(20%) |
| DUAL_CLAIM | 이중 주장형 | 68 | 4.5% | Out Of Scope(34%), Contradiction(16%) |

---

## 구조별 상세 분석

### 1. PURE_INFO — 순수 정보형 (472문제, 30.9%)

**정의**: 지문 전체가 사실·과정·정의·인과 설명. 저자의 가치 판단이나 주장 없음

**대표 Arc 시퀀스**:
- `EXP_I` (440개) — 설명형 정보
- `LIT_I` (29개) — 문학형 정보
- `ARG_I` (2개)

**대표 sequence_full 예시**:
```
EXP_I_bg-I        (배경 설명 → 핵심 정보)
EXP_I             (단일 정보 덩어리)
EXP_I_bg-I-I      (배경 → 정보 → 추가 정보)
```

**주요 오답**: Partial Match(27%) — 지문의 일부 정보만 담은 선지를 정답으로 오인

**수업 전략**:
- "이 지문이 설명하는 것이 무엇인가" = 핵심 정보(I) 파악
- 결론이나 주장이 없으므로 "저자 의도" 추론 함정 주의
- 정보 지문에서는 "범위"를 정확히 — Out of scope 함정도 많음

---

### 2. INFO_TO_CONCL — 정보→결론형 (401문제, 26.3%)

**정의**: 정보/사실을 제시한 뒤 결론 또는 함의를 도출하는 구조

**대표 Arc 시퀀스**:
- `EXP_I-CL` (326개) — 설명 후 결론
- `LIT_I-CL` (63개) — 문학형 서사 후 결론
- `ARG_I-CL` (9개) — 논증형 정보 후 결론

**대표 sequence_full 예시**:
```
EXP_I_bg-I-CL          (배경 → 정보 → 결론)
EXP_I_bg-I-I-CL        (배경 → 정보 → 정보 → 결론)
LIT_I_bg-I-CL          (문학 배경 → 서사 → 결론)
```

**주요 오답**: Out Of Scope(34%) — 결론보다 더 많은 것을 주장하는 선지

**수업 전략**:
- 마지막 문장(CL)이 핵심 — 결론의 범위를 정확히 파악
- "정보가 결론을 어떻게 지지하는가" 연결 관계 훈련
- Contradiction(20%) — 결론을 반대로 읽는 실수 주의

---

### 3. CLAIM_EVIDENCE — 주장+근거형 (492문제, 32.2%)

**정의**: 저자나 타인이 주장을 먼저 제시하고, 근거/정보로 뒷받침하는 구조

**대표 Arc 시퀀스**:
- `EXP_I-C` (97개) — 정보 후 주장
- `ARG_I-C` (73개) — 논증형 정보 후 저자 주장
- `ARG_C-CL` (62개) — 주장 후 결론
- `ARG_C-I-CL` (37개) — 주장 → 근거 → 결론

**대표 sequence_full 예시**:
```
ARG_C_au-CL_au          (저자 주장 → 저자 결론)
ARG_I_bg-C_au           (배경 → 저자 주장)
ARG_I_bg-C_au-CL_au     (배경 → 저자 주장 → 저자 결론)
```

**주요 오답**: Out Of Scope(22%), Partial Match(22%) — 균형 있게 분포

**수업 전략**:
- "주장이 먼저인가, 근거가 먼저인가"를 파악하는 것이 시작
- C_au(저자 주장) vs C_ot(타인 주장) 구분 — Misattribution 방지
- Command of Evidence 문제에서 가장 많이 등장하는 구조

---

### 4. CLASSICAL_ARG — 고전 논증형 (61문제, 4.0%)

**정의**: 주장 → 반박 → 재반박의 3단 논증 구조. 가장 복잡한 지문

**특징**:
- `C_au`, `C_ct`, `C_rb` 세 역할이 모두 존재
- 전환어(however, but, yet, nevertheless)가 핵심 구조 신호
- Hard 문제 비율이 높음

**주요 오답**: Out Of Scope(47%) — 가장 높은 비율

**수업 전략**:
- "저자가 결국 어느 입장인가"를 최종적으로 확인
- Pre-Pivot Reading 함정 가장 위험한 구조
- 반박(C_ct)을 저자 주장으로 오인하는 실수 방지

---

### 5. COUNTER_REBUTTAL — 반박+재반박형 (33문제, 2.2%)

**정의**: 기존 견해를 반박하고 새로운 견해를 제시하는 구조

**특징**:
- CLASSICAL_ARG와 유사하지만 재반박이 더 강조됨
- 학술 텍스트에서 자주 등장
- Hard 문제 집중도 높음

**주요 오답**: Out Of Scope(44%), Contradiction(20%)

**수업 전략**:
- "누가 누구의 견해를 반박하는가" 주체 추적이 핵심
- Misattribution 함정 주의
- 결론이 어디 있는지 먼저 찾는 훈련

---

### 6. DUAL_CLAIM — 이중 주장형 (68문제, 4.5%)

**정의**: 두 개의 주장이 대등하게 제시되거나 비교·대조되는 구조

**특징**:
- Cross-Text 문제(Text1 + Text2)가 여기에 해당하는 경우 많음
- `ARG_C` + `ARG_C` 형태로 두 관점이 공존
- 비교·대조 관계를 파악해야 함

**주요 오답**: Out Of Scope(34%), Contradiction(16%)

**수업 전략**:
- 두 주장의 관계(동의/반대/보완)를 명확히 파악
- Cross-Text에서는 Text1과 Text2 각각의 입장을 먼저 정리
- 어느 주장이 질문의 대상인지 확인

---

## 구조별 Hard 문제 비율

| 패턴 | Hard 집중 sequence 예시 | Hard% |
|------|------------------------|-------|
| PURE_INFO | `EXP_I_bg-I_sup-CL` | 63.6% |
| PURE_INFO | `EXP_I_bg-I-I-I-CL` | 42.9% |
| CLAIM_EVIDENCE | `ARG_C_ot-C_au` | 85.7% |
| CLAIM_EVIDENCE | `ARG_I_bg-C_au` | 35.5% |
| CLASSICAL_ARG | `ARG_C_au-CL_au` | 28.3% |

**Hard 문제가 많은 구조 특징**:
1. 정보 단계가 많을수록 Hard (I-I-I-CL)
2. 타인 주장 → 저자 주장 구조 (`C_ot-C_au`)가 특히 Hard
3. 보완 정보(`I_sup`) 포함 구조가 High-Hard

---

## CP 라벨 체계 (빠른 참조)

| 라벨 | 한글 | 의미 |
|------|------|------|
| `I_bg` | 배경 정보 | 지문 도입, 맥락 설정 |
| `I` | 정보 | 사실·데이터·정의·과정 |
| `I_sup` | 보완 정보 | 앞 내용을 보완·강화 |
| `I_ex` | 예시 | 구체적 사례 |
| `C_au` | 저자 주장 | 글쓴이의 핵심 입장 |
| `C_ot` | 타인 주장 | 인용된 타인의 입장 |
| `C_ct` | 반대 주장 | 저자 입장과 대립 |
| `C_rb` | 재반박 | 반박에 대한 재반박 |
| `CL_au` | 저자 결론 | 저자의 최종 귀결 |
| `CL_ot` | 타인 결론 | 타인의 최종 결론 |

---

*데이터 출처: `blog_database/baseline_cp_analysis.jsonl` + `blog_database/sat_rw_reference.json`*  
*분석 스크립트: `blog_database/gen_sat_rw_reference.py`*
