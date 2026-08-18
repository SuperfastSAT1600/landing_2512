# SAT RW 필수 단어 — 유형별 분류

> vocab_master.json 기반 (2026-05-01)  
> 전체 5,704개 → 고신뢰도 2,059개 → Top 300 핵심

---

## 단어 선정 근거 요약

"이 단어를 왜 외워야 하는가"에 대한 4중 통계적 근거:

| 근거 | 설명 | 데이터 |
|------|------|--------|
| v1: 구조적 위치 | SAT 지문의 주장·결론 위치(C_au/CL_au)에 출현 | 3,924개 |
| v2: Hard 집중도 | Hard 문제에서의 출현 비율이 높음 (composite_score) | 2,094개 |
| v3: 오답 역산 | 이 단어가 있는 문장에서 학생들이 자주 틀림 | 2,066개 |
| v4: LLM 검증 | GPT-4o-mini가 "이 문장 이해에 필수"라고 직접 지목 | 694개 |
| choices: 보기 직접 출현 | 실제 A/B/C/D 보기에 그 단어가 등장 | 3,225개 |

**master_score 공식**:
```
composite×3 + anchor×2 + log(llm+1)×0.5 + confidence×0.1 + log(blank_fill+1)×2.0
```

---

## 유형 1: 빈칸형 보기 단어 (blank_fill) — 1,029개

> 가장 중요. A/B/C/D 보기에 단어 자체가 들어가는 문제 (Words in Context 등)  
> 이 단어를 모르면 보기를 읽어도 무슨 뜻인지 몰라서 못 풂

### 빈칸형 최다 출현 Top 30

| 단어 | 보기 출현 횟수 | master_score | Hard 비율 |
|------|--------------|--------------|-----------|
| contrast | 25회 | 6.616 | 50% |
| instance | 22회 | 10.831 | 50% |
| addition | 16회 | 9.694 | 40% |
| comparison | 13회 | 5.278 | 0% |
| conclusion | 10회 | 5.096 | 0% |
| earlier | 10회 | 4.896 | 40% |
| contrary | 8회 | 7.005 | 50% |
| unearthed | 8회 | 6.136 | 100% |
| previously | 6회 | 12.521 | 62% |
| themselves | 5회 | 11.087 | 57% |
| audience | 5회 | 8.838 | 100% |
| producing | 5회 | 7.325 | 100% |
| introduced | 5회 | 6.659 | 100% |
| extensive | 5회 | 6.659 | 100% |
| skeptical | 5회 | 3.884 | 0% |
| invented | 4회 | 7.660 | 67% |
| famous | 4회 | 7.585 | 40% |
| simplicity | 4회 | 6.960 | 100% |
| preferred | 4회 | 6.960 | 100% |
| dominant | 4회 | 6.456 | 75% |
| collaborated | 4회 | 6.456 | 75% |
| depicted | 4회 | 6.456 | 50% |
| contested | 4회 | 5.957 | 50% |
| clarify | 4회 | 5.957 | 25% |
| reject | 4회 | 5.957 | 25% |
| ambiguous | 3회 | 6.362 | 67% |
| acknowledge | 3회 | 6.362 | 67% |
| undermine | 3회 | 6.362 | 67% |
| critique | 3회 | 6.362 | 33% |
| prevalent | 3회 | 5.863 | 67% |

---

## 유형 2: 구조 위치 기반 단어 (v1~v3 고신뢰도)

> 지문의 핵심 주장·결론 문장에서 추출된 단어  
> 3개 이상 분석 방법이 동시에 선정한 고신뢰도 단어 2,059개 중 상위

### master_score Top 20 (지문 구조 + Hard + 오답 복합)

| 단어 | score | 버전수 | 빈칸형 | Hard% | 주요 오답 |
|------|-------|--------|--------|-------|-----------|
| influence | 13.835 | 4 | O | 56% | Out Of Scope |
| behavior | 13.259 | 3 | - | 90% | Partial Match |
| previously | 12.521 | 3 | O | 62% | Contradiction |
| themselves | 11.087 | 3 | O | 57% | Distortion |
| instance | 10.831 | 3 | O | 50% | Partial Match |
| economic | 10.680 | 2 | - | 88% | Distortion |
| interactions | 9.736 | 4 | - | 71% | Partial Match |
| analysis | 9.711 | 3 | - | 55% | Contradiction |
| addition | 9.694 | 3 | O | 40% | Out Of Scope |
| challenges | 9.351 | 3 | - | 100% | Contradiction |
| government | 9.290 | 3 | - | 83% | Misattribution |
| independence | 9.238 | 4 | - | 80% | Out Of Scope |
| increases | 9.209 | 3 | O | 67% | Out Of Scope |
| phenomenon | 9.168 | 4 | - | 80% | Contradiction |
| audience | 8.838 | 3 | O | 100% | Out Of Scope |
| consumption | 8.782 | 4 | - | 100% | Out Of Scope |
| emerged | 8.692 | 3 | O | 50% | Out Of Scope |
| developing | 8.678 | 4 | O | 80% | Out Of Scope |
| contrary | 7.005 | 3 | O | 50% | Out Of Scope |
| protagonist | 7.369 | 3 | O | 60% | Distortion |

---

## 유형 3: LLM 직접 지목 단어 (v4) — 694개

> GPT-4o-mini가 Hard/Medium 지문의 핵심 주장 문장에서 "모르면 이해 불가"로 지목  
> 규칙 기반으로 놓치는 복합 개념어, 논증 동사 포함

**v4에만 있는 대표 단어 (다른 버전에 없는 단어)**:
- 논증 동사: posit, contend, refute, corroborate, assert
- 추상 명사: efficacy, nuance, premise, trajectory, paradigm
- 평가 형용사: plausible, negligible, robust, viable, salient

---

## Top 300 파일 위치

→ `sat_contents/vocabulary/vocab_master_top300.json`  
→ `sat_contents/datasets/vocab_master.json` (전체 5,704개)

### Top 300 구성 비율
- 빈칸형 보기 포함 단어: Top 300 중 약 40%
- 4개 버전 모두 등장: 최우선 암기 대상
- Hard 비율 80% 이상: 고난도 집중 단어

---

## 수업 활용 가이드

### 단어 암기 우선순위
1. **blank_fill 단어** — 보기에 직접 나오는 단어. 모르면 그냥 못 풂
2. **4개 버전 교집합** — 구조 위치 + Hard 집중 + 오답 연결 + LLM 모두 선정
3. **v3 오답 연결 단어** — 이 단어가 있는 지문에서 학생들이 특정 함정에 빠짐

### 단어 학습 방법 근거
- 단순 빈도 암기 아님 → "이 단어가 논증의 어느 위치에서 쓰이는가"와 함께 학습
- 오답 패턴 연계: 예) `corroborate` → Misattribution 함정 많음 → "누가 확증하는가" 주의
- 실제 SAT 지문에서 추출된 예문으로 학습

---

*데이터 출처: `blog_database/vocab_master.json` / `vocab_master_top300.json`*
