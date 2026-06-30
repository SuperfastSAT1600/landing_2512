# 스터디홀 내러티브 작성 기준 — v3

> 기반 코드: `src/lib/build-srm-report.ts` → `generateStudyHallNarrative()`
> v2와의 차이: 테스트센터 교차 참조 블록 + 코치 피드백 블록 + 2단 생성(AI 초안 → humanize 윤문) 추가

---

## 목적

학부모 포털에서 학생의 스터디홀 학습 세션을 AI가 2~3문장으로 요약해 보여주는 내러티브.
학부모가 숫자를 직접 해석하지 않아도 오늘 자녀가 어떤 상태인지, 다음 수업에서 무엇을 할지 파악할 수 있게 하는 것이 목표.

---

## 입력 시그니처

```ts
generateStudyHallNarrative(
  stats: {
    durationMinutes: number;   // 스터디홀 총 접속 시간 (분) — 날짜별 합산
    totalProblems:  number;    // 푼 문항 수 — 날짜별 합산
    correctCount:   number;    // 정답 수 — 날짜별 합산
    accuracy:       number;    // 정답률 0~100 정수 (totalProblems > 0일 때만 의미 있음)
    skills: StudyHallSkill[];  // 스킬별 배열
  },
  tcCrossRef?: SkillCrossRef[],  // 없으면 undefined — 교차 블록 통째로 생략
  coachFeedback?: string,        // 없으면 undefined — 피드백 블록 통째로 생략
): Promise<string>
```

```ts
type StudyHallSkill = {
  skill:   string;   // 영문 스킬명 (예: "Words in Context")
  domain:  string;   // "reading_and_writing" | "math" 등
  correct: number;
  total:   number;
};

type SkillCrossRef = {
  skill:       string;         // 도메인 레이블 ("RW" | "Math")
  shAccuracy:  number;         // 스터디홀 정답률 (날짜 전체 합산)
  tcAccuracy:  number | null;  // 테스트센터 정답률 (기록 없으면 null)
  gap:         number | null;  // shAccuracy - tcAccuracy (tcAccuracy null이면 null)
};
```

---

## 전처리 규칙

### 볼륨 분류 (`volumeCtx`)

| 조건 | 값 |
|------|----|
| `totalProblems < 15` | 짧은 연습 세션 |
| `totalProblems < 40` | 보통 세션 |
| `totalProblems ≥ 40` | 집중 세션 |

### 성취 분류 (`perfCtx`)

| 조건 | 값 |
|------|----|
| `accuracy ≥ 85` | 우수한 성취 |
| `accuracy ≥ 70` | 안정적인 수준 |
| `accuracy ≥ 50` | 보완이 필요한 구간 |
| `accuracy < 50`  | 기초 강화가 필요한 단계 |

### 스킬 정보

- **skillLines**: skills를 `total` 내림차순 정렬 → 상위 4개 → `스킬명(한국어): 정답/총문항 (정답률%)` → `|` 구분
- **weakestSkill**: skills가 2개 이상일 때만. 정답률(`correct/total`) 오름차순 정렬, 동점이면 `total` 많은 쪽 선택
- 스킬명 한국어 변환은 `SKILL_KO` 맵 사용 (맵에 없으면 영문 그대로)

### 문장 수 결정

```
isShortSession = totalProblems < 15 || skills.length === 0
sentenceGuide  = isShortSession && !hasCrossRef && !coachFeedback
                 ? "2문장으로 작성합니다."
                 : "3문장으로 작성합니다."
```

### 교차 참조 블록 — `tcCrossRef` 있을 때만 생성

```
[테스트센터 교차 — 최근 결과]
동일 영역 검증 정답률:
- {skill}: 스터디홀 {shAccuracy}% / {tcStr}{gapStr}
```

gap 레이블 규칙:
| 조건 | gapLabel |
|------|----------|
| `tcAccuracy === null` | 테스트센터 기록 없음 |
| `gap > 10` | 압박 하 적용 훈련 필요 |
| 그 외 | ±10%p 이내 → 안정적 |

tcStr:
- `tcAccuracy !== null` → `테스트센터 {tcAccuracy}%`
- null → `테스트센터 기록 없음`

gapStr (tcAccuracy !== null일 때): ` / 격차 {+/-}{gap}%p → {gapLabel}`

---

## 프롬프트

### System Prompt

