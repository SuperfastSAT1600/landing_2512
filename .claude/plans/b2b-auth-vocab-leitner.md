# 강원FC 학생 인증 + Leitner 단어 시스템

## Overview

강원FC unit2.html에 학생 PIN 로그인을 추가하고,
vocab 플래시카드를 v2와 동일한 Leitner box 시스템(Supabase 저장)으로 전환한다.

**로그인 흐름**: 이름 선택 + 6자리 PIN → 첫 방문 시 자동 등록, 재방문 시 인증
**Vocab**: 로그인 후 Supabase에서 개인 박스 상태 조회 → Leitner 순서로 카드 제시 → 응답마다 이벤트 저장
**숙제 제출**: student_id와 함께 저장

---

## Requirements

### REQ-001: 학생 인증 UI (로그인/등록 통합)
- **Priority**: Must
- **Description**: 페이지 진입 시 숙제 폼 대신 로그인 화면이 먼저 표시된다. 이름 선택 + 6자리 PIN 입력. Supabase에 해당 이름이 없으면 자동 등록, 있으면 PIN 검증.
- **Acceptance Criteria**:
  - 로그인 전: `#homework` 섹션의 vocab/form 영역이 숨겨짐
  - 이름 선택 + PIN 6자리 입력 후 "시작하기" 버튼 활성화
  - 첫 방문: `b2b_students`에 INSERT → 세션 시작
  - 재방문: PIN hash 비교 → 일치하면 세션 시작, 불일치하면 에러
  - 세션 정보 `b2b_session_unit2` localStorage에 저장 (student_id + name)
  - 새로고침 시 localStorage 세션 있으면 로그인 화면 건너뜀
- **Verification**: (BROWSER) 새 이름으로 첫 로그인, 재로그인, 틀린 PIN 에러 확인

### REQ-002: PIN 보안
- **Priority**: Must
- **Description**: PIN은 SubtleCrypto SHA-256으로 해싱 후 저장. 평문 PIN은 서버에 전송하지 않는다.
- **Acceptance Criteria**:
  - `hashPin(pin)` → `SHA-256(pin + name)` hex string 반환
  - DB에는 hash만 저장
  - 로그인 시: 입력 PIN을 같은 방식으로 해시 → DB 값과 비교
- **Verification**: (BROWSER) Supabase 테이블에서 pin 컬럼이 hex 문자열인지 확인

### REQ-003: Vocab Leitner 시스템 (Supabase 연동)
- **Priority**: Must
- **Description**: 로그인 후 vocab 학습 시 v2와 동일한 Leitner box 시스템으로 동작한다. 학생별·유닛별 박스 상태가 Supabase `b2b_vocab_events` 테이블에 저장된다.
- **Acceptance Criteria**:
  - 박스 0-4. 박스 4 = 마스터 (더 이상 출제 안 함)
  - 단어 제시 순서: 박스 0 → 박스 1 → 박스 2 → 박스 3 (오래된 것 먼저)
  - "알았어요": `new_box = min(prev_box + 1, 4)` 로 이벤트 저장
  - "다시 볼게요": `new_box = 0` 으로 이벤트 저장
  - 박스 4 단어만 남으면 "오늘의 Vocab 완료" 표시
  - 세션 시작 시 Supabase에서 각 단어의 현재 박스 상태 조회
- **Verification**: (BROWSER) 단어 10개 학습 → Supabase `b2b_vocab_events`에 이벤트 저장 확인

### REQ-004: 숙제 제출에 student_id 연결
- **Priority**: Must
- **Description**: 로그인 세션의 student_id를 숙제 제출 시 함께 저장한다.
- **Acceptance Criteria**:
  - `b2b_homework_submissions.student_id` 컬럼에 UUID 저장
  - 미로그인 상태에서는 제출 불가 (로그인 화면으로 안내)
- **Verification**: (MANUAL) 제출 후 DB에서 student_id 컬럼 확인

### REQ-005: DB 스키마
- **Priority**: Must
- **Description**: 3개의 테이블/컬럼 변경이 필요하다.
- **Acceptance Criteria**:
  ```sql
  -- 신규: 학생 계정
  CREATE TABLE public.b2b_students (
    id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name       text NOT NULL UNIQUE,
    pin_hash   text NOT NULL,
    created_at timestamptz DEFAULT now()
  );

  -- 신규: vocab Leitner 이벤트
  CREATE TABLE public.b2b_vocab_events (
    id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id  uuid NOT NULL REFERENCES public.b2b_students(id),
    unit        text NOT NULL,
    word_key    text NOT NULL,   -- 예: 'unit2_0' (단어 인덱스)
    is_correct  boolean NOT NULL,
    prev_box    int NOT NULL DEFAULT 0,
    new_box     int NOT NULL DEFAULT 0,
    occurred_at timestamptz DEFAULT now()
  );

  -- 기존 컬럼 추가
  ALTER TABLE public.b2b_homework_submissions
    ADD COLUMN student_id uuid REFERENCES public.b2b_students(id);
  ```
  - RLS: anon이 INSERT/SELECT 가능 (기존 패턴 유지)
