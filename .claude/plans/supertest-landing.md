---
feature: supertest-landing
status: planned
created: 2026-05-19
template: spec-ui.md.template
---

# SuperTest Landing Page

## Overview

광고 유입 고객에게 SuperTest(실전형 SAT 모의고사)의 필요성을 설득하고 외부 결제 페이지로 유도하는 마케팅 랜딩 페이지를 신규 구현한다. 메인 사이트 헤더 NAV의 "진단테스트" 오른쪽에 `SuperTest` 메뉴를 추가하고, `/supertest` 경로에 5개 섹션(Hero → Problem & Solution → Features → Pricing → FAQ)으로 구성된 단일 페이지를 만든다. 첫 시행일인 2026-05-30 런칭에 맞춰 "첫 할인 30%" 프로모션을 최상단에 노출하며, 향후 할인율/플랜 가격 변경이 잦을 것으로 예상되므로 모든 가격·할인·일정 데이터는 한 곳의 상수 파일로 분리한다.

페이지는 Next.js App Router의 서버 컴포넌트로 렌더링하되, 가격 섹션 스크롤·국가별 시간 표시 등 인터랙티브 요소만 클라이언트 컴포넌트로 분리한다. 디자인은 `DESIGN.md`의 ElevenLabs 톤(off-white 캔버스, warm near-black, Inter/Waldenburg, 무신경한 단색 CTA)을 유지하며, 기존 `Header.module.css`와 동일하게 CSS Modules + Tailwind 혼합 패턴을 따른다.

## Requirements

### REQ-001: Header NAV에 SuperTest 메뉴 항목 추가
- **Priority**: Must
- **Description**: `src/app/components/Header.tsx`의 `NAV_ITEMS` 배열에서 `진단테스트` 항목 바로 뒤에 `{ href: '/supertest', label: 'SuperTest' }` 항목을 삽입한다. 외부 링크 플래그는 부여하지 않는다(내부 라우트).
- **Acceptance Criteria**: 모든 페이지(`/admin`, `/reports`, `/coaches/[slug]` 제외)의 헤더에서 `SuperTest` 텍스트 링크가 진단테스트와 SAT인강 사이에 노출되고, 클릭 시 `/supertest`로 이동하며, 현재 경로가 `/supertest`일 때 `active` 스타일(흰색·font-weight 600·언더라인)이 적용된다.
- **Verification**: (TEST) React Testing Library로 `Header` 렌더 후 `screen.getByRole('link', { name: 'SuperTest' })`의 href가 `/supertest`인지, `진단테스트`와 `SAT인강` 사이 DOM 순서인지 확인한다.

### REQ-002: `/supertest` 라우트가 서버 컴포넌트로 렌더링되고 5개 섹션을 포함한다
- **Priority**: Must
- **Description**: `src/app/supertest/page.tsx`를 서버 컴포넌트(`async function Page`)로 생성하고, Hero / ProblemSolution / Features / Pricing / FAQ 5개 섹션 컴포넌트를 순서대로 마운트한다. `export const metadata`로 title, description, OG 태그를 설정한다.
- **Acceptance Criteria**: `/supertest` GET 요청 시 200 응답을 반환하고, HTML 내에 5개 섹션의 ARIA landmark(`<section aria-labelledby>`)가 모두 존재한다. `metadata.title`은 `"SuperTest — 가장 완벽한 SAT 실전 모의고사 | SuperfastSAT"`를 포함한다.
- **Verification**: (TEST) Next.js route 단위 테스트(또는 Vitest + `renderToString`)로 Page 렌더링 시 5개 섹션의 `aria-labelledby` 값이 모두 DOM에 존재하는지 검증한다. `metadata` export의 title 문자열을 단위 테스트로 단언한다.

