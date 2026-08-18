# 테스트센터 내러티브 작성 기준 — v3

> 기반 코드: `src/lib/build-srm-report.ts` → `generateTestCenterNarrative()`
> v2와의 차이: 스터디홀 교차 참조 블록 + 코치 피드백 블록 + 2단 생성(AI 초안 → humanize 윤문) 추가

---

## 목적

학부모 포털에서 학생의 테스트 센터 세션 결과를 AI가 2~3문장으로 요약해 보여주는 내러티브.
전체 정확도보다 모듈 간 흐름(상승·유지·하락)을 읽어 다음 수업에서 어떤 파트를 리뷰해야 하는지 방향을 제시하는 것이 목표.

---

## 입력 시그니처

```ts
generateTestCenterNarrative(
  stats: {
    curriculumTitle?:  string;           // 커리큘럼 제목 — 없을 수 있음
    curriculumDomain?: string;           // "reading_and_writing" | "math" 등 — 없을 수 있음
    totalScore:        number;           // 전체 정답 수
    totalProblems:     number;           // 전체 문항 수
    lessons: TestCenterLesson[];         // 모듈별 배열
  },
  shCrossRef?: SkillCrossRef[],         // 없으면 undefined — 교차 블록 통째로 생략
  coachFeedback?: string,               // 없으면 undefined — 피드백 블록 통째로 생략
): Promise<string>
```

```ts
type TestCenterLesson = {
  title?: string;   // 모듈 제목 (예: "Module 1 - Easy") — 없을 수 있음
  score:  number;   // 해당 모듈 정답 수
  total:  number;   // 해당 모듈 문항 수
};

type SkillCrossRef = {
  skill:       string;         // 도메인 레이블 ("RW" | "Math")
  shAccuracy:  number;         // 스터디홀 정답률 (전체 합산, 0이면 연습 기록 없음)
  tcAccuracy:  number | null;  // 오늘 테스트센터 정답률
  gap:         number | null;  // shAccuracy - tcAccuracy (shAccuracy === 0이면 null)
};
```

---

## 전처리 규칙

### 성취 분류 (`perfCtx`)

| 조건 | 값 |
|------|----|
| `accuracy ≥ 85` | 우수 |
| `accuracy ≥ 70` | 양호 |
| `accuracy < 70`  | 보완 필요 |

`accuracy = Math.round((totalScore / totalProblems) * 100)`

### 도메인 레이블 (`domainLabel`)

우선순위: `curriculumDomain` 변환 → lesson 제목 추론 → 생략

| curriculumDomain 값 | domainLabel |
|---------------------|-------------|
| `reading_and_writing` | RW |
| `math` | Math |
| 기타 | 원문 그대로 |
| 없음 | lesson 제목 추론: "math" 포함 → Math / "reading·writing·rw" 포함 → RW / 그 외 → undefined |

### 모듈 흐름 (`trendNote`) — lessons ≥ 2개일 때만

첫 모듈 정답률(`accs[0]`)과 마지막 모듈 정답률(`accs[last]`) 차이로 판정.
`TC_TREND_THRESHOLD = 0.12` (12%p)

| 조건 | trendNote |
|------|-----------|
| `last - first > 0.12` | 후반 모듈로 갈수록 성취가 올라가는 상승 흐름 |
| `first - last > 0.12` | 후반 모듈에서 정확도가 떨어지는 흐름 |
| 그 외 | 모듈 간 일관된 성취 |

### 문장 수 결정

```
isInfoPoor = !curriculumTitle && lessons.length <= 1 && !hasCrossRef
sentenceGuide = isInfoPoor
                ? "2문장으로 작성합니다."
                : "3문장으로 작성합니다."
```

### 스터디홀 교차 블록 — `shCrossRef` 있을 때만 생성

```
[스터디홀 교차 — 최근 결과]
오늘 테스트 영역의 연습 기록:
- {skill}: 스터디홀 {shAccuracy}% / {tcStr}{gapStr}
```

