# Study Hall Report — Prompt Handoff (v4.3)

> 코드 기준: `src/lib/build-srm-report.ts` → `generateStudyHallNarrative()` (reportVersion: 4)
> v4.3 변경: confidence_level → confidentWrong / uncertainCorrect 분류, behaviorBlock에 확신도 데이터 추가

## 목적

학부모 포털에서 학생의 스터디홀 학습 세션을 AI가 2~3문장(또는 3단락)으로 요약해 보여주는 내러티브.
학부모가 숫자를 직접 해석하지 않아도 오늘 자녀가 어떤 상태인지 파악할 수 있게 하는 것이 목표.

---

## 호출 위치

`src/lib/build-srm-report.ts` → `generateStudyHallNarrative()`

---

## 입력 데이터 구조 (v4.3)

```ts
{
  durationMinutes: number;
  totalProblems: number;
  correctCount: number;
  accuracy: number;          // 0~100 정수
  skills: Array<{
    skill: string;
    domain: string;
    correct: number;
    total: number;
    totalSeconds?: number;   // v4.2 신규 — 평균 소요 시간 계산용
    quadrants?: {            // v4.2 신규 — 행동 패턴 분류
      fluency: number;       // 빠른 정답 (체화)
      effortful: number;     // 느린 정답 (노력형)
      impulsive: number;     // 빠른 오답 (충동적)
      stuck: number;         // 느린 오답 (깊은 혼란)
    };
    confidence?: {           // v4.3 신규 — 확신도 분류
      confidentCorrect: number;   // confidence≥75% + 정답
      confidentWrong: number;     // confidence≥75% + 오답 (확신 오류 — 가장 위험)
      uncertainCorrect: number;   // confidence<50% + 정답 (불확실 정답 — 아직 미체화)
    };
  }>;
}
```

추가 파라미터:
- `tcCrossRef?: SkillCrossRef[]` — 테스트센터 교차 참조 (도메인별 연습-검증 격차)
- `coachFeedback?: string` — 최근 수업 피드백 (최대 500자)
- `edenInsight?: { strengths, weaknesses, intentions }` — Eden 대화 분석 인사이트
- `vocabContext?: { missedTerms, masteredTerms }` — 최근 7일 단어 학습
- `skillKnowledgeMap?: Map<string, { definition, errorTypes }>` — skill_prompts DB에서 로드한 스킬 지식

### 입력 전처리 (프롬프트 직전)

| 변수 | 계산 방법 |
|------|-----------|
| `skillLines` | total 내림차순 상위 4개 → `스킬: total문항 중 correct문항 정답 (acc%)(평균Ns/문항)` |
| `weakestSkill` | 정답률 오름차순, **동점이면 total 많은 쪽** (skills ≥ 2개일 때만) |
| `perfCtx` | ≥85 → "우수한 성취" / ≥70 → "안정적인 수준" / ≥50 → "보완이 필요한 구간" / <50 → "기초 강화가 필요한 단계" |
| `behaviorBlock` | 각 스킬의 quadrant 집계: 지배적 패턴 + 건수 + **v4.3**: 확신 오류/불확실 정답 건수 → `[행동 패턴 분석 — quadrant]` 블록 |
| `skillKnowledgeBlock` | 취약 스킬의 definition + errorTypes → `[스킬 지식 — 취약 스킬 참고]` 블록 |

**Compact 모드 조건**: `totalProblems < 5` → 무조건 2문장 / `totalProblems < 15 || skills.length === 0` + crossRef/coachFeedback/edenInsight 없음 → 2문장

### User content 구조 (v4.3 — 3섹션 분리)

```
[전체 수치 — 첫째 단락에서만 사용]
{durationMinutes}분 / {totalProblems}문항 / 정답 {correctCount}개 / 정답률 {accuracy}%

[스킬별 성취 — 둘째 단락에서만 사용]
{skillLines}
★ 가장 취약: {weakestSkill}
[테스트센터 교차 — 최근 결과]    ← tcCrossRef 있을 때
[Eden 대화 인사이트]              ← edenInsight 있을 때
[최근 단어 학습 — 최근 7일]      ← vocabContext + !isMathSession + WiC 있을 때
[행동 패턴 분석 — quadrant]      ← quadrants 집계 있을 때
[스킬 지식 — 취약 스킬 참고]     ← skillKnowledgeMap + Eden 인사이트 없을 때 해석 근거

[코치 피드백 — 셋째 단락에서만 사용]    ← coachFeedback 있을 때
"{coachFeedback}"
```

---

## 프롬프트 특징 (v4.3)

