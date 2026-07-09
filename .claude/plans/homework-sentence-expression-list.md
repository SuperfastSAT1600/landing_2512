# Homework Sentence & Expression List

## Overview

수업 중 코치가 "예문 추가"로 문장을 입력할 때, 일부 문장을 "숙제 문장"으로 표시할 수 있어야 한다. 숙제 문장으로 표시된 문장들은 숙제 섹션 이전에 "Expression Lists" 패널로 노출되어, 학생들이 숙제를 시작하기 전에 해당 표현을 복습하고 기억할 수 있도록 한다. 대상 파일: `partners/unit1.html`, `partners/unit2.html`.

## Requirements

### REQ-001: 숙제 문장 마킹 UI (compose overlay)
- **Priority**: Must
- **Description**: 예문 추가 compose overlay에서 각 예문 항목 옆에 "숙제" 토글 버튼을 추가한다. 코치가 버튼을 클릭하면 해당 문장이 숙제 문장으로 마킹(또는 해제)된다.
- **Acceptance Criteria**:
  - compose overlay 내 `.compose-ex` 항목마다 "숙제" 버튼이 우측에 표시된다.
  - 클릭 시 버튼 스타일이 활성화 상태로 변경되고, 다시 클릭 시 해제된다.
  - 마킹 상태는 localStorage에 즉시 저장된다.
- **Verification**: (BROWSER) compose overlay를 열어 예문을 추가한 후, 숙제 버튼을 토글하면 스타일이 변경되는지 확인

### REQ-002: 숙제 문장 스토리지 포맷 변경
- **Priority**: Must
- **Description**: localStorage 저장 포맷을 `string[]`에서 `{text: string, isHomework: boolean}[]`으로 마이그레이션한다. 기존 string 배열은 자동으로 `{text: s, isHomework: false}`로 변환한다.
- **Acceptance Criteria**:
  - 기존 데이터가 있는 경우 마이그레이션 후 예문이 그대로 표시된다.
  - 새로 추가되는 예문은 새 포맷으로 저장된다.
  - `isHomework: true`인 항목은 숙제 문장으로 처리된다.
- **Verification**: (BROWSER) 기존 예문이 있는 상태에서 페이지 새로고침 후 예문 목록이 그대로 표시되는지 확인

### REQ-003: 인라인 note-examples 숙제 문장 시각 구분
- **Priority**: Must
- **Description**: `.note-examples` 영역에서 숙제 문장(`isHomework: true`)에 시각적 구분자(예: 배지 또는 강조 색상)를 표시한다.
- **Acceptance Criteria**:
  - 숙제 문장 항목에 "숙제" 배지 또는 아이콘이 표시된다.
  - 일반 예문과 명확히 구분된다.
- **Verification**: (BROWSER) 숙제 문장으로 마킹 후 노트 영역에서 시각 구분 확인

### REQ-004: Expression Lists 패널 (숙제 섹션 직전)
- **Priority**: Must
- **Description**: 숙제 섹션(`#homework` 또는 `.homework-section`) 바로 앞에 "Expression Lists" 패널을 삽입한다. 이 패널은 현재 페이지 전체 예문 중 `isHomework: true`인 문장만 모아 보여준다. 숙제 문장이 하나도 없으면 패널을 숨긴다.
- **Acceptance Criteria**:
  - 숙제 섹션 직전에 "Expression Lists" 제목과 숙제 문장 목록이 표시된다.
  - 각 항목은 원본 표현(expression key의 영어 원문) + 학생이 입력한 예문을 함께 표시한다.
  - 숙제 문장이 없으면 패널 자체가 `display: none`이다.
  - 숙제 문장이 추가/해제될 때 실시간으로 패널이 업데이트된다.
- **Verification**: (BROWSER) 숙제 문장 마킹 후 페이지를 스크롤하면 숙제 섹션 앞에 Expression Lists가 보이는지 확인

