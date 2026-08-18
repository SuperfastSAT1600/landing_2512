---
feature: blog-readability-light-mode
type: ui
status: planned
---

# Blog Readability: Light Mode + Column Narrowing

## Feature Overview

`/blog/[slug]` 페이지만 라이트 모드로 전환하고, 콘텐츠 열 너비를 ~680px로 좁혀 읽기 피로를 줄인다.
홈/어드민/랜딩 등 나머지 페이지는 다크모드 유지.

**Scope**: `/blog/[slug]/*` 파일군만 수정. 공유 컴포넌트(Footer 등) 미수정.

---

## Requirements

### REQ-001: 블로그 아티클 페이지 라이트 배경
- **Description**: `/blog/[slug]` 페이지 배경이 `#fafaf9`, 본문 텍스트가 `#1a1a1a`로 렌더링된다
- **Verification**: (BROWSER)
- **Priority**: Must

### REQ-002: 내비게이션 라이트 테마
- **Description**: 상단 nav가 흰색 배경 + 어두운 링크 텍스트로 표시된다
- **Verification**: (BROWSER)
- **Priority**: Must

### REQ-003: prose 클래스 라이트 모드 전환
- **Description**: `prose-invert` 제거 → 텍스트/헤딩이 어두운 색으로 렌더링. 링크는 `text-blue-600`
- **Verification**: (BROWSER)
- **Priority**: Must

### REQ-004: GateWall 라이트 테마
- **Description**: 잠금 패널이 흰색 카드 형태로, 입력창·텍스트 모두 라이트 팔레트로 표시된다
- **Verification**: (BROWSER)
- **Priority**: Must

### REQ-005: 콘텐츠 열 너비 680px
- **Description**: article 콘텐츠 열이 `max-w-[680px]`로 제한되어 1행 45-65자가 유지된다
- **Verification**: (BROWSER)
- **Priority**: Must

### REQ-006: 관련 포스팅 섹션 라이트 카드
- **Description**: 하단 "이 글도 읽어보세요" 카드가 흰색 배경 + 회색 테두리로 표시된다
- **Verification**: (BROWSER)
- **Priority**: Should

---

## Traceability Matrix

| REQ ID  | Description             | Verification | File                                        |
|---------|-------------------------|-------------|---------------------------------------------|
| REQ-001 | 라이트 배경             | (BROWSER)   | `src/app/blog/[slug]/page.tsx`              |
| REQ-002 | nav 라이트              | (BROWSER)   | `src/app/blog/[slug]/page.tsx`              |
| REQ-003 | prose 라이트            | (BROWSER)   | `src/app/blog/[slug]/PostContent.tsx`       |
| REQ-004 | GateWall 라이트         | (BROWSER)   | `src/app/blog/[slug]/GateWall.tsx`          |
| REQ-005 | 열 너비 680px           | (BROWSER)   | `src/app/blog/[slug]/page.tsx`              |
| REQ-006 | 관련글 카드 라이트       | (BROWSER)   | `src/app/blog/[slug]/page.tsx`              |

---

## Implementation Steps

**Step 1: page.tsx — 배경, nav, 열 너비, 관련글 카드**
- `bg-[#151719]` → `bg-[#fafaf9]`
- nav: `bg-[#151719]/80` → `bg-white/90`, 텍스트/보더 어둡게
- article: `max-w-4xl` → `max-w-[680px]`
- 제목: `text-white` → `text-gray-900`
- 관련글 카드: `bg-[#1C1F23]` → `bg-white`, 보더 gray-200
- Satisfies: REQ-001, REQ-002, REQ-005, REQ-006
- Complexity: Low

**Step 2: PostContent.tsx — prose 라이트 + 태그 색**
- `prose-invert` 제거
- `prose-headings:text-white` → `prose-headings:text-gray-900`
- `prose-a:text-blue-400` → `prose-a:text-blue-600`
- 태그 칩: `bg-white/5 text-gray-400 border-white/5` → `bg-gray-100 text-gray-600 border-gray-200`
- border-t: `border-white/10` → `border-gray-200`
- Satisfies: REQ-003
- Complexity: Low

**Step 3: GateWall.tsx — 라이트 테마**
- 미리보기 텍스트: `text-gray-300` → `text-gray-700`
- 페이드 그라디언트: `from-[#151719]` → `from-[#fafaf9]`
- 패널: `bg-[#1a1d20] border-white/10` → `bg-white border-gray-200`
- 헤더: `bg-white/[0.02] border-white/10` → `bg-gray-50 border-gray-100`
- 텍스트: white → gray-900, gray-500 → gray-600
- 입력창: `bg-[#0f1013] text-white border-white/10` → `bg-gray-50 text-gray-900 border-gray-300`
- 잠금해제 버튼: 동일 (blue-600 유지)
- Satisfies: REQ-004
- Complexity: Low

---

## Light Mode Color Palette

| Token | Value | 용도 |
|---|---|---|
| Page bg | `#fafaf9` | 페이지 전체 배경 |
| Surface | `#ffffff` | 카드, 패널 |
| Surface-alt | `#f9fafb` (gray-50) | 헤더 서브섹션 |
| Text primary | `#111827` (gray-900) | 제목, 강조 |
| Text body | `#374151` (gray-700) | 본문 |
| Text muted | `#6b7280` (gray-500) | 날짜, 메타 |
| Border | `#e5e7eb` (gray-200) | 카드, 구분선 |
| Accent | `#2563eb` (blue-600) | 링크, CTA |

---

## Risks & Considerations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Footer가 다크모드라 contrast 충돌 | Medium | Footer는 `mt-auto` 독립 컴포넌트 — 색상 충돌 없음 (별도 bg) |
| prose 기본값이 라이트 전제라 깨질 수 있음 | Low | `prose-invert` 제거만으로 기본 라이트 prose 동작 |
| GateWall 그라디언트 페이드 색상 | Low | from-color를 page bg(`#fafaf9`)와 맞추면 자연스러움 |