### REQ-003: Hero 섹션 헤드라인·서브카피·프로모션 배지·CTA 표시
- **Priority**: Must
- **Description**: Hero 컴포넌트는 (1) 헤드라인 "조금 더 어렵게, 실제 시험처럼. 가장 완벽한 SAT 실전 모의고사 SuperTest", (2) 서브카피 "혼자 푸는 쉬운 모의고사는 끝났다. 화상 카메라 모드의 실전 환경부터 College Board를 뛰어넘는 초정밀 분석까지.", (3) 프로모션 배지 "5/30 시작, 첫 할인 이벤트 30%", (4) CTA 버튼 "첫 할인 30% 적용받고 신청하기"를 노출한다. CTA 클릭 시 동일 페이지의 `#pricing` 앵커로 스무스 스크롤한다.
- **Acceptance Criteria**: Hero 영역에 4가지 텍스트가 모두 보이고, CTA 버튼은 `<a href="#pricing">`이며 `scroll-behavior: smooth`가 적용된 컨테이너 안에서 동작한다. 프로모션 배지의 할인율 텍스트는 `discountPercent` 상수에서 동적으로 렌더된다.
- **Verification**: (BROWSER) Playwright MCP로 `/supertest` 진입 후 4가지 텍스트가 스크린샷에 보이는지, CTA 클릭 시 가격 섹션이 뷰포트에 들어오는지 확인한다.

### REQ-004: Problem & Solution 섹션이 페인포인트 3개·해결책 2개를 카드 그리드로 표시
- **Priority**: Must
- **Description**: ProblemSolution 컴포넌트는 좌측 "혼자 푸는 모의고사의 한계"(긴장감 부재 / 점수 정체 / 약점 진단 불가) 3개 카드, 우측 "SuperTest의 해결책"(더 어려운 난이도 / 화상 카메라 동시 접속) 2개 카드를 2-column 그리드로 보여준다. 각 카드는 제목 + 1줄 설명으로 구성.
- **Acceptance Criteria**: 데스크탑(≥768px)에서는 2-column, 모바일에서는 1-column으로 스택된다. 모든 카드 텍스트가 DOM에 존재한다.
- **Verification**: (TEST) 컴포넌트 단위 테스트로 5개 카드 제목이 모두 렌더되는지 확인. (BROWSER) Playwright MCP 데스크탑/모바일 뷰포트 스크린샷.

### REQ-005: Features 섹션이 5개 핵심 기능을 카드로 표시
- **Priority**: Must
- **Description**: Features 컴포넌트는 (1) 2026 정기 실전 일정표 (5/30부터 격주), (2) 글로벌 동시 접속(화상 카메라·국가별 시간), (3) Micro-skill 약점 분석, (4) 시험 후 어휘 집중 학습, (5) 1시간 리뷰 강의 — 5개 기능을 카드로 표시한다. 각 카드는 아이콘 자리(SVG 또는 텍스트 이모지 대체), 제목, 2-3줄 설명을 포함.
- **Acceptance Criteria**: 5개 카드가 모두 DOM에 존재하고, 각 카드 제목이 `<h3>`로 마크업된다. 일정표 카드 내부에는 2026년 시험 일정(최소 4건) 리스트가 포함된다.
- **Verification**: (TEST) 컴포넌트 단위 테스트로 카드 수, 제목 텍스트, 일정 리스트 항목 수를 단언.

### REQ-006: Pricing 섹션이 3-tier 플랜 비교표와 외부 결제 CTA를 표시
- **Priority**: Must
- **Description**: Pricing 컴포넌트는 Live(정가 70,000원), Flex(40,000원), Review(20,000원) 3개 플랜을 카드로 표시한다. 각 카드는 (a) 플랜명, (b) 정가(strikethrough), (c) 할인가(현재 30% 적용), (d) 기능 체크리스트(화상카메라/단어학습/성적분석/해설강의/기한), (e) 외부 결제 링크 CTA 버튼을 포함한다. 섹션 ID는 `pricing`(Hero CTA 스크롤 타깃). 비교표 형태의 Markdown 표 데이터를 그리드 카드로 렌더한다.
- **Acceptance Criteria**: 3개 플랜 카드가 모두 렌더되고, 각 카드의 할인가는 `정가 × (1 - discountPercent/100)`로 계산된 값과 일치한다(정수 원 단위, 0~5천 자리 절사 없이). 각 CTA 버튼의 `href`는 `PLAN.checkoutUrl`이며 `target="_blank" rel="noopener noreferrer"`로 새 탭에서 열린다.
- **Verification**: (TEST) `PLANS` 상수와 컴포넌트 결합 테스트: 각 플랜의 표시 가격이 `getDiscountedPrice(plan.price, DISCOUNT_PERCENT)`와 일치하는지, 모든 CTA가 `target="_blank"`인지 단언.

