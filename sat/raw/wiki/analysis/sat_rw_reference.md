# SAT RW 지문 분석 레퍼런스
생성일: 2026-04-30 | 총 1,527개 문제 분석
---
## 1. 추상화 계층 (Abstraction Hierarchy)

| 레벨 | 이름 | 종류 수 | 설명 |
| --- | --- | --- | --- |
| L0 | structure_pattern | 6 | 글의 논리 골격 (CLASSICAL_ARG 등) |
| L1 | arc_collapsed | 96 | 역할 압축 + 연속 중복 제거 (I/C/CT/RB/CL) |
| L2 | sequence_simple | 203 | 접미사 제거 (I/C/CL만 남김) |
| L3 | sequence_full | 380 | 완전한 레이블 시퀀스 (접미사 포함) |

> **핵심 인사이트**: sequence_simple(L2)은 seq_full(384→207)을 거의 압축하지 못함. L1 arc_collapsed가 의미 있는 중간 단계.

## 2. 레이블 체계

### 2-1. CP 레이블 (sequence_full 구성 요소)

| 레이블 | 영문 | 한글 | 설명 |
| --- | --- | --- | --- |
| `I` | Information | 정보 | 정보 — 사실/관찰/데이터 |
| `I_bg` | Background Info | 배경 정보 | 배경 정보 — 주제 도입 배경 |
| `I_sup` | Supporting Info | 보완 정보 | 보완 정보 — 앞 주장/정보 보완 |
| `I_ex` | Example Info | 예시 정보 | 예시 정보 — 구체적 사례 |
| `I_au` | Author Info | 저자 정보 | 저자 정보 — 저자 관련 사실 |
| `I_ot` | Other's Info | 타인 정보 | 타인 정보 — 타인 관련 사실 |
| `C` | Claim | 주장 | 주장 — 의견/해석/입장 |
| `C_au` | Author's Claim | 저자 주장 | 저자 주장 — 글쓴이의 핵심 주장 |
| `C_ot` | Other's Claim | 타인 주장 | 타인 주장 — 타인의 주장 인용 |
| `C_ct` | Counter Claim | 반대 주장 | 반대 주장 — 저자 입장과 대립 |
| `C_rb` | Rebuttal Claim | 재반박 주장 | 재반박 — 반박에 대한 재반박 |
| `CL` | Conclusion | 결론 | 결론 — 논증 마무리 |
| `CL_au` | Author's Conclusion | 저자 결론 | 저자 결론 — 저자의 최종 결론 |
| `CL_ot` | Other's Conclusion | 타인 결론 | 타인 결론 — 타인의 최종 결론 |

### 2-2. Arc 역할 (arc_collapsed 구성 요소)

| Arc | 영문 | 한글 |
| --- | --- | --- |
| `I` | Information | 정보 |
| `C` | Claim | 주장 |
| `CL` | Conclusion | 결론 |
| `CT` | Counter-Thesis | 반대 주장 |
| `RB` | Rebuttal | 재반박 |

## 3. 구조 패턴 (Structure Pattern) 6종

| 패턴 | 한글 | 문제 수 | 주요 Arc | 주요 오답 |
| --- | --- | --- | --- | --- |
| `PURE_INFO` | 순수 정보형 | 472 | EXP_I(440), LIT_I(29), ARG_I(2) | Partial Match(27.3%), Distortion(18.0%) |
| `INFO_TO_CONCL` | 정보→결론형 | 401 | EXP_I-CL(326), LIT_I-CL(63), ARG_I-CL(9) | Out Of Scope(33.7%), Contradiction(19.8%) |
| `CLAIM_EVIDENCE` | 주장+근거형 | 492 | EXP_I-C(96), ARG_I-C(70), ARG_C-CL(62) | Out Of Scope(22.3%), Partial Match(21.6%) |
| `CLASSICAL_ARG` | 고전 논증형 | 61 | ARG_C-CL(21), LIT_I-C-CL(5), ARG_I-C-CL(4) | Out Of Scope(46.7%), Contradiction(16.3%) |
| `COUNTER_REBUTTAL` | 반박+재반박형 | 33 | ARG_C-CL(6), ARG_C(6), ARG_I-C(2) | Out Of Scope(43.5%), Contradiction(20.3%) |
| `DUAL_CLAIM` | 이중 주장형 | 68 | ARG_C(29), ARG_C-I-C(13), ARG_C-I(3) | Out Of Scope(33.5%), Contradiction(16.1%) |

## 4. 오답 카테고리 8종