- **Verification**: (MANUAL) migration 실행 후 스키마 확인

### REQ-006: 로그인 UI 디자인
- **Priority**: Must
- **Description**: 기존 dark/SpaceX 테마와 일관된 로그인 패널.
- **Acceptance Criteria**:
  - `#hw-login` 패널: 이름 select + PIN input (type=password, maxlength=6) + "시작하기" 버튼
  - PIN 입력 중 글자 수 표시 (●●●●●● 형태)
  - 로그인 성공 시 패널 사라지고 vocab + form 표시
  - 우측 상단 또는 폼 상단에 로그인된 이름 표시 + "로그아웃" 링크
- **Verification**: (BROWSER) 모바일에서 PIN 입력 UX 확인

---

## Technical Design

### Architecture

**파일 대상**:
- `partners/unit2.html` — 로그인 UI, vocab Leitner JS, submit 수정
- `public/b2bproj/unit2.html` — 복사본
- `supabase/migrations/087_b2b_auth_vocab.sql` — 3개 스키마 변경

**PIN 해싱 (브라우저 SubtleCrypto)**:
```javascript
async function hashPin(pin, name) {
  const msg = pin + '::' + name.toLowerCase();
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(msg));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}
```

**세션 관리**:
```javascript
// localStorage key: 'b2b_session_unit2'
// 값: { student_id: "uuid", name: "황은총" }
```

**Leitner 상태 계산**:
```javascript
// 로그인 후 단어별 현재 박스 계산
async function loadVocabState(student_id, unit) {
  const { data } = await sb.from('b2b_vocab_events')
    .select('word_key, new_box, occurred_at')
    .eq('student_id', student_id)
    .eq('unit', unit)
    .order('occurred_at', { ascending: false });

  // word_key별 가장 최근 new_box가 현재 박스
  const boxState = {};
  for (const e of data ?? []) {
    if (!(e.word_key in boxState)) boxState[e.word_key] = e.new_box;
  }
  return boxState; // { 'unit2_0': 2, 'unit2_1': 0, ... }
}
```

**Leitner 큐 구성**:
```javascript
function buildLeitnerQueue(vocabList, boxState) {
  // 박스 4 (마스터) 제외, 박스 오름차순으로 정렬
  return vocabList
    .map((w, i) => ({ ...w, key: `unit2_${i}`, box: boxState[`unit2_${i}`] ?? 0 }))
    .filter(w => w.box < 4)
    .sort((a, b) => a.box - b.box);
}
```

**이벤트 저장**:
```javascript
async function gradeCard(word_key, is_correct, prev_box) {
  const new_box = is_correct ? Math.min(prev_box + 1, 4) : 0;
  await sb.from('b2b_vocab_events').insert({
    student_id: session.student_id,
    unit: HW_UNIT,
    word_key,
    is_correct,
    prev_box,
    new_box,
  });
  return new_box;
}
```

**페이지 초기화 순서**:
```
DOMContentLoaded
  → checkSession()
    → 세션 있음: initVocab(student_id) + showHomeworkForm()
    → 세션 없음: showLoginPanel()
```

### Dependencies
- SubtleCrypto (브라우저 내장 — 추가 라이브러리 없음)
- Supabase JS v2 (기존 CDN)

---

## Traceability Matrix

| REQ ID  | Description              | Verification | File                            | Status  |
|---------|--------------------------|--------------|----------------------------------|---------|
| REQ-001 | 로그인/등록 UI           | (BROWSER)    | `partners/unit2.html`            | Pending |
| REQ-002 | PIN SHA-256 해싱         | (BROWSER)    | `partners/unit2.html`            | Pending |
| REQ-003 | Vocab Leitner (Supabase) | (BROWSER)    | `partners/unit2.html`            | Pending |
| REQ-004 | student_id 연결          | (MANUAL)     | `partners/unit2.html`            | Pending |
| REQ-005 | DB 스키마 3개            | (MANUAL)     | `migrations/087_*.sql`           | Pending |
| REQ-006 | 로그인 UI 디자인         | (BROWSER)    | `partners/unit2.html`            | Pending |

## Implementation Order

1. REQ-005 — migration SQL 작성
2. REQ-001 + REQ-002 + REQ-006 — 로그인 UI + 인증 로직 (함께)
3. REQ-003 — Leitner vocab (로그인 후 student_id 필요)
4. REQ-004 — submit에 student_id 추가

## Out of Scope

- 비밀번호 분실 복구 (PIN 잊으면 코치가 DB에서 삭제 후 재등록)
- homework.html 결과 페이지의 학생별 필터 개선 (추후)
- Unit 1 적용 (Unit 2만)
- 서버사이드 인증 (Next.js API route 없음 — 브라우저 SHA-256으로 충분)
