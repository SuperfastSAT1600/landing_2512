# Test Center Report — Prompt Handoff (v4.3)

> 코드 기준: `src/lib/build-srm-report.ts` → `generateTestCenterNarrative()` (reportVersion: 4)
> v4.3 변경: test_center_unit_attempts 행동 데이터(시간·확신도) 적극 활용

## 목적

학부모 포털에서 학생의 테스트 센터 세션 결과를 AI가 2~3문장으로 요약해 보여주는 내러티브.
전체 정확도보다 모듈 간 흐름(상승·유지·하락)을 읽어 다음 수업에서 어떤 파트를 리뷰해야 하는지 방향을 제시하는 것이 목표.

---

## 호출 위치

`src/lib/build-srm-report.ts` → `generateTestCenterNarrative()`

---

## 입력 데이터 구조 (v4.3)

```ts
{
  curriculumTitle?: string;   // 커리큘럼 제목 (예: "Digital SAT Full Test #3")
  curriculumDomain?: string;  // "reading_and_writing" | "math" | 기타
  totalScore: number;         // 전체 정답 수
  totalProblems: number;      // 전체 문항 수
  lessons: Array<{
    title?: string;           // 모듈 제목 (예: "Module 1 - Easy")
    score: number;
    total: number;
    skills?: Array<{
      skill: string; domain: string; correct: number; total: number;
      totalSeconds: number;    // v4.3 신규 — 스킬별 총 소요 시간
      confidentWrong: number;  // v4.3 신규 — confidence≥75% 오답 건수 (확신 오류)
      stuckCount: number;      // v4.3 신규 — 느린 오답 건수 (개념 공백)
      impulsiveCount: number;  // v4.3 신규 — 빠른 오답 건수 (압박 하 충동적 선택)
    }>;
  }>;
  skills?: Array<{ skill: string; domain: string; correct: number; total: number }>;   // 세션 전체 합산 (cross-ref용)
}
```

추가 파라미터:
- `shCrossRef?: SkillCrossRef[]` — 스터디홀 교차 참조 (도메인별 연습-검증 격차)
- `coachFeedback?: string` — 최근 수업 피드백 (최대 500자)
- `vocabContext?: { missedTerms: string[]; masteredTerms: string[] }` — 최근 7일 단어 학습

### 입력 전처리 (프롬프트 직전)

| 변수 | 계산 방법 |
|------|-----------|
| `accuracy` | `Math.round((totalScore / totalProblems) * 100)` |
| `perfCtx` | ≥85 → "우수" / ≥70 → "양호" / <70 → "보완 필요" |
| `domainLabel` | curriculumDomain 변환 → lesson 문항 수 추론(27→RW, 22→Math) fallback |
| `lessonBlocks` | 모듈별 `제목: score/total (pct%)` + 스킬 상세 (정답률 낮은 순 상위 4개, **v4.3**: 평균 소요 시간·행동 힌트 포함) |
| `trendNote` | **풀렝스(RW+Math) 제외**하고 lessons ≥ 2개일 때만. 임계값 **12%p** |
| `weakModuleLines` | 전체 accuracy 대비 **10%p 이상 낮은 모듈** 사전 계산 — LLM에게 추론 맡기지 않음 |

**모듈 정렬**: RW(27문) 먼저, 같은 도메인 내 모듈 번호 오름차순

**문장 수 결정**:
- `isInfoPoor`(커리큘럼 제목 없음 + 모듈 ≤1 + crossRef 없음 + skills 없음) → 2문장
- 그 외 → 3문장

### User content 구성 (v4.3)

```
[오늘 테스트센터]
테스트: {curriculumTitle} ({domainLabel})
총점: {totalScore}/{totalProblems} ({accuracy}%) [{perfCtx}]
[모듈별 결과]
{lessonBlock with skill detail + 평균 N초/문항 + [확신 오류 N건 / 막힌 패턴 N건 / 성급한 오답 N건]}
흐름: {trendNote}
약한 모듈 (평균보다 10%p 이상 낮음): {weakModuleLines}
가장 취약한 스킬 (세션 전체): {weakest.skill} ({correct}/{total})

[스터디홀 교차 — 최근 결과]    ← shCrossRef 있을 때만
[최근 단어 학습 — 최근 7일]    ← vocabContext + RW 세션일 때만
[코치 피드백 — 최근]           ← coachFeedback 있을 때만
```