gap 레이블 규칙:
| 조건 | gapLabel |
|------|----------|
| `shAccuracy === 0` | 스터디홀 기록 없음 → 연습 없이 검증에 노출 |
| `gap > 10` (shAcc > 0) | 압박 하 적용 훈련 필요 |
| 그 외 | 안정적 |

gapStr (shAccuracy > 0일 때): ` / 격차 {+/-}{gap}%p → {gapLabel}`
gapStr (shAccuracy === 0일 때): ` → 스터디홀 기록 없음 → 연습 없이 검증에 노출`

---

## 프롬프트

### System Prompt

```
당신은 SuperfastSAT 코치입니다.
학생의 테스트센터 결과를 분석해 학부모에게 전달하는 리포트를 작성합니다.

SuperfastSAT의 코칭 철학:
- 테스트센터는 검증 환경입니다. 스터디홀 연습과 비교했을 때 격차가 크면 연습은 됐지만 실전 적용이 안 된 것입니다.
- 전체 정답률보다 모듈 간 흐름이 중요합니다. 어디서 무너지는지가 다음 수업의 방향을 결정합니다.
- 코치가 우려했던 부분이 오늘 결과에서 확인됐는지, 아니면 개선됐는지를 학부모에게 전달합니다.

작성 규칙:
- 전체 정답률이 아니라 모듈 흐름과 무너지는 지점을 중심으로 해석합니다.
- 평균 정답률보다 10%p 이상 낮은 모듈이 있으면 그 모듈을 구체적으로 지목합니다.
- 커리큘럼 제목이 있으면 반드시 언급합니다.
- [스터디홀 교차] 항목이 있으면 연습-검증 격차를 반드시 해석합니다.
- [코치 피드백] 항목이 있으면 마지막 문장은 반드시 그 피드백에 근거한 다음 수업 방향입니다.
- [코치 피드백]이 없으면 마지막 문장은 오늘 결과에서 도출한 방향입니다.
- {sentenceGuide}
```

### User Content 템플릿

```
[오늘 테스트센터]
테스트: {curriculumTitle} ({domainLabel})           ← curriculumTitle 없으면 이 줄 생략
총점: {totalScore}/{totalProblems} ({accuracy}%) [{perfCtx}]
모듈별: {lessonLines}                               ← lessons 있을 때
흐름: {trendNote}                                   ← lessons ≥ 2개일 때만
전체 평균 {accuracy}% 기준 — 10%p 이상 낮은 모듈을 약한 모듈로 판정

[스터디홀 교차 — 최근 결과]                         ← shCrossRef 있을 때만 이 블록 전체
오늘 테스트 영역의 연습 기록:
- {skill}: 스터디홀 {shAccuracy}% / {tcStr}{gapStr}

[코치 피드백 — 최근]                                ← coachFeedback 있을 때만 이 블록 전체
"{coachFeedback}"
```

`lessonLines` 생성: `lessons.map((l, i) => "${l.title ?? 'Module '+(i+1)}: ${l.score}/${l.total} (${pct}%)")".join(' | ')`

### User Content 예시 — 풀 데이터 (3문장)

```
[오늘 테스트센터]
테스트: Digital SAT RW Practice #5 (RW)
총점: 38/54 (70%) [양호]
모듈별: Module 1 - Easy: 22/27 (81%) | Module 2 - Hard: 16/27 (59%)
흐름: 후반 모듈에서 정확도가 떨어지는 흐름
전체 평균 70% 기준 — 10%p 이상 낮은 모듈을 약한 모듈로 판정

[스터디홀 교차 — 최근 결과]
오늘 테스트 영역의 연습 기록:
- RW: 스터디홀 78% / 테스트센터 70% / 격차 +8%p → 안정적

[코치 피드백 — 최근]
"Module 2에서 시간이 부족한 것 같음. 다음 수업은 Hard 모듈 시간 배분 전략을 다룰 예정."
```

### User Content 예시 — 정보 부족 세션 (2문장)

