# 퍼센트 변화 10문항 내부용 블로그 포스트

## Overview

QB Math(2026-04 75문항, 2026-07-30 120문항)과 10월·11월 복원 세트에서 "p% greater / less / more than"처럼
양의 변화를 묻는 문제 10개를 골라, 문제 + 정답 + 해설 형태의 랜딩 블로그 포스트(`/blog/{slug}`)로 만든다.
내부 학생용이므로 DB에는 `is_published=false`(비공개)로만 저장한다. 목록·sitemap은 `is_published=true`만 조회하고
`getPostData`는 id 직접 조회라 직접 링크로는 열린다(코드 변경 없음). 공개 전환은 하지 않는다.

문제 10개: QB 6(`98818acf`, `6feae9c3`, `58ba7239`, `28ff3966`, `8bb94668`, `7bbfbe70`)
+ 복원 세트 4(`oct-f0945cc0`, `oct-52d70e35`, `oct-9fddfb77`, `nov-d2476aed`).

## Requirements

### REQ-001: 문제 10개를 구조화 데이터로 정의
- **Priority**: Must
- **Description**: 문제 번호, 출처, 스킬, 난이도, 지문(LaTeX는 `\(..\)`), 보기(있으면), 정답, 해설(풀이 + 함정)을 `scripts/blog/percent-change-problems.mjs`에 둔다.
- **Acceptance Criteria**: 정확히 10개, 각 항목에 id/지문/정답/해설이 있다. 보기가 있는 문제는 정답이 보기 중 하나다. 정답은 원본(PDF 해설·직접 풀이)과 일치한다.
- **Verification**: (TEST) 개수·필드·정답이 보기에 포함되는지 단위 테스트

### REQ-002: 문제 카드 HTML 렌더링
- **Priority**: Must
- **Description**: 문제별 카드(번호·출처 칩, 지문, 보기, "풀이 보기" details 안에 정답·해설·함정)를 인라인 style의 블로그 호환 HTML로 만든다. 아티팩트 전용 CSS 클래스에 의존하지 않는다.
- **Acceptance Criteria**: 카드 10개가 렌더되고 정답·해설은 details 안에 있다. `\(`와 `\)` 짝이 맞는다. 보기 없는 문제는 "직접 입력" 표기.
- **Verification**: (TEST) 렌더 함수 단위 테스트(카드 수, details 포함, 수식 짝, 보기 유무)

### REQ-003: 원고 작성 및 본문 빌드
- **Priority**: Must
- **Description**: `superfastsat-blog` 스킬 규칙(합니다체, 도입부 순서, `## 이것 기억하세요`)에 맞춰 `content/posts/2026-11-06-percent-change-10-problems-landing.md`를 쓰고 `<!--PROBLEMS:percent-->` 마커 자리에 카드를 끼워 본문을 만든다. 내부 학생용 글임을 도입부에 밝히고, 외부 검색 노출용 수치(출제 확률 등)는 쓰지 않는다.
- **Acceptance Criteria**: 마커가 모두 치환되고 H1은 본문에서 제거된다. 핵심 규칙(less=×(1-r), more=×(1+r))과 대표 함정(320% greater=×4.2)이 원고에 있다.
- **Verification**: (TEST) buildPostHtml 단위 테스트 / (MANUAL) 스킬 체크리스트 자가 점검

### REQ-004: 비공개(draft)로만 저장하는 발행 스크립트
- **Priority**: Must
- **Description**: `scripts/blog/publish-percent-change-10.js`는 기본 draft(`is_published=false`)이며 `--publish` 플래그 자체를 지원하지 않는다(내부용 고정). 이미 같은 id가 있으면 덮어쓴다.
- **Acceptance Criteria**: 저장된 행의 `is_published`가 false, 목록에 노출되지 않고 `/blog/{slug}` 직접 접근은 가능하다. 실제 DB 저장은 사용자 확인 후 한 번만 실행한다.
- **Verification**: (TEST) post 객체 생성 함수가 항상 `is_published:false`인지 단위 테스트 / (BROWSER) 로컬 서버로 `/blog/{slug}` 렌더 확인

### REQ-005: 렌더링 검증
- **Priority**: Must
- **Description**: 저장 후 로컬 dev 서버에서 10문항의 수식·보기·details가 깨지지 않는지 데스크톱·모바일 폭으로 확인한다.
- **Acceptance Criteria**: MathJax 오류(원문 노출) 0건, 가로 넘침 0건, 콘솔 에러 0건, 정답이 데이터와 일치.
- **Verification**: (BROWSER) Playwright 스크린샷 1280px/390px

## Technical Design

### Architecture
- 기존 11월 34문항 글의 파이프라인(`scripts/blog/nov-sat-lib.mjs`, `publish-nov-sat-34.js`)과 같은 구조를 따른다. `extractPostTitle`만 재사용하고, 카드 렌더러는 새로 쓴다(입력 소스가 아티팩트 HTML이 아니라 JS 데이터라서).
- `scripts/blog/percent-change-problems.mjs`: 문제 10개 데이터
- `scripts/blog/percent-change-lib.mjs`: `renderProblem`, `buildPostHtml`, `buildPost`
- `scripts/blog/publish-percent-change-10.js`: Supabase upsert(`posts`, on_conflict id), 항상 draft
- `content/posts/2026-11-06-percent-change-10-problems-landing.md`: 원고
- 카테고리는 `SAT Math`, 비공개이므로 목록·sitemap에 노출되지 않는다. 링크가 새도 검색에 잡히지 않도록 `meta_robots`를 `noindex, nofollow`로 둔다. 필요하면 `access_code`로 잠글 수 있으나 이번 범위 밖.

### Dependencies
`marked`, `dotenv`(설치됨). 새 의존성 없음.

## Traceability Matrix

| REQ ID  | Description            | Verification | Test File                                          | Status  |
|---------|------------------------|--------------|----------------------------------------------------|---------|
| REQ-001 | 문제 10개 데이터        | (TEST)       | `scripts/blog/__tests__/percent-change-lib.test.mjs` | Passing |
| REQ-002 | 카드 렌더링             | (TEST)       | `scripts/blog/__tests__/percent-change-lib.test.mjs` | Passing |
| REQ-003 | 원고·본문 빌드          | (TEST)       | `scripts/blog/__tests__/percent-change-lib.test.mjs` | Passing |
| REQ-004 | draft 고정 발행         | (TEST)       | `scripts/blog/__tests__/percent-change-lib.test.mjs` | Passing |
| REQ-005 | 렌더링 검증             | (BROWSER)    | Playwright 수동 실행(1280px/390px)                   | Verified |

테스트 실행: `node --test scripts/blog/__tests__/percent-change-lib.test.mjs`

## Implementation Order

1. REQ-001 — 데이터가 모든 후속 작업의 입력
2. REQ-002 — 데이터를 카드 HTML로 변환
3. REQ-003 — 원고 작성 후 본문 빌드
4. REQ-004 — 발행 스크립트(draft 고정)
5. REQ-005 — 저장 후 렌더링 검증

## Out of Scope

- 공개 발행(`is_published=true`), 목록·sitemap 노출
- 접근 코드(access_code) 설정, 블로그 렌더러·게이트 코드 변경
- 네이버·고스트 등 다른 채널 발행
- 기존 11월 34문항 글과 원본 데이터 파일 수정