| 카테고리 | 한글 | 설명 |
| --- | --- | --- |
| Partial Match | 부분 일치 | 지문 내용 일부만 반영, 전체 주장 왜곡 |
| Out Of Scope | 범위 초과 | 지문에 없는 내용, 범위 초과 |
| Contradiction | 모순 | 지문 내용과 직접 모순 |
| Distortion | 왜곡 | 지문 내용을 과장·축소·비틀기 |
| Misattribution | 귀인 오류 | 주체 혼동 (저자 vs 타인) |
| Pre-Pivot Reading | 전환 전 독해 | 전환점 이전 내용만 읽은 오답 |
| Overgeneralization | 과잉 일반화 | 특정 사례를 과잉 일반화 |
| Degree Error | 정도 오류 | 강도·빈도 표현 오류 (always vs sometimes) |

## 5. Hard 집중 시퀀스 Top 14

Hard 문제 ≥5개 보유 시퀀스: 21종

| 시퀀스 | 한글명 | 전체 | Hard | Hard% | 주요 오답 |
| --- | --- | --- | --- | --- | --- |
| `EXP_I_bg-I` | 설명형: 배경→정보 | 206 | 62 | 30.1% | Partial Match(27.5%), Contradiction(19.1%) |
| `EXP_I_bg-I-CL` | 설명형: 배경→정보→결론 | 143 | 43 | 30.1% | Contradiction(24.8%), Out Of Scope(24.4%) |
| `EXP_I` | 설명형: 정보 | 85 | 29 | 34.1% | Partial Match(30.5%), Misattribution(22.7%) |
| `EXP_I_bg-I-I-CL` | 설명형: 배경→정보→정보→결론 | 58 | 20 | 34.5% | Out Of Scope(35.8%), Contradiction(17.2%) |
| `EXP_I-I` | 설명형: 정보→정보 | 46 | 16 | 34.8% | Partial Match(30.3%), Misattribution(22.5%) |
| `ARG_C_au-CL_au` | 논증형: 저자주장→저자결론 | 53 | 15 | 28.3% | Contradiction(26.2%), Distortion(20.6%) |
| `ARG_I_bg-C_au` | 논증형: 배경→저자주장 | 31 | 11 | 35.5% | Partial Match(33.3%), Misattribution(20.0%) |
| `EXP_I_bg-I-I-I-CL` | 설명형: 배경→정보→정보→정보→결론 | 21 | 9 | 42.9% | Out Of Scope(35.4%), Partial Match(20.8%) |
| `LIT_I_bg-C_au` | 문학형: 배경→저자주장 | 34 | 8 | 23.5% | Partial Match(59.0%), Distortion(16.9%) |
| `LIT_I_bg-I-CL` | 문학형: 배경→정보→결론 | 22 | 7 | 31.8% | Partial Match(27.1%), Distortion(22.9%) |
| `ARG_C_au` | 논증형: 저자주장 | 18 | 7 | 38.9% | Partial Match(28.6%), Misattribution(28.6%) |
| `EXP_I_bg-I_sup-CL` | 설명형: 배경→보완→결론 | 11 | 7 | 63.6% | Out Of Scope(47.6%), Contradiction(38.1%) |
| `ARG_C_ot-C_au` | 논증형: 타인주장→저자주장 | 7 | 6 | 85.7% | Partial Match(27.8%), Out Of Scope(16.7%) |
| `ARG_I_bg-C_au-CL_au` | 논증형: 배경→저자주장→저자결론 | 16 | 6 | 37.5% | Out Of Scope(31.6%), Contradiction(21.1%) |

## 6. Arc Collapsed 상위 30개

| Arc 시퀀스 | 문제 수 |
| --- | --- |
| `EXP_I` | 440 |
| `EXP_I-CL` | 326 |
| `EXP_I-C` | 97 |
| `ARG_C-CL` | 89 |
| `ARG_I-C` | 73 |
| `LIT_I-CL` | 63 |
| `ARG_C` | 55 |
| `LIT_I-C` | 52 |
| `ARG_C-I-CL` | 37 |
| `ARG_I-C-CL` | 35 |
| `ARG_C-I` | 30 |
| `LIT_I` | 29 |
| `LIT_I-C-CL` | 23 |
| `EXP_I-C-CL` | 20 |
| `ARG_C-I-C` | 15 |
| `ARG_I-CL` | 9 |
| `LIT_C-CL` | 9 |
| `EXP_I-C-I` | 8 |
| `EXP_I-C-I-CL` | 8 |
| `ARG_I-C-I-CL` | 6 |
| `LIT_I-C-I-CL` | 5 |
| `LIT_C-I` | 5 |
| `EXP_C-I` | 4 |
| `LIT_I-C-I` | 4 |
| `LIT_C` | 3 |
| `ARG_I-C-I-C-CL` | 3 |
| `ARG_I-C-I` | 3 |
| `ARG_C-I-C-CL` | 3 |
| `LIT_C-I-C-I-CL` | 2 |
| `ARG_C-I-C-I` | 2 |