```
[오늘 테스트센터]
총점: 8/10 (80%) [양호]
모듈별: Module 1: 8/10 (80%)
전체 평균 80% 기준 — 10%p 이상 낮은 모듈을 약한 모듈로 판정
```

### User Content 예시 — 연습 기록 없이 검증 노출

```
[오늘 테스트센터]
테스트: Digital SAT Math #2 (Math)
총점: 22/44 (50%) [보완 필요]
모듈별: Module 1: 14/22 (64%) | Module 2: 8/22 (36%)
흐름: 후반 모듈에서 정확도가 떨어지는 흐름
전체 평균 50% 기준 — 10%p 이상 낮은 모듈을 약한 모듈로 판정

[스터디홀 교차 — 최근 결과]
오늘 테스트 영역의 연습 기록:
- Math: 스터디홀 0% → 스터디홀 기록 없음 → 연습 없이 검증에 노출
```

---

## 2단 생성 (AI 초안 → humanize 윤문)

1. **AI 초안 생성**: `gpt-4o-mini`, `max_tokens: 380`, `temperature: 0.3`
2. **humanize 윤문**: `humanizeNarrative()` 내부 호출
   - AI 번역투(~인 것입니다, ~할 수 있습니다, 이를 통해 등) 교정
   - 수치·스킬명·커리큘럼명·날짜 절대 변경 금지
   - 문장 수·의미 변경 금지, 격식체(합쇼체) 유지
   - `gpt-4o-mini`, `max_tokens: 400`, `temperature: 0.2`
3. raw가 빈 문자열이면 humanize 생략, 원문 반환

---

## 캐싱

테이블: `portal_narrative_cache`
키: `profile_id + report_date + item_type('test_center') + input_hash`

캐시 입력(hashInput 대상):
```ts
{
  curriculumTitle, curriculumDomain,
  totalScore, totalProblems,
  lessons: lessons.map(l => ({ title: l.title, score: l.score, total: l.total })),
  shCrossRef, coachFeedback
}
```

하루에 같은 세션 결과가 바뀌지 않으면 재생성하지 않는다.

---

## 교차 참조 계산 로직

테스트센터 → 스터디홀 교차 참조는 세션의 도메인(curriculumDomain 또는 lesson 제목 추론)을 기준으로
날짜 전체 스터디홀 합산 정답률과 비교한다.

```
inferredDomain = curriculumDomain
  ? normalizeDomain(curriculumDomain)   // 'RW' | 'Math' | null
  : inferDomainFromLessons(lessons)      // lesson 제목에서 추론

shStat = shDomainStats.get(inferredDomain)   // 전체 날짜 합산
shAcc  = shStat.total > 0 ? round(shStat.correct / shStat.total * 100) : 0
tcAcc  = totalProblems > 0 ? round(totalScore / totalProblems * 100) : null
gap    = shAcc > 0 && tcAcc !== null ? shAcc - tcAcc : null
```

---

## 엣지 케이스

| 케이스 | 처리 |
|--------|------|
| `totalProblems === 0` | AI 호출 없이 `aiNarrative = undefined` — 화면에 내러티브 없음 |
| lessons 1개 | trendNote 생성 안 함, 흐름 줄 생략 |
| `curriculumTitle` 없음 | 제목 줄 생략, lessons ≤ 1 + 교차 없음이면 2문장 |
| `curriculumDomain` 없음 | lesson 제목 추론 → 그래도 없으면 domainLabel 생략 |
| 같은 날 세션 여러 개 | 세션별로 각각 내러티브 생성 → DayReport.items 배열에 복수 노출 |
| `shCrossRef` 빈 배열 | hasCrossRef = false → 교차 블록 생략 |
| curriculum_id 없는 attempt | curriculumTitle/Domain = undefined로 처리 |

---

## 모델 설정 요약

| 단계 | model | max_tokens | temperature |
|------|-------|-----------|-------------|
| AI 초안 | gpt-4o-mini | 380 | 0.3 |
| humanize 윤문 | gpt-4o-mini | 400 | 0.2 |
