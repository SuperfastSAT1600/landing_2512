# 포스팅 타입 확장: vocab / quiz 추가 개발 컨텍스트

이 문서는 **기존에 완성된 article 포스팅 시스템**에
`vocab`(단어 암기)과 `quiz`(문제 풀이) 두 타입을 추가할 때
Claude가 참고하는 개발 컨텍스트입니다.

"처음부터 만드는 설계"가 아닙니다.
기존 코드가 어떻게 동작하는지 파악하고,
**최소한의 변경으로 새 타입을 끼워 넣는 것**이 목표입니다.

---

## 기존 시스템 현황

### 스택

- **프론트엔드**: Next.js (Supabase + 별도 프론트엔드)
- **DB**: Supabase (PostgreSQL)
- **포스팅 원천**: Ghost 블로그 → Supabase posts 테이블로 관리

### 기존 posts 테이블 스키마 (변경 금지)

```
id               VARCHAR  PK   URL slug
title            TEXT          제목
content          TEXT          본문 (마크다운/HTML)
date             DATE          발행일
category         TEXT          카테고리
excerpt          TEXT          요약
featured_image   TEXT          대표 이미지 URL
feature_image    TEXT          대표 이미지 URL (병존 필드 — 두 필드 모두 유지)
author           TEXT          작성자
tags             TEXT[]        태그 배열
is_published     BOOLEAN       발행 여부
access_code      VARCHAR(6)    게이트 코드 (NULL이면 공개)
meta_title       TEXT          SEO 타이틀
```

위 필드들은 기존 article 렌더링 코드와 연결되어 있습니다.
**이름 변경·삭제·타입 변경 금지.**

### 기존 동작 흐름 (article)

```
Supabase posts 테이블
  → Next.js 페이지에서 id(slug)로 단건 조회
  → content(HTML/마크다운)를 렌더링
  → access_code가 있으면 코드 입력 게이트 표시
```

---

## 추가할 것

### 1. posts 테이블에 컬럼 3개 추가

기존 컬럼은 그대로 두고, 아래 3개만 추가합니다.

```sql
ALTER TABLE posts
  ADD COLUMN post_type   TEXT    DEFAULT 'article'
                         CHECK (post_type IN ('article', 'vocab', 'quiz')),
  ADD COLUMN vocab_data  JSONB   DEFAULT NULL,
  ADD COLUMN quiz_data   JSONB   DEFAULT NULL;
```

**마이그레이션 안전성:**
- `post_type DEFAULT 'article'` — 기존 row 전부 자동으로 'article'이 됩니다. 기존 코드 영향 없음.
- `vocab_data`, `quiz_data` — NULL 허용이므로 기존 row에 영향 없음.

**타입별 필드 사용 원칙:**

| post_type | vocab_data | quiz_data |
|-----------|-----------|-----------|
| article   | NULL      | NULL      |
| vocab     | JSON 있음 | NULL      |
| quiz      | NULL      | JSON 있음 |

---

### 2. vocab_data JSON 구조

`vocab` 타입 포스팅에서 `vocab_data` 필드에 저장하는 JSON입니다.
프론트엔드는 이 JSON을 읽어 플래시카드 UI를 렌더링합니다.

```json
{
  "cards": [
    {
      "id": 1,
      "word": "corroborate",
      "part_of_speech": "v.",
      "definition": "확인하다, 뒷받침하다",
      "example_sentence": "The new data corroborated the scientist's original hypothesis.",
      "example_translation": "새 데이터가 과학자의 원래 가설을 뒷받침했다.",
      "sat_context": "주장-근거 구조 지문에서 근거의 역할을 묻는 문제에 자주 등장",
      "difficulty": "hard"
    }
  ]
}
```

**필드 정의:**

| 필드 | 필수 | 타입 | 설명 |
|------|------|------|------|
| `id` | Y | number | 카드 순서 (1부터) |
| `word` | Y | string | 영어 단어 |
| `part_of_speech` | Y | string | 품사 (`v.` / `n.` / `adj.` / `adv.`) |
| `definition` | Y | string | 한국어 뜻 |
| `example_sentence` | Y | string | 예문 |
| `example_translation` | Y | string | 예문 번역 |
| `sat_context` | Y | string | SAT 출제 맥락 한 줄 |
| `difficulty` | Y | string | `easy` / `medium` / `hard` |

---

### 3. quiz_data JSON 구조

`quiz` 타입 포스팅에서 `quiz_data` 필드에 저장하는 JSON입니다.
프론트엔드는 이 JSON을 읽어 문제 풀이 UI를 렌더링합니다.

```json
{
  "pass_score": 4,
  "questions": [
    {
      "id": 1,
      "type": "multiple_choice",
      "passage": "Researchers studying the migratory patterns of monarch butterflies...",
      "question": "Which choice best states the main idea of the text?",
      "choices": {
        "A": "Monarch butterflies rely exclusively on solar cues for navigation.",
        "B": "The 2023 study showed that solar navigation is primary.",
        "C": "Magnetic field detection plays no role in butterfly migration.",
        "D": "The navigational abilities of butterflies remain poorly understood."
      },
      "correct_answer": "B",
      "explanation": {
        "correct": "B가 정답입니다. 지문은 태양 나침반이 우선한다는 결론을 내립니다...",
        "why_A_wrong": "'exclusively'가 과도합니다. 지문은 자기장을 완전히 부정하지 않습니다.",
        "why_C_wrong": "자기장이 '아무 역할도 하지 않는다'는 내용은 지문에 없습니다.",
        "why_D_wrong": "2023 연구가 오히려 해답을 제시했습니다.",
        "strategy_tip": "강도 수식어(exclusively, only)가 있는 선택지는 지문보다 세면 오답입니다."
      },
      "difficulty": "medium",
      "skill": "Main Idea"
    }
  ]
}
```

