# 11월 SAT 반복 출제 유형 34문항 랜딩 블로그 포스팅

## Overview

사용자가 만든 아티팩트(11월 SAT 출제 유력 유형, 광고용 8문항 + 고난도 26문항 = 34문항)를 랜딩 블로그
(`tutoring.superfastsat.com/blog/{slug}`) 포스팅으로 만든다. 핵심은 문제가 보이고 깨지지 않는 것이다.
랜딩 블로그는 이미 MathJax(`$..$`, `\(..\)`), 표 스타일, HTML 본문을 지원하므로(`MathActivator.tsx`,
`PostContent.tsx`, `getPostData`의 HTML 직통 처리) 새 렌더러를 만들지 않는다.
아티팩트의 문제 HTML을 파싱해 블로그용 HTML로 변환하는 스크립트를 두고, 그 산출물을 포스트 본문에 넣는다.

## Requirements

### REQ-001: 아티팩트 문제 34개를 구조화 데이터로 추출
- **Priority**: Must
- **Description**: 아티팩트 HTML(`article.q`)에서 문제 번호, 스킬, 지문, 표, 그림, 보기, 정답, 핵심 이론/풀이/함정/선정 이유를 추출해 JSON으로 저장한다.
- **Acceptance Criteria**: 추출 결과가 정확히 34개(수학 15, RW 19)이고 각 항목에 정답이 있다. 그림 1개(HARD MATH 04), 표 3개가 보존된다.
- **Verification**: (TEST) 추출 결과 개수·필드·그림·표 보존 단위 테스트

### REQ-002: 아티팩트 전용 마크업을 블로그 호환 HTML로 변환
- **Priority**: Must
- **Description**: `.frac`는 `\(\frac{a}{b}\)`, 이탤릭 변수는 `\(x\)`로 바꾸고 `.blank`는 밑줄 빈칸, `.bub`/`.spr`는 블로그용 보기·단답형 표기로 바꾼다. 블로그에 없는 CSS 클래스에 의존하지 않는다.
- **Acceptance Criteria**: 변환 결과에 아티팩트 전용 클래스(`frac`, `blank`, `bub`, `spr`)가 남지 않고, `$`나 `\(` 짝이 맞는다. 그림은 `<img>`(data URI SVG)로 유지된다.
- **Verification**: (TEST) 변환 함수 단위 테스트(분수, 빈칸, 표, 그림, 수식 짝)

### REQ-003: 스킬 규칙에 맞는 landing 원고 작성
- **Priority**: Must
- **Description**: `superfastsat-blog` 스킬 규칙(Skeleton Gate, 합니다체, 도입부 고정 순서, `## 이것 기억하세요`, 확률 예측 금지)에 맞춰 `content/posts/2026-11-04-{slug}-landing.md`를 쓴다. 출제 확률·적중률·횟수 같은 숫자는 쓰지 않는다. 근거는 아티팩트에 있는 분석(2023년 3월~2026년 10월 비교)만 인용한다.
- **Acceptance Criteria**: 6,000자 이상, 금지 표현 없음, 루브릭 8점 이상, 문제 34개 모두 포함.
- **Verification**: (MANUAL) 스킬 체크리스트와 루브릭 자가 점검

### REQ-004: 34문항 전수 렌더링 검증
- **Priority**: Must
- **Description**: 포스트를 로컬에서 렌더링해 수식, 표, 그림, 보기가 깨지지 않았는지 전 문항을 확인한다(데스크톱과 모바일 폭).
- **Acceptance Criteria**: MathJax 오류(빨간 원문) 0건, 가로 넘침 0건, 그림 로드 성공, 정답이 아티팩트와 일치.
- **Verification**: (BROWSER) Playwright 스크린샷, 콘솔 에러 0건 확인

### REQ-005: draft로만 발행 준비
- **Priority**: Should
- **Description**: 발행 스크립트는 기본 `--draft`(is_published=false)로 동작한다. 실제 DB 쓰기와 공개 전환은 사용자 확인 후에만 한다.
- **Acceptance Criteria**: 스크립트 기본 실행이 draft이며 `--publish` 없이는 공개되지 않는다.
- **Verification**: (TEST) 인자 파싱 단위 테스트

## Technical Design

### Architecture
- 입력: 아티팩트 HTML 사본 `content/posts/data/nov-sat-artifact-source.html`
- `scripts/blog/nov-sat-lib.mjs`: jsdom으로 `article.q` 34개를 추출(`extractProblems`)하고 블로그용 HTML 카드로 변환(`renderProblem`), 원고의 마커 자리에 끼워 본문 완성(`buildPostHtml`)
- `scripts/blog/nov-sat-voice.mjs`: 핵심 이론/함정을 합니다체로 옮긴 텍스트(아티팩트 원문은 "~다" 체)
- `content/posts/2026-11-04-nov-sat-recurring-34-problems-landing.md`: 원고. 문제 자리에는 `<!--PROBLEMS:math-->`, `<!--PROBLEMS:rw-->` 마커
- `scripts/blog/build-nov-sat-post.mjs`: 로컬 미리보기용으로 `content/posts/data/nov-sat-34.html` 생성(커밋 안 함)
- `scripts/blog/publish-nov-sat-34.js`: 발행 시 본문을 즉석 빌드해 Supabase에 upsert. 기본 draft, 이미 공개된 글을 draft로 덮어쓰려 하면 중단

### Dependencies
`jsdom`, `marked`, `dotenv`(모두 설치됨). 새 의존성 없음.

## Traceability Matrix

| REQ ID  | Description                 | Verification | Test File                                   | Status  |
|---------|-----------------------------|--------------|---------------------------------------------|---------|
| REQ-001 | 문제 34개 추출               | (TEST)       | `scripts/blog/__tests__/nov-sat-lib.test.mjs` | Passing |
| REQ-002 | 마크업 변환                  | (TEST)       | `scripts/blog/__tests__/nov-sat-lib.test.mjs` | Passing |
| REQ-003 | 원고 작성                    | (MANUAL)     | -                                           | Done    |
| REQ-004 | 전수 렌더링 검증             | (BROWSER)    | Playwright 수동 실행(1280px/390px, 34문항)    | Verified (자동화 테스트 없음) |
| REQ-005 | draft 기본 발행              | (TEST)       | `scripts/blog/__tests__/nov-sat-lib.test.mjs` | Passing |

테스트 실행: `node --test scripts/blog/__tests__/nov-sat-lib.test.mjs` (node:test 사용, vitest에서는 제외)

## Implementation Order

1. REQ-001 — 모든 후속 작업의 입력
2. REQ-002 — 추출 결과를 블로그 HTML로 변환
3. REQ-003 — 변환된 문제를 넣어 원고 작성
4. REQ-005 — 발행 스크립트
5. REQ-004 — 렌더링 전수 검증 후 사용자에게 보고

## Out of Scope

- 새 블로그 렌더러나 VIP 게이트 코드 변경
- 실제 공개 발행(사용자 확인 전)
- 아티팩트 내용 수정