### REQ-007: 할인율과 플랜 가격이 상수 파일로 분리되어 한 곳에서 변경 가능하다
- **Priority**: Must
- **Description**: `src/app/supertest/data/plans.ts`에 다음을 export한다:
  - `export const DISCOUNT_PERCENT = 30;`
  - `export const LAUNCH_DATE = '2026-05-30';`
  - `export const PLANS: Plan[]` — 각 플랜의 id, name, price(KRW), features 체크리스트, deadline, checkoutUrl을 포함.
  - `export const TEST_SCHEDULE: TestDate[]` — 2026년 시험 일정 배열.
  - `export function getDiscountedPrice(price: number, percent: number): number` — 할인가 계산 헬퍼.
  Hero·Pricing·Features 컴포넌트는 모두 이 파일에서 import하며, 컴포넌트 내부에 가격 리터럴을 두지 않는다.
- **Acceptance Criteria**: `DISCOUNT_PERCENT`를 20으로 변경하면 Hero 배지와 Pricing 할인가가 모두 자동 갱신된다. 컴포넌트 파일 어디에도 `49,000`, `28,000`, `14,000`, `70000`, `40000`, `20000` 같은 가격 리터럴이 등장하지 않는다.
- **Verification**: (TEST) `getDiscountedPrice(70000, 30) === 49000`, `getDiscountedPrice(40000, 30) === 28000`, `getDiscountedPrice(20000, 30) === 14000` 단위 테스트. grep으로 컴포넌트 파일에 가격 리터럴 부재 확인 테스트(또는 코드 리뷰 체크).

### REQ-008: 2026 시험 일정 타임라인 시각화
- **Priority**: Should
- **Description**: Features 섹션 안의 "2026 정기 실전 일정표" 카드는 `TEST_SCHEDULE` 배열을 가로 스크롤 가능한 타임라인(또는 세로 리스트)으로 시각화한다. 각 항목은 날짜(YYYY-MM-DD), 요일, 회차 라벨을 표시한다.
- **Acceptance Criteria**: 일정 배열 추가/삭제 시 UI가 자동 갱신된다. 모바일에서는 가로 스크롤 또는 세로 스택으로 자연스럽게 표시.
- **Verification**: (BROWSER) Playwright MCP로 모바일·데스크탑 뷰포트에서 타임라인 가독성 스크린샷 확인.

### REQ-009: 국가별 시험 시간 표시 UI
- **Priority**: Should
- **Description**: Features 섹션의 "글로벌 동시 접속" 카드 또는 별도 박스에서 한국(KST), 미국 동부(EST), 미국 서부(PST), 베트남(ICT) 4개 타임존의 시험 시작 시간을 표시한다. 표시는 정적(빌드 타임에 계산된 문자열) 또는 클라이언트 컴포넌트의 `Intl.DateTimeFormat` 둘 중 하나로 구현.
- **Acceptance Criteria**: 4개 타임존의 시간이 KST 09:00 기준으로 정확히 변환된 값으로 표시된다. UI는 텍스트 또는 작은 표 형식.
- **Verification**: (TEST) 시간 변환 함수의 단위 테스트(`getLocalStartTime('America/New_York', '2026-05-30T00:00:00Z') === '...'` 등).

