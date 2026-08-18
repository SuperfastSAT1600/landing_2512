# august-math SAT Bluebook UI 전환

## Overview

`/practice/august-math` 페이지가 현재 스크롤형 카드 리스트 UI를 사용하는데, 이를 `/practice/quadratic`과 동일한 SAT Bluebook 스타일 UI로 전환한다. 목표: 실제 SAT 시험 화면처럼 한 번에 한 문제씩 보이고, 다크 헤더 + Back/Next 푸터 + 리더보드가 있는 형태.

핵심 차이:
- **현재**: 30문제 전부 스크롤로 보임, 밝은 sticky 헤더, 카드 레이아웃, Check 버튼 인라인
- **목표**: 한 문제씩 표시, 다크 헤더(#1e293b), 스킬 탭 or 문제번호 탭, split 레이아웃, Back/Next 푸터, 리더보드 페이지

august-math 문제 특성: SPR(단답형 텍스트 입력), 12개 스킬 혼재 → 스킬 탭 대신 **문제 번호 그리드 네비게이터** 사용.

## Requirements

### REQ-001: phase 구조에 leaderboard 추가
- **Priority**: Must
- **Description**: 현재 `gate → test → result` 3단계를 `gate → leaderboard → test → result` 4단계로 변경. gate 통과 후 `/api/practice/stats?testId=august-math-decimal-30` API를 호출하여 stats 로드 후 leaderboard phase로 이동.
- **Acceptance Criteria**: gate 성공 시 리더보드 화면이 표시되고, "Start" 버튼으로 test phase 진입 가능.
- **Verification**: (BROWSER) gate 통과 후 리더보드 화면 확인, Start 클릭 후 test 화면 진입 확인

### REQ-002: 다크 테스트 헤더
- **Priority**: Must
- **Description**: 테스트 phase 헤더를 `background: '#1e293b'`(다크), height 52px으로 변경. 왼쪽: "8월 SAT MATH 실전연습1", 오른쪽: "X / 30 (Y correct)" + Submit 버튼.
- **Acceptance Criteria**: 헤더가 다크 배경이며, 진행 상황(answered/correct)을 실시간으로 표시함.
- **Verification**: (BROWSER) 헤더 스타일 및 카운터 동작 확인

### REQ-003: 한 문제씩 표시 (single-question view)
- **Priority**: Must
- **Description**: 30문제를 한 번에 모두 렌더링하는 대신 `currentIndex` state로 한 번에 한 문제만 렌더링. 문제 영역은 quadratic 페이지와 동일한 `test-layout` / `test-passage-panel` / `test-question-panel` CSS 클래스 사용.
- **Acceptance Criteria**: 한 번에 한 문제만 보임. passage 있는 문제는 split layout, 없는 문제는 전체 너비로 표시.
- **Verification**: (BROWSER) 첫 문제만 표시되는지, passage 있는 문제 split 확인

### REQ-004: SPR 입력 + 확인 버튼 (단답형 유지)
- **Priority**: Must
- **Description**: 텍스트 입력 방식(SPR) 유지. 단, 문제 패널 내부에 인라인으로 배치. 답 입력 후 "Check" 버튼 클릭 → `revealed` 상태 true → 정답/오답 피드백 표시 (quadratic의 rationale 영역과 유사한 스타일로).
- **Acceptance Criteria**: 텍스트 입력 + Check 버튼이 question panel 안에 있음. 확인 후 정답 또는 오답 표시.
- **Verification**: (BROWSER) 정답 입력 후 Check → 초록 피드백, 오답 → 빨간 피드백

### REQ-005: Back/Next 푸터 네비게이션
- **Priority**: Must
- **Description**: 화면 하단에 `bluebook-footer` 클래스 고정 푸터. 왼쪽 Back, 중앙 "X / 30", 오른쪽 Next 버튼. 마지막 문제에서 Next → Submit 버튼으로 전환 (혹은 비활성화).
- **Acceptance Criteria**: Back/Next 버튼으로 문제 이동 가능. 첫 문제에서 Back 비활성, 마지막 문제에서 Next 비활성.
- **Verification**: (BROWSER) 문제 이동 동작 확인

### REQ-006: 문제 번호 네비게이터 (skill tabs 대체)
- **Priority**: Must
- **Description**: quadratic의 스킬 탭 위치에 1~30 문제 번호 그리드를 배치. 각 번호 버튼의 상태: 미답변=회색, 답변완료=파란색, 현재=진한 테두리. 클릭 시 해당 문제로 이동.
- **Acceptance Criteria**: 헤더 아래 번호 네비게이터 행이 있으며, 각 번호의 상태가 시각적으로 구분됨.
- **Verification**: (BROWSER) 번호 클릭으로 해당 문제 이동, 답변 완료 후 색상 변화 확인

### REQ-007: result phase - 리더보드 + 내 결과
- **Priority**: Must
- **Description**: 제출 후 result phase에서 quadratic과 동일한 다크 리더보드 UI 표시 (배경 #09090b). 내 랭킹 하이라이트. "Back to Practice" 버튼으로 test로 돌아가기 가능.
- **Acceptance Criteria**: 제출 후 내 점수가 리더보드에서 하이라이트됨.
- **Verification**: (BROWSER) 제출 후 result 화면, 랭킹 표시 확인

### REQ-008: leaderboard phase UI
- **Priority**: Must
- **Description**: quadratic의 leaderboard phase와 동일한 다크 UI (#09090b). 상단 제목 "Leaderboard", 참가자 목록, "8월 SAT MATH 실전연습1" 제목, Start → 버튼.
- **Acceptance Criteria**: 리더보드 페이지가 다크 테마로 표시되고 Start 버튼으로 test phase 진입.
- **Verification**: (BROWSER) 리더보드 UI 다크 테마 확인

## Technical Design

### Architecture

**파일**: `/workspace/src/app/practice/august-math/page.tsx` (289줄 → ~500줄로 확장)

**변경 범위**: `page.tsx` 단일 파일 수정. API 변경 없음. CSS 클래스는 `globals.css`의 `.test-layout`, `.test-passage-panel`, `.test-question-panel`, `.bluebook-footer`, `.bluebook-next-btn`, `.btn-press` 재사용.

**State 추가**:
```typescript
type Phase = 'gate' | 'leaderboard' | 'test' | 'result';  // leaderboard 추가
const [stats, setStats] = useState<Stats | null>(null);   // 리더보드 데이터
const [currentIndex, setCurrentIndex] = useState(0);      // 현재 문제 인덱스
```

**leaderboard API**: `/api/practice/stats?testId=august-math-decimal-30` (quadratic과 동일한 엔드포인트, testId만 다름)

### Dependencies

- `globals.css`의 bluebook CSS 클래스들 (이미 존재)
- `/api/practice/stats` API (이미 존재)
- ContentRenderer 컴포넌트 (이미 import됨)

## Traceability Matrix

| REQ ID  | Description                        | Verification | Status  |
|---------|------------------------------------|--------------|---------|
| REQ-001 | leaderboard phase 추가              | (BROWSER)    | Pending |
| REQ-002 | 다크 테스트 헤더                     | (BROWSER)    | Pending |
| REQ-003 | 한 문제씩 표시 + split layout        | (BROWSER)    | Pending |
| REQ-004 | SPR 입력 + Check 버튼               | (BROWSER)    | Pending |
| REQ-005 | Back/Next 푸터                      | (BROWSER)    | Pending |
| REQ-006 | 문제 번호 네비게이터                  | (BROWSER)    | Pending |
| REQ-007 | result 리더보드                      | (BROWSER)    | Pending |
| REQ-008 | leaderboard phase UI                | (BROWSER)    | Pending |

## Implementation Order

1. REQ-001 — phase/stats 구조 변경이 나머지 모든 것의 기반
2. REQ-008 — leaderboard phase UI (gate 다음)
3. REQ-002 — 다크 헤더 (test phase 시작)
4. REQ-003 — single-question + split layout (핵심 구조 변경)
5. REQ-006 — 문제 번호 네비게이터 (REQ-003 완료 후)
6. REQ-004 — SPR 입력을 새 레이아웃에 맞게 재배치 (REQ-003 완료 후)
7. REQ-005 — Back/Next 푸터 (REQ-003 완료 후)
8. REQ-007 — result 리더보드 (마지막, submit 로직과 연결)

## Out of Scope

- 문제 데이터 변경 (QUESTIONS 배열 유지)
- 제출 API 변경 (/api/practice/august-math/submit 유지)
- 타이머 추가 (실제 SAT처럼 시간 제한 없음)
- 스킬 탭 (skills 다양해서 번호 네비게이터로 대체)
- 기존 gate UI 변경 (동일 유지)