## 7. 오답 패턴 × 난이도

| 난이도 | 1위 오답 | 2위 오답 | 3위 오답 |
| --- | --- | --- | --- |
| Easy | Out Of Scope(20.9%) | Contradiction(20.9%) | Partial Match(18.8%) |
| Medium | Out Of Scope(27.3%) | Partial Match(18.1%) | Contradiction(17.4%) |
| Hard | Out Of Scope(23.4%) | Partial Match(21.1%) | Contradiction(17.2%) |

## 8. 오답 패턴 × Skill

| Skill | 1위 오답 | 2위 오답 |
| --- | --- | --- |
| Evidence | Partial Match(35.4%) | Contradiction(25.0%) |
| Boundaries | Partial Match(49.5%) | Distortion(26.9%) |
| Sense | Misattribution(56.1%) | Partial Match(20.3%) |
| Transitions | Pre-Pivot Reading(38.5%) | Contradiction(32.7%) |
| Purpose | Out Of Scope(55.2%) | Partial Match(11.4%) |
| Details | Out Of Scope(57.5%) | Contradiction(16.4%) |
| Context | Distortion(43.6%) | Contradiction(34.1%) |
| Inferences | Out Of Scope(64.7%) | Contradiction(14.0%) |
| Connections | Out Of Scope(50.0%) | Distortion(18.5%) |
| Transitions | Contradiction(66.7%) | Pre-Pivot Reading(19.0%) |

## 9. 빈출 시퀀스 Top 20

| 시퀀스 | 한글명 | 문제 수 | Easy/Medium/Hard |
| --- | --- | --- | --- |
| `EXP_I_bg-I` | 설명형: 배경→정보 | 206 | E:89 M:55 H:62 |
| `EXP_I_bg-I-CL` | 설명형: 배경→정보→결론 | 143 | E:56 M:44 H:43 |
| `EXP_I` | 설명형: 정보 | 85 | E:33 M:23 H:29 |
| `EXP_I_bg-I-I-CL` | 설명형: 배경→정보→정보→결론 | 58 | E:22 M:16 H:20 |
| `ARG_C_au-CL_au` | 논증형: 저자주장→저자결론 | 53 | E:20 M:18 H:15 |
| `EXP_I-I` | 설명형: 정보→정보 | 46 | E:16 M:14 H:16 |
| `LIT_I_bg-C_au` | 문학형: 배경→저자주장 | 34 | E:10 M:16 H:8 |
| `ARG_I_bg-C_au` | 논증형: 배경→저자주장 | 31 | E:11 M:9 H:11 |
| `EXP_I_bg-I-I` | 설명형: 배경→정보→정보 | 30 | E:19 M:7 H:4 |
| `LIT_I_bg-I-CL` | 문학형: 배경→정보→결론 | 22 | E:7 M:8 H:7 |
| `EXP_I_bg-I_sup` | 설명형: 배경→보완 | 21 | E:7 M:9 H:5 |
| `EXP_I_bg-I-I-I-CL` | 설명형: 배경→정보→정보→정보→결론 | 21 | E:5 M:7 H:9 |
| `ARG_C_au` | 논증형: 저자주장 | 18 | E:7 M:4 H:7 |
| `EXP_I_bg` | 설명형: 배경 | 18 | E:8 M:5 H:5 |
| `ARG_I_bg-C_au-CL_au` | 논증형: 배경→저자주장→저자결론 | 16 | E:2 M:8 H:6 |
| `EXP_I_bg-I-C_au` | 설명형: 배경→정보→저자주장 | 16 | E:6 M:5 H:5 |
| `ARG_C_au-C_au` | 논증형: 저자주장→저자주장 | 15 | E:6 M:4 H:5 |
| `EXP_I_bg-C_ot` | 설명형: 배경→타인주장 | 12 | E:5 M:3 H:4 |
| `EXP_I_bg-C` | 설명형: 배경→주장 | 12 | E:4 M:2 H:6 |
| `EXP_I_bg-I_sup-CL` | 설명형: 배경→보완→결론 | 11 | E:2 M:2 H:7 |

---
*이 문서는 `gen_sat_rw_reference.py`로 자동 생성됩니다.*