```
당신은 SuperfastSAT 코치입니다.
학생의 스터디홀 학습 데이터를 분석해 학부모에게 전달하는 리포트를 작성합니다.

SuperfastSAT의 코칭 철학:
- SAT는 예측 가능한 패턴을 가진 시스템입니다. 코치는 정답률이 아니라 오류 유형으로 학습 상태를 진단합니다.
- 스터디홀은 연습 환경입니다. 테스트센터 결과와 비교했을 때 격차가 크면 연습은 됐지만 압박 하 적용이 안 된 것입니다.
- 코치가 제시한 방향이 있으면 리포트의 마지막은 그 계획을 학부모 언어로 전달합니다.

작성 규칙:
- 숫자를 나열하지 않습니다. 그 숫자가 의미하는 학습 상태를 해석합니다.
- 정답률 톤: 85% 이상 → 강점 강조 / 70~84% → 잘한 점과 보완점 균형 / 50~69% → 개선 방향 제시 / 50% 미만 → 흔들리는 부분을 지목하되 격려 톤 유지
- 취약 스킬이 있으면 반드시 그 스킬 이름을 문장에 포함합니다.
- [테스트센터 교차] 항목이 있으면 연습-검증 격차를 반드시 해석합니다.
- [코치 피드백] 항목이 있으면 마지막 문장은 반드시 그 피드백에 근거한 다음 수업 방향입니다.
- [코치 피드백]이 없으면 마지막 문장은 오늘 데이터에서 도출한 방향입니다.
- {sentenceGuide}
```

### User Content 템플릿

```
[오늘 스터디홀]
학습 시간: {durationMinutes}분 / {volumeCtx} / 총 {totalProblems}문항 / 정답 {correctCount}개 / 정답률 {accuracy}% [{perfCtx}]
스킬별 성취: {skillLines}                        ← skillLines 있을 때만
가장 취약한 스킬: {weakestSkill명} ({correct}/{total}문항)  ← skills 2개 이상일 때만

[테스트센터 교차 — 최근 결과]                    ← tcCrossRef 있을 때만 이 블록 전체
동일 영역 검증 정답률:
- {skill}: 스터디홀 {shAccuracy}% / {tcStr}{gapStr}

[코치 피드백 — 최근]                             ← coachFeedback 있을 때만 이 블록 전체
"{coachFeedback}"
```

### User Content 예시 — 풀 데이터 (3문장)

```
[오늘 스터디홀]
학습 시간: 47분 / 집중 세션 / 총 52문항 / 정답 38개 / 정답률 73% [안정적인 수준]
스킬별 성취: 문맥 속 어휘: 14/18문항 (78%) | 근거 활용: 10/14문항 (71%) | 연결어: 6/9문항 (67%)
가장 취약한 스킬: 연결어 (6/9문항)

[테스트센터 교차 — 최근 결과]
동일 영역 검증 정답률:
- RW: 스터디홀 73% / 테스트센터 61% / 격차 +12%p → 압박 하 적용 훈련 필요

[코치 피드백 — 최근]
"문맥 속 어휘에서 유사어 구별을 못하고 있음. 다음 수업은 보기 구조 분석부터 다시 잡을 예정."
```

### User Content 예시 — 짧은 세션, 데이터 부족 (2문장)

```
[오늘 스터디홀]
학습 시간: 12분 / 짧은 연습 세션 / 총 8문항 / 정답 7개 / 정답률 88% [우수한 성취]
스킬별 성취: 문맥 속 어휘: 8/8문항 (88%)
```

---

## 2단 생성 (AI 초안 → humanize 윤문)

1. **AI 초안 생성**: `gpt-4o-mini`, `max_tokens: 350`, `temperature: 0.3`
2. **humanize 윤문**: `humanizeNarrative()` 내부 호출
   - AI 번역투(~인 것입니다, ~할 수 있습니다, 이를 통해 등) 교정
   - 수치·스킬명·날짜 절대 변경 금지
   - 문장 수·의미 변경 금지, 격식체(합쇼체) 유지
   - `gpt-4o-mini`, `max_tokens: 400`, `temperature: 0.2`
3. raw가 빈 문자열이면 humanize 생략, 원문 반환

---

## 캐싱

테이블: `portal_narrative_cache`
키: `profile_id + report_date + item_type('study_hall') + input_hash`

캐시 입력(hashInput 대상):
```ts
{
  durationMinutes, totalProblems, correctCount, accuracy,
  skills: [...].sort((a,b) => a.skill.localeCompare(b.skill)).map(s => ({ skill, correct, total })),
  tcCrossRef, coachFeedback
}
```

같은 학습 데이터에는 재생성하지 않는다.

---

## 엣지 케이스

| 케이스 | 처리 |
|--------|------|
| `totalProblems === 0` | AI 호출 없이 `"${durationMinutes}분간 스터디홀에 접속했습니다."` 고정 반환 |
| `skills` 없음 | skillLines 생략, weakestSkill 없이 sentenceGuide = 2문장 |
| `skills` 1개 | weakestSkill 언급 생략 |
| `tcCrossRef` 빈 배열 | hasCrossRef = false → 교차 블록 생략 |
| 날짜별 세션 여러 개 | 시간·문항·정답·스킬 모두 날짜 기준 합산 후 1개 내러티브 |
| coachFeedback | `daily_reports`에서 최근 sent 리포트의 report_md 앞 500자 |

---

## 모델 설정 요약

| 단계 | model | max_tokens | temperature |
|------|-------|-----------|-------------|
| AI 초안 | gpt-4o-mini | 350 | 0.3 |
| humanize 윤문 | gpt-4o-mini | 400 | 0.2 |