### REQ-010: FAQ 섹션이 환불 규정·응시 환경 등 최소 4개 질문을 아코디언으로 표시
- **Priority**: Must
- **Description**: FAQ 컴포넌트는 (1) 사전 취소 환불 가능 여부, (2) 노쇼 환불 불가 정책, (3) 화상카메라 세팅 요구사항, (4) 국가별 시험 시간 안내 — 최소 4개 질문을 `<details>`/`<summary>` 네이티브 아코디언으로 표시한다. JS 없이 동작.
- **Acceptance Criteria**: 4개 `<details>` 요소가 모두 렌더되고, 각 `<summary>` 클릭으로 열리고 닫힌다.
- **Verification**: (TEST) FAQ 컴포넌트 단위 테스트로 4개 `<details>` 노드 카운트와 각 summary 텍스트 단언. (BROWSER) 아코디언 열림/닫힘 동작 스크린샷.

### REQ-011: 페이지 디자인이 DESIGN.md ElevenLabs 토큰과 일치한다
- **Priority**: Should
- **Description**: 페이지 전체 배경은 `--canvas` (`#f5f5f5`), 본문 텍스트는 `--ink`/`--body`, 디스플레이 헤더는 Waldenburg 300, 본문은 Inter, CTA는 near-black ink pill(primary) 또는 outline(secondary). 채도 높은 색은 사용하지 않으며, 액센트는 atmospheric gradient orb(mint/peach/lavender/sky) 만 허용.
- **Acceptance Criteria**: CSS Modules에서 색상은 모두 CSS 변수(`var(--canvas)`, `var(--ink)` 등)를 참조한다. 폰트 패밀리는 `'Waldenburg', serif` 또는 `'Inter', sans-serif` 만 사용. 하드코딩된 hex 색상은 gradient orb 정의 외에 등장하지 않는다.
- **Verification**: (BROWSER) Playwright MCP 스크린샷을 DESIGN.md 시각 가이드와 비교(수동 검수). 추가로 grep으로 CSS 모듈에서 `#[0-9a-fA-F]{3,6}` 매치 부재 확인(허용 리스트 제외).

### REQ-012: 모바일 반응형(≤768px)에서 모든 섹션이 1-column으로 적절히 스택된다
- **Priority**: Must
- **Description**: 모바일 뷰포트에서 Hero 텍스트, Problem/Solution 카드, Features 5개 카드, Pricing 3개 플랜 카드가 모두 가독성을 유지한 채 세로 스택된다. CTA 버튼은 풀-width로 확장.
- **Acceptance Criteria**: 375×667 뷰포트에서 가로 스크롤 없이 모든 콘텐츠가 보인다. 텍스트는 최소 14px 이상, 터치 타깃은 최소 44px.
- **Verification**: (BROWSER) Playwright MCP 모바일 뷰포트(iPhone SE, iPhone 14) 풀-페이지 스크린샷.

## Technical Design

### Architecture

**라우트 구조**
```
src/app/supertest/
├── page.tsx                       # 서버 컴포넌트, metadata + 5개 섹션 마운트
├── supertest.module.css           # 페이지 레벨 레이아웃·gradient orb 배경
├── data/
│   └── plans.ts                   # DISCOUNT_PERCENT, PLANS, TEST_SCHEDULE, 헬퍼
├── components/
│   ├── Hero.tsx                   # 헤드라인·배지·CTA (서버 컴포넌트, 'use client'는 스크롤 핸들러만 필요 시)
│   ├── Hero.module.css
│   ├── ProblemSolution.tsx        # 페인포인트/솔루션 2-column
│   ├── ProblemSolution.module.css
│   ├── Features.tsx               # 5-card 그리드
│   ├── Features.module.css
│   ├── TestScheduleTimeline.tsx   # 일정 타임라인 (Features 내부)
│   ├── GlobalTimeBox.tsx          # 국가별 시간 표시 (Features 내부, 클라이언트 가능)
│   ├── Pricing.tsx                # 3-tier 비교표
│   ├── Pricing.module.css
│   ├── FAQ.tsx                    # <details> 아코디언
│   └── FAQ.module.css
└── __tests__/
    ├── plans.test.ts              # getDiscountedPrice, 가격 계산
    ├── Pricing.test.tsx           # 할인가 표시·CTA href·target="_blank"
    ├── Features.test.tsx          # 카드 수, 일정 항목 수
    ├── FAQ.test.tsx               # <details> 카운트
    └── timezone.test.ts           # 국가별 시간 변환
```

