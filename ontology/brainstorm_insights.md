# SAT RW 온톨로지 브레인스토밍 인사이트

**날짜**: 2026-04-19  
**기반**: 7개 카테고리 확정 + 1,511문제 분류 완료 후 메타 분석

---

## 핵심 패러다임 전환 3개

### Shift 1: 카테고리 감지 능력 = RW 점수

기존 프레임: "각 카테고리를 잘 풀 수 있는 능력을 키운다"  
새 프레임: **"문제를 보는 순간 카테고리가 즉각 식별되는 상태"가 목표**

오류 패턴의 대부분은 카테고리 오분류에서 시작된다.  
VALIDATE 문제를 NAME으로 오분류한 학생은 아무리 정교한 NAME 전략을 써도 도움이 안 된다.

→ **진단 테스트 UI에 "이 문제 유형을 먼저 고르세요" 단계 추가 필요**  
`[정답/오답] × [카테고리 정확/오분류]` 2×2 매트릭스 데이터 수집

---

### Shift 2: 7개 카테고리 = 3개 인지 레이어

```
레이어 1 — 규칙 적용 (Rule-Application)
  APPLY: 의미 추론 없음, 순수 규칙 매핑
  → 의미론적 역량과 무관. 별도 훈련 경로.

레이어 2 — 단일 텍스트 추론 (Single-Text Reasoning)
  NAME / RETRIEVE / INFER / VALIDATE / BUILD
  → 공통 기반: 하나의 텍스트 내 논리 공간 모델링

레이어 3 — 다중 텍스트 추론 (Multi-Text Reasoning)
  RECONCILE: 두 개의 별도 논리 공간을 연결
```

학생 진단 → 레이어 배치 → 해당 레이어 훈련 순서의 스캐폴딩 커리큘럼.  
레이어 1이 불안정한 학생에게 레이어 2 훈련을 하는 것은 낭비.

---

### Shift 3: SAT RW = "논리 공간 재구성 능력"의 단일 측정

7개 카테고리는 **하나의 역량(논리 공간 모델링)의 7가지 측정 각도**다.

- NAME: "이 논리 공간에서 이 역할의 이름은?"
- INFER: "이 논리 공간의 빈 결론 슬롯은?"
- VALIDATE: "이 논리 공간에서 이 주장을 채우는 증거 슬롯은?"
- RECONCILE: "두 논리 공간의 교점은?"

---

## 즉시 실행 가능한 다음 단계

1. **카테고리별 난이도 분포 분석** (즉시 가능)
   - `ontology/all_questions_categorized.jsonl` + difficulty 필드
   - Hard 문제가 어느 카테고리에 집중되는지 → 점수 상한 결정 병목 카테고리 발견

2. **카테고리 오분류 데이터 수집 인프라** (진단 테스트 UI)
   - 학생이 카테고리를 먼저 선택한 뒤 문제를 풀게 하는 단계 추가
   - Shift 1 가설 검증: 오분류 → 오답 비율 > 정분류 → 오답 비율

3. **3-레이어 진단 커리큘럼 설계**
   - APPLY → NAME/RETRIEVE/INFER/VALIDATE/BUILD → RECONCILE 순서 스캐폴딩

---

## 연결 파일

- `ontology/FINAL_SUMMARY.md` — 전체 분석 요약
- `ontology/error_patterns.md` — 카테고리별 오류 패턴 (EP-N1 ~ EP-A5)
- `ontology/all_questions_categorized.jsonl` — 1,511문제 카테고리 태깅
- `ontology/category_draft.md` — 7개 카테고리 MECE 정의
