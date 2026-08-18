# SAT RW 난이도별 분포 및 Hard 집중 전략

> 1,527개 문제의 난이도 분포 + Hard 문제 집중 패턴 분석

---

## 전체 난이도 분포

| 난이도 | 문제 수 | 비율 |
|--------|--------|------|
| Easy | 약 480개 | ~31% |
| Medium | 약 590개 | ~39% |
| Hard | 약 457개 | ~30% |

---

## 난이도별 오답 패턴

| 난이도 | 1위 오답 | 2위 오답 | 3위 오답 |
|--------|---------|---------|---------|
| Easy | Out Of Scope(21%) | Contradiction(21%) | Partial Match(19%) |
| Medium | Out Of Scope(27%) | Partial Match(18%) | Contradiction(17%) |
| Hard | Out Of Scope(23%) | Partial Match(21%) | Contradiction(17%) |

**핵심 인사이트**:
- Out Of Scope는 모든 난이도에서 1~2위 — 난이도 무관한 보편 함정
- Hard로 갈수록 Out Of Scope 비율이 높아지지 않음 → Hard 문제의 어려움은 "범위 초과"가 아니라 **지문 구조 복잡성** + **단어 난이도**에서 옴

---

## Hard 문제 집중 지문 구조

Hard 문제 비율이 높은 sequence 패턴 Top 14:

| 시퀀스 | Hard수 | Hard% | 주요 오답 |
|--------|--------|-------|-----------|
| `ARG_C_ot-C_au` | 6/7 | **85.7%** | Partial Match, Out Of Scope |
| `EXP_I_bg-I_sup-CL` | 7/11 | **63.6%** | Out Of Scope(48%), Contradiction(38%) |
| `EXP_I_bg-I-I-I-CL` | 9/21 | **42.9%** | Out Of Scope(35%), Partial Match(21%) |
| `ARG_C_au` | 7/18 | **38.9%** | Partial Match, Misattribution |
| `ARG_I_bg-C_au` | 11/31 | **35.5%** | Partial Match(33%), Misattribution(20%) |
| `EXP_I` | 29/85 | **34.1%** | Partial Match(31%), Misattribution(23%) |
| `EXP_I-I` | 16/46 | **34.8%** | Partial Match(30%), Misattribution(23%) |
| `EXP_I_bg-I-I-CL` | 20/58 | **34.5%** | Out Of Scope(36%), Contradiction(17%) |
| `ARG_I_bg-C_au-CL_au` | 6/16 | **37.5%** | Out Of Scope(32%), Contradiction(21%) |
| `EXP_I_bg-I` | 62/206 | **30.1%** | Partial Match(28%), Contradiction(19%) |
| `EXP_I_bg-I-CL` | 43/143 | **30.1%** | Contradiction(25%), Out Of Scope(24%) |
| `ARG_C_au-CL_au` | 15/53 | **28.3%** | Contradiction(26%), Distortion(21%) |
| `LIT_I_bg-C_au` | 8/34 | **23.5%** | Partial Match(59%), Distortion(17%) |

---

## Hard 문제가 어려운 이유 (구조별 분석)

### 1. 타인 주장 → 저자 주장 구조 (`ARG_C_ot-C_au`, 85.7% Hard)
- 두 가지 다른 입장이 존재 → 누가 저자인지 파악 어려움
- Misattribution 함정이 설계되어 있음
- **수업 전략**: 문장 시작 시 인용 신호어(according to, X argues, X claims) 확인

### 2. 보완 정보 포함 구조 (`EXP_I_bg-I_sup-CL`, 63.6% Hard)
- I_sup(보완 정보)이 중간에 끼어들어 핵심 흐름을 끊음
- Out Of Scope(48%)와 Contradiction(38%) 동시 높음
- **수업 전략**: CL(결론)을 먼저 읽고 거슬러 올라가는 전략

### 3. 정보 누적 구조 (`EXP_I_bg-I-I-I-CL`, 42.9% Hard)
- 정보 단계가 3개 이상 — 어느 정보가 결론을 지지하는지 불명확
- Out Of Scope(35%) — 특정 정보만 반영한 선지가 매력적
- **수업 전략**: I 단계들이 CL을 어떻게 지지하는지 관계도 그리기

### 4. 단일 저자 주장 (`ARG_C_au`, 38.9% Hard)
- 지문 전체가 저자 주장 하나 — 근거 구분이 없어서 전체 파악 어려움
- Partial Match(29%), Misattribution(29%)
- **수업 전략**: 주장의 범위를 정확히 — 얼마나, 어느 상황에서

---

## 단어 난이도와 Hard 상관관계

vocab_master.json에서 Hard 비율이 높은 단어들:

| 단어 | Hard 비율 | master_score |
|------|-----------|--------------|
| audience | 100% | 8.838 |
| unearthed | 100% | 6.136 |
| consumption | 100% | 8.782 |
| financial | 100% | 8.571 |
| regarded | 100% | 8.570 |
| challenges | 100% | 9.351 |
| producing | 100% | 7.325 |
| simplicity | 100% | 6.960 |
| preferred | 100% | 6.960 |

**해석**: Hard 비율 100%인 단어 = Hard 문제에만 등장하는 단어.  
이 단어들을 모르면 Hard 문제는 원천적으로 접근 불가.

---

## Hard 대비 학습 우선순위

1. **구조 인식**: `ARG_C_ot-C_au` 패턴에서 저자 주장 파악
2. **단어**: Hard 비율 높은 blank_fill 단어 우선 암기
3. **오답 훈련**: Out Of Scope + Partial Match가 Hard의 핵심 함정
4. **스킬별**: Transitions(Pre-Pivot), Words in Context(Distortion) 집중 훈련

---

## 문제 수 기준 스킬별 분포 (참고)

| 스킬 | Easy | Medium | Hard | 합계 |
|------|------|--------|------|------|
| Central Ideas & Details | 약 33 | 45 | 38 | ~116 |
| Command of Evidence | 약 70 | 77 | 98 | ~245 |
| Inferences | 약 20 | 40 | 57 | ~117 |
| Words in Context | 약 123 | 53 | 50 | ~226 |
| Text Structure & Purpose | 약 41 | 37+52 | 47 | ~177 |
| Cross-Text Connections | 약 16 | 19 | 19 | ~54 |
| Transitions | 약 71 | 57 | 38 | ~166 |
| Boundaries | 약 55 | 48 | 77 | ~180 |
| Form, Structure & Sense | 약 77 | 43 | 47 | ~167 |

*Boundaries와 Command of Evidence가 Hard 비율 가장 높음*

---

*데이터 출처: `blog_database/sat_rw_reference.json` + `blog_database/vocab_master.json`*