### REQ-005: unit1.html과 unit2.html 모두 적용
- **Priority**: Must
- **Description**: 동일한 변경을 unit1.html과 unit2.html 양쪽에 적용한다. 두 파일의 JS 구현이 동일하므로 같은 패턴으로 수정한다.
- **Acceptance Criteria**:
  - unit1.html, unit2.html 모두에서 REQ-001 ~ REQ-004 동작
- **Verification**: (BROWSER) 두 URL에서 각각 기능 동작 확인

## Technical Design

### Architecture

**파일 구조:**
- `partners/unit1.html` — 인라인 JS/CSS 수정
- `partners/unit2.html` — 동일하게 수정
- `public/partners/unit1.html`, `public/partners/unit2.html` — 빌드 미러 (별도 동기화 필요 여부 확인)

**스토리지 포맷 변경:**
```js
// Before
localStorage["ex__son-0"] = JSON.stringify(["I am incredibly proud.", "She felt proud."])

// After
localStorage["ex__son-0"] = JSON.stringify([
  { text: "I am incredibly proud.", isHomework: false },
  { text: "She felt proud.", isHomework: true }
])
```

**마이그레이션 로직 (`_getEx` 함수 내):**
```js
function _getEx(k) {
  try {
    const raw = JSON.parse(localStorage.getItem(k) || '[]');
    // Migrate string[] to object[]
    return raw.map(item =>
      typeof item === 'string' ? { text: item, isHomework: false } : item
    );
  } catch { return []; }
}
```

**Expression Lists 패널 렌더링:**
- `_renderExpressionList()` 함수: 모든 `[data-key]` 노트를 순회하며 `isHomework: true` 항목을 수집하고 패널 업데이트
- `closeCompose()` 후, `delEx()` 후, 숙제 토글 후 호출

**숙제 섹션 위치 특정:**
- unit1.html, unit2.html의 숙제 섹션 HTML 구조 확인 후 적절한 selector 사용 (e.g., `.step-homework`, `[data-step="homework"]`, `#s-homework`)

### Key Functions Modified/Added

| Function | Change |
|----------|--------|
| `_getEx(k)` | 마이그레이션 로직 추가 |
| `_setEx(k, arr)` | 변경 없음 (이미 JSON) |
| `_renderNoteExamples(noteEl)` | 숙제 문장 배지 표시 |
| `_renderComposeList()` | 숙제 토글 버튼 추가 |
| `toggleHomework(dataKey, idx)` | 신규: isHomework 토글 |
| `_renderExpressionList()` | 신규: Expression Lists 패널 렌더 |
| `closeCompose()` | `_renderExpressionList()` 호출 추가 |
| `delEx(e, dataKey, idx)` | `_renderExpressionList()` 호출 추가 |

### Dependencies
- 외부 의존성 없음 (순수 vanilla JS + localStorage)
- Supabase 연동 불필요 (예문은 localStorage 기반 유지)

## Traceability Matrix

| REQ ID  | Description                        | Verification | Status  |
|---------|------------------------------------|--------------|---------|
| REQ-001 | 숙제 문장 마킹 UI (compose overlay) | (BROWSER)    | Pending |
| REQ-002 | 스토리지 포맷 마이그레이션           | (BROWSER)    | Pending |
| REQ-003 | 인라인 숙제 문장 시각 구분           | (BROWSER)    | Pending |
| REQ-004 | Expression Lists 패널 (숙제 직전)   | (BROWSER)    | Pending |
| REQ-005 | unit1, unit2 모두 적용              | (BROWSER)    | Pending |

## Implementation Order

1. REQ-002 — 스토리지 포맷 변경 먼저 (다른 모든 기능의 기반)
2. REQ-001 — compose overlay UI 변경 (마킹 인터페이스)
3. REQ-003 — 인라인 노트 숙제 배지 (작은 UI 추가)
4. REQ-004 — Expression Lists 패널 (핵심 새 기능)
5. REQ-005 — unit2에도 동일 적용

## Out of Scope

- 숙제 문장의 Supabase 동기화 (localStorage 범위 유지)
- 코치와 학생 간 숙제 문장 공유 (현재 localStorage는 클라이언트 개별)
- Expression Lists 인쇄/내보내기
- 숙제 문장 순서 변경(드래그앤드롭)
