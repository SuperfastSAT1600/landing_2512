# 강원FC 숙제 시스템 v2 (Unit 2부터 적용)

## Overview

강원FC U-18 영어 인터뷰 수업의 숙제 구조를 개선한다.
학습 효과가 낮은 REWATCH를 단어 암기로 교체하고, 문장 반복 쓰기를 추가하여 암기 훈련을 강화한다.
RECORD(녹음 파일 제출)는 제거한다. Unit 2부터 적용.

**변경 요약**:
- 제거: REWATCH, RECORD
- 추가: VOCAB (단어 플래시카드 — v2 voca study mode 방식)
- 추가: SENTENCES (주요 문장 변형 쓰기 — 문장당 5개 변형 + 한글 뜻)
- 유지: PREPARE (빈칸 채우기 4개)

새 순서: VOCAB → SENTENCES → PREPARE (3 Steps)

---

## Requirements

### REQ-001: VOCAB 단어 플래시카드 (REWATCH 대체)
- **Priority**: Must
- **Description**: 인터뷰 영상에서 나온 주요 단어/표현을 플래시카드 방식으로 암기한다. 앞면 영어, 뒷면 한글 뜻. 모든 카드를 넘기면 완료. v2 voca study mode와 동일한 플립 카드 UX를 HTML 인라인으로 구현한다.
- **Acceptance Criteria**:
  - Unit 2 단어 목록 (최소 8개)이 플래시카드로 표시된다
  - 카드 탭/클릭 시 한글 뜻으로 뒤집힌다
  - "알았어요 / 다시 볼게요" 버튼으로 진행/반복 처리
  - 모든 카드 완료 시 "VOCAB 완료" 표시
  - 완료 상태 localStorage에 저장 (새로고침 후 유지)
- **Verification**: (BROWSER) unit2.html#homework에서 카드 플립, 완료 흐름 확인

### REQ-002: SENTENCES 문장 반복 쓰기
- **Priority**: Must
- **Description**: 수업에서 공부한 주요 문장(3개)을 화면에 보여주고, 학생은 각 문장의 ① 한글 뜻 ② 변형 문장 5개를 직접 입력한다. 변형 문장은 단어를 바꿔가며 새로운 상황에 적용하는 연습이다.
- **Acceptance Criteria**:
  - 주요 문장 3개가 순서대로 표시된다
  - 각 문장마다: 한글 뜻 입력 필드 1개 + 변형 문장 입력 필드 5개
  - 총 18개 입력 필드 (3문장 × 6필드)
  - PREPARE 섹션에 포함되어 함께 Supabase에 저장된다
- **Verification**: (BROWSER) 3문장 × 6필드 입력 후 제출, DB에서 sentences JSON 확인

### REQ-003: PREPARE 섹션 유지 (빈칸 채우기)
- **Priority**: Must
- **Description**: 기존 빈칸 채우기 4개와 경기 결과(WIN/LOSE) 선택을 유지한다. 위치는 SENTENCES 아래.
- **Acceptance Criteria**:
  - 기존 4개 빈칸 그대로 유지
  - WIN/LOSE 라디오 버튼 유지
- **Verification**: (BROWSER) 기존 기능 그대로 작동 확인

### REQ-004: RECORD 섹션 제거
- **Priority**: Must
- **Description**: 카카오톡 영상 제출 안내와 RECORD 단계를 UI 및 폼에서 모두 제거한다. Mission Steps도 3 Steps → 2 Steps (VOCAB + SENTENCES+PREPARE)로 업데이트.
- **Acceptance Criteria**:
  - RECORD 미션 스텝 없음
  - 카카오톡 제출 안내 필드 없음
  - 페이지 어디에도 RECORD/녹화 언급 없음
- **Verification**: (BROWSER) 페이지에서 RECORD, 카카오톡 언급 없음 확인

### REQ-005: DB 스키마 — sentences 필드 추가
- **Priority**: Must
- **Description**: `b2b_homework_submissions` 테이블에 `sentences_answer` TEXT 컬럼을 추가한다. SENTENCES 입력값을 JSON으로 저장한다.
- **Acceptance Criteria**:
  - migration SQL 파일 생성
  - `sentences_answer` nullable TEXT 컬럼 추가
  - JSON 형식: `{ "s01": { "ko": "...", "v1": "...", "v2": "...", "v3": "...", "v4": "...", "v5": "..." }, "s02": {...}, "s03": {...} }`
- **Verification**: (MANUAL) migration 실행 후 `\d b2b_homework_submissions` 확인