**Header 변경**
- `src/app/components/Header.tsx`의 `NAV_ITEMS` 배열에 한 줄만 추가. 기존 스타일/Suspense 구조 그대로 사용.
- Header 단위 테스트는 `src/__tests__/Header.test.tsx`(없으면 신규 생성).

**컴포넌트 경계 (서버 vs 클라이언트)**
- 기본은 서버 컴포넌트. 데이터는 정적 상수에서 import → 모든 텍스트가 SSR/SSG로 노출되어 SEO 친화적.
- 클라이언트 컴포넌트가 필요한 경우:
  - `Hero` CTA의 부드러운 스크롤은 CSS `scroll-behavior: smooth` + 앵커 `href="#pricing"` 만으로 처리(`'use client'` 불필요).
  - `GlobalTimeBox`에서 사용자 로컬 타임존을 함께 표시할 경우만 `'use client'`. 정적 4개 타임존 표시면 서버 컴포넌트 유지.

**스타일 패턴**
- CSS Modules + Tailwind 혼합 (기존 Header와 동일). 페이지 레벨 레이아웃·반응형 미디어 쿼리는 `.module.css`, 유틸리티 간격·정렬은 Tailwind 클래스.
- 색상·폰트는 `src/app/globals.css`에 이미 정의된 CSS 변수를 사용. DESIGN.md 토큰이 globals.css에 미정의면 supertest.module.css 상단에 `:where(.root)` 스코프로 추가.

**할인 계산 로직**
```ts
// data/plans.ts
export const DISCOUNT_PERCENT = 30;

export function getDiscountedPrice(price: number, percent: number): number {
  return Math.round(price * (1 - percent / 100));
}
```

### Dependencies

- 신규 외부 의존성 없음. Next.js 16 App Router, TypeScript strict, Tailwind, CSS Modules 기존 스택만 사용.
- 외부 결제 링크 URL 4개(Live·Flex·Review)는 PRD/사업 측에서 받아 `PLANS[].checkoutUrl`에 하드코딩. 미정이면 `'#'` 플레이스홀더 후 PR 단계에서 채움.
- Playwright MCP는 기존 환경에 설치되어 있으므로 검증에만 사용.

## Traceability Matrix

| REQ ID  | Description                                              | Verification | Test File                                                 | Status  |
|---------|----------------------------------------------------------|--------------|-----------------------------------------------------------|---------|
| REQ-001 | Header NAV에 SuperTest 항목 추가                          | (TEST)       | `src/__tests__/Header.test.tsx`                           | Pending |
| REQ-002 | /supertest 라우트 5개 섹션 렌더                          | (TEST)       | `src/app/supertest/__tests__/page.test.tsx`               | Pending |
| REQ-003 | Hero 텍스트·배지·CTA 스크롤                              | (BROWSER)    | `e2e/supertest-hero.spec.ts` (Playwright MCP 수동 가능)   | Pending |
| REQ-004 | Problem & Solution 카드 5개 표시                         | (TEST)       | `src/app/supertest/__tests__/ProblemSolution.test.tsx`    | Pending |
| REQ-005 | Features 5개 카드 + 일정 리스트                          | (TEST)       | `src/app/supertest/__tests__/Features.test.tsx`           | Pending |
| REQ-006 | Pricing 3-tier 카드·할인가·외부 CTA                      | (TEST)       | `src/app/supertest/__tests__/Pricing.test.tsx`            | Pending |
| REQ-007 | 가격·할인율 상수 분리·계산 헬퍼                          | (TEST)       | `src/app/supertest/__tests__/plans.test.ts`               | Pending |
| REQ-008 | 2026 시험 일정 타임라인 시각화                           | (BROWSER)    | Playwright MCP 스크린샷 (모바일/데스크탑)                 | Pending |
| REQ-009 | 국가별 시험 시간 표시                                    | (TEST)       | `src/app/supertest/__tests__/timezone.test.ts`            | Pending |
| REQ-010 | FAQ 4개 아코디언                                          | (TEST)       | `src/app/supertest/__tests__/FAQ.test.tsx`                | Pending |
| REQ-011 | DESIGN.md ElevenLabs 토큰 준수                            | (BROWSER)    | Playwright MCP 스크린샷 + grep 검사                       | Pending |
| REQ-012 | 모바일 반응형 1-column 스택                              | (BROWSER)    | Playwright MCP 모바일 뷰포트 스크린샷                     | Pending |

