# university-destiny-alumni-labels

## Overview

대학 궁합 결과 페이지의 동문(alumni) 섹션 레이블을 "이 학교 출신들"에서 "선배님들"로 변경하고,
각 동문 카드에 역할(role)과 함께 간단한 소개 문구(desc)를 추가한다.

## Requirements

### REQ-001: 레이블 텍스트 변경
- **Priority**: Must
- **Description**: "🎓 이 학교 출신들" 레이블을 "선배님들"로 변경 (결과 카드 + 공유 카드 두 곳)
- **Acceptance Criteria**: 결과 화면과 공유 카드에서 "이 학교 출신들" 텍스트가 "선배님들"로 표시됨
- **Verification**: (BROWSER) 생년월일 입력 후 결과 확인

### REQ-002: 동문 소개 문구 추가
- **Priority**: Must
- **Description**: FAMOUS_ALUMNI 데이터의 각 항목에 `desc` 필드(한 문장 소개)를 추가하고, 카드에 표시
- **Acceptance Criteria**: 각 동문 카드에 이름, 역할, 소개 문구가 순서대로 표시됨
- **Verification**: (BROWSER) 동문 카드 UI 확인

### REQ-003: desc CSS 스타일
- **Priority**: Must
- **Description**: 소개 문구용 `.alumni-desc` CSS 클래스 추가
- **Acceptance Criteria**: 소개 문구가 muted 색상, 작은 폰트(10-11px)로 두 줄 이내 표시
- **Verification**: (BROWSER) 카드 레이아웃 깨짐 없이 표시

## Technical Design

### Architecture
- 파일: `public/university_destiny_match/index.html`
- `FAMOUS_ALUMNI` 객체 — 각 항목에 `desc` 필드 추가
- `renderAlumniRow()` 함수 — `desc` 렌더링 추가
- CSS — `.alumni-desc` 클래스 추가
- 레이블: 3592, 4062 라인 두 곳 수정

### Dependencies
없음 (순수 HTML/CSS/JS 변경)

## Traceability Matrix

| REQ ID  | Description          | Verification | Status  |
|---------|----------------------|--------------|---------|
| REQ-001 | 레이블 텍스트 변경   | (BROWSER)    | Pending |
| REQ-002 | desc 필드 추가       | (BROWSER)    | Pending |
| REQ-003 | desc CSS 스타일      | (BROWSER)    | Pending |

## Implementation Order

1. REQ-003 — CSS 먼저 추가
2. REQ-002 — FAMOUS_ALUMNI 데이터 + renderAlumniRow 수정
3. REQ-001 — 레이블 텍스트 변경

## Out of Scope

- 동문 사진 로딩 로직 변경
- 동문 데이터 추가/삭제