### REQ-006: homework.html 결과 페이지 업데이트
- **Priority**: Should
- **Description**: 숙제 결과 확인 페이지에서 Unit 2 카드에 sentences_answer를 표시한다. 문장별 한글 뜻 + 변형 5개를 렌더링.
- **Acceptance Criteria**:
  - SENTENCES 섹션이 결과 카드에 표시됨
  - 문장별 그룹으로 렌더링
  - rewatch_answer 필드는 더 이상 표시하지 않음 (Unit 2)
- **Verification**: (BROWSER) homework.html#unit2에서 제출된 sentences 표시 확인

---

## Technical Design

### Architecture

**파일 대상**:
- `partners/unit2.html` → 주 수정 대상 (homework 섹션 전체 교체)
- `public/b2bproj/unit2.html` → 동일 내용 복사 (배포본)
- `supabase/migrations/085_b2b_sentences_answer.sql` → DB 컬럼 추가
- `partners/homework.html` → sentences 렌더링 추가
- `public/b2bproj/homework.html` → 동일 내용 복사

**Vocab 플래시카드**:
- 순수 HTML/CSS/JS (React 없음)
- 단어 목록은 JS const array로 unit2.html에 하드코딩
- localStorage key: `b2b_vocab_done_unit2`
- 플립 애니메이션: CSS transform rotateY

**Unit 2 단어 목록** (인터뷰 영상 기반, 구현 시 확정):
```
gutted, credit, bounce back, clinical, composed,
press, tight, dominated, resilient, mixed zone
```

**주요 문장 목록** (Unit 2 Phrases 섹션에서):
1. "We worked really hard for this."
2. "Credit to the whole team."
3. "I'm gutted, but we'll bounce back."

**SENTENCES JSON 형식**:
```json
{
  "s01": { "ko": "우리는 이것을 위해 정말 열심히 했습니다.", "v1": "We trained hard for this.", "v2": "...", "v3": "...", "v4": "...", "v5": "..." },
  "s02": { "ko": "팀 전체에게 공을 돌립니다.", "v1": "...", ... },
  "s03": { "ko": "속상하지만, 우리는 반등할 것입니다.", "v1": "...", ... }
}
```

**Submit 로직 변경**:
```javascript
const sentences = JSON.stringify({
  s01: { ko: koInput1.value, v1: v1_1.value, v2: v1_2.value, ... },
  s02: { ... },
  s03: { ... }
});
await sb.from('b2b_homework_submissions').insert({
  unit: 'unit2',
  student_name: name,
  rewatch_answer: null,       // 더 이상 사용 안 함
  prepare_answer: prepareJSON,
  sentences_answer: sentences  // 신규
});
```

**유효성 검사**:
- 이름 필수
- sentences 또는 prepare 중 하나 이상 입력

### Dependencies
- Supabase JS v2 (기존 CDN — 변경 없음)
- 추가 라이브러리 없음

---

## Traceability Matrix

| REQ ID  | Description               | Verification | File                         | Status  |
|---------|---------------------------|--------------|------------------------------|---------|
| REQ-001 | VOCAB 플래시카드          | (BROWSER)    | `partners/unit2.html`        | Pending |
| REQ-002 | SENTENCES 문장 쓰기       | (BROWSER)    | `partners/unit2.html`        | Pending |
| REQ-003 | PREPARE 유지              | (BROWSER)    | `partners/unit2.html`        | Pending |
| REQ-004 | RECORD 제거               | (BROWSER)    | `partners/unit2.html`        | Pending |
| REQ-005 | DB sentences 컬럼          | (MANUAL)     | `supabase/migrations/085_*.sql` | Pending |
| REQ-006 | homework.html 결과 표시   | (BROWSER)    | `partners/homework.html`     | Pending |

---

## Implementation Order

1. REQ-005 — DB migration 먼저 (다른 모든 작업의 기반)
2. REQ-004 — RECORD 제거 (단순 삭제, 의존성 없음)
3. REQ-001 — VOCAB 플래시카드 (독립적)
4. REQ-002 — SENTENCES 쓰기 (DB 준비된 후)
5. REQ-003 — PREPARE 유지 확인 (기존 코드 검증)
6. REQ-006 — homework.html 결과 표시 (모든 submit 로직 완료 후)

---

## Out of Scope

- Unit 1 변경 (Unit 2부터 적용)
- Unit 3-6 적용 (추후 별도 작업)
- RECORD 영상 파일 실제 저장 기능
- v2 Supabase vocab.events 연동 (Leitner box — b2bproj는 로컬 완료 상태만 추적)
- 단어 목록 관리 UI (하드코딩으로 충분)