## Implementation Order

### Step 1: Header NAV 항목 추가 (REQ-001)
- **Files**: `src/app/components/Header.tsx`, `src/__tests__/Header.test.tsx` (신규)
- **Dependencies**: 없음
- **Description**:
  - `NAV_ITEMS` 배열의 `/diagnosis` 항목 뒤에 `{ href: '/supertest', label: 'SuperTest' }` 삽입.
  - `Header.test.tsx`에서 RTL `render(<Header />)` 후 링크 존재·순서·href·active 스타일을 단언.
- **Satisfies**: REQ-001
- **TDD 순서**: Header.test.tsx 작성 → 실패 확인 → NAV_ITEMS 수정 → 통과 확인.

### Step 2: 데이터 상수 + 헬퍼 작성 (REQ-007, REQ-009 일부)
- **Files**:
  - `src/app/supertest/data/plans.ts` (신규)
  - `src/app/supertest/__tests__/plans.test.ts` (신규)
  - `src/app/supertest/__tests__/timezone.test.ts` (신규)
- **Dependencies**: Step 1 무관(병렬 가능)
- **Description**:
  - `DISCOUNT_PERCENT`, `LAUNCH_DATE`, `PLANS`, `TEST_SCHEDULE`, `getDiscountedPrice`, `getLocalStartTime` export.
  - `Plan`, `TestDate` 타입 정의.
  - `plans.test.ts`: `getDiscountedPrice(70000, 30) === 49000` 등 3개 케이스.
  - `timezone.test.ts`: 4개 타임존 변환 단언.
- **Satisfies**: REQ-007, REQ-009 (변환 함수 단위 테스트 부분)
- **TDD 순서**: 테스트 작성 → 실패 → 헬퍼 구현 → 통과.

### Step 3: page.tsx + 페이지 레벨 CSS + metadata (REQ-002, REQ-011 기초)
- **Files**:
  - `src/app/supertest/page.tsx` (신규)
  - `src/app/supertest/supertest.module.css` (신규)
  - `src/app/supertest/__tests__/page.test.tsx` (신규)
- **Dependencies**: Step 2 데이터 상수.
- **Description**:
  - `export const metadata: Metadata` 정의(title, description, openGraph).
  - Page 컴포넌트는 5개 섹션 컴포넌트(아직 빈 스텁) import 후 마운트.
  - `supertest.module.css`에 `--canvas` 배경, gradient orb 의사 요소 정의.
- **Satisfies**: REQ-002, REQ-011(레이아웃 토큰)
- **TDD 순서**: page.test.tsx에서 5개 section landmark 단언 → 빈 섹션 스텁 작성 → metadata title 단언 통과.

### Step 4: Hero 섹션 (REQ-003)
- **Files**:
  - `src/app/supertest/components/Hero.tsx` (신규)
  - `src/app/supertest/components/Hero.module.css` (신규)
- **Dependencies**: Step 2(DISCOUNT_PERCENT), Step 3(page 마운트 슬롯).
- **Description**: 헤드라인/서브카피/배지/CTA 마크업. 배지의 할인율은 `${DISCOUNT_PERCENT}%` 보간. CTA `<a href="#pricing">`.
- **Satisfies**: REQ-003
- **검증**: 단위 테스트로 4개 텍스트 존재 + CTA href === '#pricing'.

### Step 5: ProblemSolution 섹션 (REQ-004)
- **Files**: `ProblemSolution.tsx`, `ProblemSolution.module.css`, `__tests__/ProblemSolution.test.tsx`
- **Dependencies**: Step 3
- **Description**: 좌·우 2-column 그리드(모바일 1-column). 페인포인트 3카드 / 솔루션 2카드 정적 데이터는 컴포넌트 내부 const 배열 OK(가격 데이터 아님).
- **Satisfies**: REQ-004