---

## 프롬프트 특징 (v4.3)

- **SuperfastSAT 코칭 철학** 블록 포함: 학습 사이클(레슨→스터디홀→테스트센터), 모듈2 적응형 구조 설명
- **도메인 제약**: Math 세션 → RW/단어 언급 절대 금지 / RW 세션 → [단어 학습] 없으면 어휘 언급 금지
- **풀렝스 모드**: RW+Math 동시 포함 시 두 영역 모두 분석
- **약한 모듈 지목 기준 명시**: [약한 모듈] 항목에 나온 모듈만 지목 (없으면 지목 안 함)
- **스킬 귀속 명시**: 모듈별 스킬은 해당 모듈 소속임을 LLM에 명시
- **행동 데이터 해석 가이드** (v4.3 신규):
  - `확신 오류 N건` → confidence≥75%로 틀린 패턴 → "확신을 갖고 틀렸습니다. 방향 자체를 점검해야"
  - `막힌 패턴 N건` → 느린 오답(stuck) → 개념 공백
  - `성급한 오답 N건` → 빠른 오답(impulsive) → 압박 하 충동적 선택
- **종결 어미**: "~예정입니다" → "~집중합니다/~다룹니다/~이어갑니다" 현재형 강제
- 후처리: `humanizeNarrative()` 윤문 패스 적용

### Model 설정

| 항목 | 값 |
|------|----|
| model | `gpt-4o-mini` |
| max_tokens | `420` |
| temperature | `0.3` |

---

## 캐싱

`portal_narrative_cache` 테이블에 `profile_id + report_date + item_type('test_center') + input_hash`로 upsert.

**캐시 키 구성 요소**: `{ curriculumTitle, curriculumDomain, totalScore, totalProblems, lessons(title/score/total + skills(correct/total/totalSeconds/confidentWrong/stuckCount/impulsiveCount)), skills(sorted), shCrossRef, coachFeedback, vocabContext }`

---

## 엣지 케이스

| 케이스 | 현재 처리 |
|--------|-----------|
| totalProblems === 0 | AI 호출 건너뜀, `aiNarrative = undefined` |
| lessons 1개 | trendNote 생성 안 함 |
| 풀렝스 테스트(RW+Math) | trendNote 생략, 두 영역 모두 분석 |
| curriculumTitle 없음 + lessons ≤1 | isInfoPoor → 2문장 |
| curriculumDomain 없음 | lesson 문항 수로 추론(27→RW, 22→Math) |
| 같은 날 세션 여러 개 | 세션별 각각 내러티브 생성 |
| curriculum_id 없는 attempt | curriculumTitle/Domain = undefined |

---

## 데이터 흐름 (v4.3)

```
test_center_lesson_attempts (per lesson)
  └─ test_center_unit_attempts (per unit)   select: is_correct, time_spent_seconds, confidence_level   ← v4.3 확장
  └─ test_center_session (started_at → KST date)
  └─ lessons (lesson_id → title)
  └─ curricula (curriculum_id → title, domain)
  └─ units (unit_id → skill, domain)

→ tcSessionMedianMap: 세션별 median 소요 시간 계산 (행동 분류 기준선)   ← v4.3 신규
→ tcSkillsByLessonAttempt: 레슨별 스킬 집계 + totalSeconds/confidentWrong/stuckCount/impulsiveCount   ← v4.3 확장
→ tcBySession: { lessons[with TCSkillBehavior], curriculumTitle, curriculumDomain, skills }
→ 레슨 정렬(RW→Math, 모듈 번호순)
→ shCrossRef 계산 (도메인별 SH↔TC 격차)
→ weakModuleLines 사전 계산
→ generateTestCenterNarrative() 호출 (lessonBlocks에 행동 힌트 포함)
→ humanizeNarrative() 윤문
→ setCachedNarrative() 저장
→ DayReport.items에 TestCenterDay로 push
```

---

## 미해결 이슈

1. **Math TC + RW 코치피드백 교차 오염** — 같은 날 Math TC와 RW TC가 함께 있을 때 날짜 기준 피드백이 두 세션에 모두 붙음. 해결 방향 검토 중 (도메인 필터 또는 RW 쪽에만 붙이기)
2. **스킬명 한글 매핑** — 현재 영문 그대로 노출. 학부모 친화도 검토 필요