- **SuperfastSAT 코칭 철학** 블록 포함 (학습 사이클, 오류 유형 진단, 연습-검증 구분)
- **3단락 구조**: 첫째(수치 1문장) → 둘째(스킬 분석 2~3문장) → 셋째(방향 1문장)
- **오류 유형 해석 우선순위**: Eden 인사이트 → skill_prompts 지식 → 수치만으로 서술
- **Quadrant 해석 가이드**: fluency(체화됨) / effortful(자동화 전) / impulsive(성급한 적용) / stuck(방식 자체 점검 필요)
- **확신도 해석 가이드** (v4.3 신규):
  - `확신 오류(confidentWrong)` → "확신을 갖고 틀린 패턴이 N건. 방향 자체가 어긋나 있어 다음 수업에서 짚어야"
  - `불확실 정답(uncertainCorrect ≥ 정답의 50%)` → "맞추긴 했지만 아직 확신 없는 단계. 체화 완료로 쓰지 않음"
- **도메인 제약**: Math 전용 세션 → 단어/어휘/WiC 언급 절대 금지
- **종결 어미**: "~예정입니다" → "~집중합니다/~다룹니다/~이어갑니다" 현재형 강제
- 후처리: `humanizeNarrative()` 윤문 패스 적용 (SAT 시험 형식 설명 제거 포함)

### Model 설정

| 항목 | 값 |
|------|----|
| model | `gpt-4o-mini` |
| max_tokens | `200`(compact) / `600`(full) |
| temperature | `0.3` |

---

## Quadrant 분류 기준 (v4.2 신규)

세션별 median 소요 시간을 기준선으로 사용 (`medianOf(sessionTimes)`).

| is_correct | time_spent > median × 1.5 | quadrant |
|-----------|---------------------------|----------|
| true | false | fluency (빠른 정답 — 체화) |
| true | true | effortful (느린 정답 — 노력형) |
| false | false | impulsive (빠른 오답 — 충동적) |
| false | true | stuck (느린 오답 — 깊은 혼란) |

## 확신도 분류 기준 (v4.3 신규)

`study_hall_unit_attempts.confidence_level` (0/25/50/75/100) 기반.

| confidence_level | is_correct | 분류 |
|-----------------|-----------|------|
| ≥ 75 | true | confidentCorrect (자신 있게 맞춤) |
| ≥ 75 | false | **confidentWrong (확신 오류 — 가장 위험)** |
| 0~49 | true | uncertainCorrect (불확실 정답 — 아직 미체화) |
| 기타 | - | 미분류 |

`behaviorBlock` 출력 조건:
- confidentWrong > 0 → 항상 표시
- uncertainCorrect > 0 AND (uncertainCorrect / correct ≥ 0.5) → 표시

---

## 캐싱

`portal_narrative_cache` 테이블에 `profile_id + report_date + item_type('study_hall') + input_hash`로 upsert.

**캐시 키 구성 요소**: `{ durationMinutes, totalProblems, correctCount, accuracy, skills(sorted by skill name, includes totalSeconds+quadrants), tcCrossRef, coachFeedback, edenInsight, vocabContext }`

> 주의: confidence 데이터는 현재 캐시 키에 포함되지 않음 (confidence_level은 수집되지만 캐시 키에서 제외 — 추후 포함 검토 필요).

---

## 엣지 케이스

| 케이스 | 현재 처리 |
|--------|-----------|
| totalProblems === 0 | AI 호출 없이 `"${분}분간 스터디홀에 접속했습니다."` 고정 반환 |
| totalProblems < 5 | compact 2문장 (무조건) |
| skills 없음 | skillLines 빈 문자열, weakestSkill null |
| skills 1개 | weakestSkill 언급 생략 |
| 동점 취약 스킬 | total 많은 쪽 선택 (stable) |
| Math 전용 세션 | 단어/어휘/WiC 관련 내용 완전 제거 |
| Eden 인사이트 있음 | skill_prompts 지식 블록 생략 (인사이트 우선) |
| 하루에 세션 여러 개 | 날짜별 합산 (totalMinutes, problems, correctCount, skillMap, quadrants, confidence 누적) |

---

## 미해결 이슈

1. **스킬 이름 영문 노출** — "Words in Context" 등 영문 그대로. 한글 매핑 테이블 추가 검토 필요
2. **다음 수업 커리큘럼 컨텍스트** — 현재 AI가 자유 생성. 실제 다음 수업 스킬 정보 연결 시 더 구체화 가능
3. **정답률 <50% 톤** — "기초 강화가 필요한 단계" 표현이 불안 유발 가능. 학부모 반응 기반 재검토 필요