### Step 6: Features 섹션 + 일정 타임라인 + 국가별 시간 (REQ-005, REQ-008, REQ-009 UI)
- **Files**:
  - `Features.tsx`, `Features.module.css`
  - `TestScheduleTimeline.tsx`
  - `GlobalTimeBox.tsx`
  - `__tests__/Features.test.tsx`
- **Dependencies**: Step 2(`TEST_SCHEDULE`, `getLocalStartTime`).
- **Description**:
  - 5개 카드 그리드.
  - 첫 번째 카드 내부에 `<TestScheduleTimeline schedule={TEST_SCHEDULE} />` 마운트.
  - 두 번째 카드 내부에 `<GlobalTimeBox />` 마운트(KST 09:00 기준 4개 타임존).
- **Satisfies**: REQ-005, REQ-008, REQ-009

### Step 7: Pricing 섹션 (REQ-006)
- **Files**: `Pricing.tsx`, `Pricing.module.css`, `__tests__/Pricing.test.tsx`
- **Dependencies**: Step 2(`PLANS`, `getDiscountedPrice`, `DISCOUNT_PERCENT`).
- **Description**:
  - `<section id="pricing">` (Hero CTA의 앵커).
  - 3개 플랜 카드를 grid로 렌더. 각 카드: 플랜명, `<s>{price.toLocaleString()}원</s>`, 할인가 강조, 기능 체크리스트, CTA 버튼.
  - CTA `<a href={plan.checkoutUrl} target="_blank" rel="noopener noreferrer">`.
- **Satisfies**: REQ-006
- **검증**: 각 카드 할인가 === `getDiscountedPrice(price, DISCOUNT_PERCENT)`, target/rel 속성 확인.

### Step 8: FAQ 섹션 (REQ-010)
- **Files**: `FAQ.tsx`, `FAQ.module.css`, `__tests__/FAQ.test.tsx`
- **Dependencies**: Step 3
- **Description**: 4개 Q&A 정적 데이터를 컴포넌트 내부 const 배열로. `<details><summary>` 사용. 첫 번째 항목은 `open` 속성 부여(기본 펼침).
- **Satisfies**: REQ-010

### Step 9: 반응형 마무리 + DESIGN.md 토큰 정합성 (REQ-011, REQ-012)
- **Files**: 각 섹션 `.module.css` 미디어 쿼리, `supertest.module.css` gradient orb.
- **Dependencies**: Step 4–8
- **Description**:
  - 모든 `.module.css`에서 hardcoded hex 제거 → `var(--*)` 치환.
  - 768px 이하 미디어 쿼리로 그리드 → 1-column 전환, CTA 풀-width.
- **Satisfies**: REQ-011, REQ-012
- **검증**: Playwright MCP로 데스크탑 1440px + 모바일 375px 풀-페이지 스크린샷.

### Step 10: 통합 검증 (모든 REQ)
- 모든 단위 테스트 통과 확인.
- `npm run typecheck` strict 통과.
- Playwright MCP로 `/supertest` 진입 → Hero CTA → Pricing 스크롤 → 외부 결제 링크 hover까지 1회 전 흐름 스크린샷.
- `wiki/log.md`에 `[WIKI]` 또는 `[FEATURE]` 태그로 변경 기록 append (위키 규칙 적용 영역이면).

## Testing Strategy

- **단위 테스트(Vitest + RTL)**:
  - `Header.test.tsx` — REQ-001
  - `plans.test.ts` — REQ-007 (계산 헬퍼 3 케이스)
  - `timezone.test.ts` — REQ-009 (타임존 변환 4 케이스)
  - `page.test.tsx` — REQ-002 (section landmark 5개, metadata title)
  - `ProblemSolution.test.tsx` — REQ-004 (카드 5개 제목 존재)
  - `Features.test.tsx` — REQ-005 (카드 5개, 일정 리스트 ≥4)
  - `Pricing.test.tsx` — REQ-006 (할인가 계산 일치, CTA target/rel)
  - `FAQ.test.tsx` — REQ-010 (`<details>` 4개 노드)