**최상위 필드:**

| 필드 | 필수 | 타입 | 설명 |
|------|------|------|------|
| `pass_score` | Y | number | 합격 기준 정답 수. 이 점수 이상이면 unlock 콘텐츠 공개 |
| `questions` | Y | array | 문제 배열 |

**questions 배열 항목:**

| 필드 | 필수 | 타입 | 설명 |
|------|------|------|------|
| `id` | Y | number | 문제 번호 (1부터) |
| `type` | Y | string | `multiple_choice` 또는 `grid_in` |
| `passage` | N | string | 지문 (지문 있는 문제만) |
| `question` | Y | string | 질문 |
| `choices` | 조건부 | object | `multiple_choice`일 때 필수. A/B/C/D 키 |
| `correct_answer` | Y | string | 정답 (`"A"` ~ `"D"` 또는 숫자 문자열) |
| `explanation` | Y | object | 해설 객체 |
| `difficulty` | Y | string | `easy` / `medium` / `hard` |
| `skill` | Y | string | SAT 스킬명 |

**explanation 객체:**

| 필드 | 필수 | 설명 |
|------|------|------|
| `correct` | Y | 정답 이유 (지문 근거 포함) |
| `why_A_wrong` ~ `why_D_wrong` | 조건부 | 오답인 선택지에 대해서만 작성 |
| `strategy_tip` | Y | 이 유형 일반에 적용 가능한 전략 1가지 |

---

## 프론트엔드에서 처리해야 할 것

기존 포스팅 페이지 컴포넌트가 `post_type`을 읽어 분기합니다.
아래는 **추가해야 할 로직**만 기술합니다. 기존 article 렌더링 코드는 건드리지 않습니다.

### post_type 분기

```
post_type === 'article'  →  기존 렌더링 그대로
post_type === 'vocab'    →  기존 본문 렌더링 + VocabCard 컴포넌트 추가
post_type === 'quiz'     →  기존 본문 렌더링 + QuizBlock 컴포넌트 추가
```

### VocabCard 컴포넌트 동작

- `vocab_data.cards` 배열을 받아 플래시카드 UI 렌더링
- 카드 클릭 → 앞면(단어) / 뒷면(뜻 + 예문 + sat_context) 토글
- 이전/다음 버튼으로 카드 이동
- 현재 카드 번호 / 전체 카드 수 표시 (예: `3 / 20`)
- 상태는 컴포넌트 내부 state로만 관리 (DB 저장 불필요)

### QuizBlock 컴포넌트 동작

- `quiz_data.questions` 배열을 받아 문제 순서대로 렌더링
- 한 번에 문제 1개씩 표시 (이전 문제 정답 제출 후 다음 문제 활성화)
- 선택지 클릭 → 제출 → 즉시 채점 + `explanation` 공개
- 전체 문제 완료 후 획득 점수 표시
- 획득 점수 ≥ `pass_score`이면 → unlock 콘텐츠 섹션 표시
- 획득 점수 < `pass_score`이면 → "다시 도전" 버튼 (처음부터 재시작)
- 상태는 컴포넌트 내부 state로만 관리 (DB 저장 불필요)

### unlock 콘텐츠 처리

`content` 필드 HTML 안에 아래 마커로 감싼 구간이 있습니다.

```html
<!-- [QUIZ_UNLOCK_CONTENT] -->
<p>모든 문제를 통과했다면...</p>
<!-- [/QUIZ_UNLOCK_CONTENT] -->
```

QuizBlock이 pass 판정을 내리기 전까지 이 구간을 `display: none` 처리합니다.
pass 판정 시 표시합니다. (마커 파싱은 프론트엔드 담당)

---

## 데이터 입력 방식 (콘텐츠 작성 측)

새 타입 포스팅 작성 시 Supabase에 직접 insert하거나
기존 관리 도구가 있다면 그 도구에서 아래 필드를 추가로 입력합니다.

**vocab 포스팅 입력 항목:**
- 기존 공통 필드 (`title`, `content`, `date`, `category` 등) — 기존과 동일
- `post_type` = `"vocab"`
- `vocab_data` = JSON (위 구조)

**quiz 포스팅 입력 항목:**
- 기존 공통 필드 — 기존과 동일
- `post_type` = `"quiz"`
- `quiz_data` = JSON (위 구조)
- `content` 안에 필요한 경우 `<!-- [QUIZ_UNLOCK_CONTENT] -->` 마커 삽입

---

## 작업 순서 (다음 대화에서 개발 진행 시)

1. **Supabase 마이그레이션** — `ALTER TABLE` 3개 컬럼 추가
2. **VocabCard 컴포넌트** 구현
3. **QuizBlock 컴포넌트** 구현
4. **포스팅 페이지 분기 로직** 추가 (`post_type` 읽어서 컴포넌트 조건부 렌더링)
5. **unlock 콘텐츠 마커 파싱** 유틸 함수 추가
6. 기존 article 동작 **회귀 테스트**

---

## 확인이 필요한 것 (개발 시작 전)

아래 항목은 기존 코드를 직접 봐야 확정할 수 있습니다.
개발 대화 시작 시 관련 파일을 공유하거나 구조를 설명해 주세요.

- 기존 포스팅 페이지 컴포넌트 경로 및 구조
- `content` 렌더링 방식 (dangerouslySetInnerHTML, MDX, 기타)
- 기존 관리 도구(어드민) 유무 — 있으면 `post_type`·`vocab_data`·`quiz_data` 입력 UI도 추가 필요
- `featured_image` / `feature_image` 두 필드 병존 이유 — 신규 타입에서 어느 필드를 사용할지