- **E2E/시각 검증(Playwright MCP)**:
  - REQ-003: Hero CTA 클릭 → Pricing 섹션 뷰포트 진입.
  - REQ-008: 일정 타임라인 가독성 (모바일/데스크탑).
  - REQ-011: DESIGN.md 토큰 시각 비교.
  - REQ-012: 모바일 뷰포트 풀-페이지.

- **커버리지 목표**: 비즈니스 로직(`plans.ts`, `timezone` 헬퍼) 90%+, 컴포넌트 80%+.

- **Mutation testing(선택)**: `getDiscountedPrice` 경계 조건(0%, 100%, 음수)에 대해 Stryker로 mutant 검출 — Must REQ-007 보강.

## Risks & Considerations

- **결제 링크 URL 미정**: PRD에 외부 결제 페이지 URL이 명시되지 않음. `PLANS[].checkoutUrl`을 임시 `'#'` 또는 `process.env.NEXT_PUBLIC_SUPERTEST_LIVE_URL` 등 ENV로 분리해 PR 단계에 사업측 URL 주입. 미주입 시 CTA가 동작하지 않을 위험 → Step 7 시작 시 사용자에게 URL 확정 요청.
- **할인 종료 시점 표기 부재**: "첫 할인 30%"의 종료일이 PRD에 없음. 기본은 무기한이되, `data/plans.ts`에 `DISCOUNT_END_DATE?: string` 옵션 필드를 미리 두어 추후 카운트다운 UI 확장 가능하도록 설계.
- **국가별 시간 표시 정확도**: DST(미국 서머타임)·국가별 정책 변동 가능. 정적 문자열 표기보다 `Intl.DateTimeFormat` + `timeZone` 옵션을 사용해 매번 빌드/렌더 시 계산하는 편이 안전. 단, 서버/클라 시간대 불일치(hydration mismatch) 주의 → 빌드 타임에 한 번 계산 후 prop으로 주입 권장.
- **이모지 사용 금지 규칙**: CLAUDE.md에서 위키 페이지에 이모지 금지. UI(Features 카드 아이콘)에서는 SVG 또는 inline 텍스트 라벨 사용. 이모지로 시각 강조 금지.
- **SEO 영향**: 신규 마케팅 페이지이므로 `metadata.openGraph.image`, `metadata.twitter.card`, `alternates.canonical` 추가 권장. `sitemap.ts`에 `/supertest` 항목 추가 필요(부속 작업).
- **헤더 nav 항목 증가로 모바일 가로 스크롤 부담**: 기존 5개 + SuperTest = 6개. 모바일에서 `nav` 컨테이너가 `overflow-x: auto`이긴 하나, "진단테스트"와 "SuperTest" 텍스트가 비슷한 길이라 시인성 우려. 라벨을 `SuperTest`(영문) 그대로 유지하면 가독성 OK — 한글로 변환할 경우 사용자 확인 필요.
- **A/B 또는 변동 가능 가격**: `DISCOUNT_PERCENT`를 ENV(`NEXT_PUBLIC_SUPERTEST_DISCOUNT`)로 노출하면 빌드 없이 변경 가능. 단순 상수보다 운영 유연성 + 1단계 추가 검토 필요.
- **테스트 일정표 격주 자동 생성**: 2026년 격주 일정(5/30, 6/13, 6/27, 7/11 …)을 수동 배열 대신 `addWeeks(startDate, n * 2)` 루프로 생성하면 유지보수 부담 감소. `date-fns` 사용(approved deps).

## Out of Scope

- 결제 처리 자체(외부 페이지 위임).
- 사용자 로그인/회원 상태 연동(현재는 공개 마케팅 페이지).
- 실시간 잔여 좌석·신청자 수 표시(요청 없음).
- 다국어(i18n) — 한국어 단일.
- 어드민에서 가격·일정·FAQ를 편집하는 CMS 기능(상수 파일 직접 수정).
- 이메일 캡처·뉴스레터 폼.
- 후기/평점 섹션(별도 `/reviews` 페이지 존재).
