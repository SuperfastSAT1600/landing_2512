# Spec: E2E Tests — Hero CTA + Blog Connection

## Context
Hero CTA가 Supabase `site_config`의 `hero.ctaLink`를 읽어 블로그 포스트로 링크함.
해당 포스트가 DB에 없으면 `getPostData` throw → 500 에러. 이 흐름 전체를 Playwright E2E로 검증.

## Requirements

### REQ-001 (BROWSER): Hero CTA 버튼 visible + href가 `/blog/` 경로를 가리킴
Hero 페이지에서 primaryBtn(Link) visible, href !== `/curriculum`, href matches `/^\/blog\//`

### REQ-002 (BROWSER): CTA 링크 블로그 포스트 페이지 HTTP 200 반환
CTA href → goto → status 200, `text=Application error` not visible

### REQ-003 (BROWSER): `/blog` 목록 페이지 200 + 포스트 카드 1개 이상
`/blog` goto → status 200 → `a[href^="/blog/"]` count > 0

### REQ-004 (BROWSER): 카테고리 필터 3개 각각 200 + 올바른 h1
`/blog?category=SAT RW` → h1 'SAT 리딩 & 라이팅'
`/blog?category=SAT Math` → h1 'SAT 수학 완전 정복'
`/blog?category=입시뉴스` → h1 '미국 대학 입시 뉴스'

### REQ-005 (BROWSER): 목록 첫 번째 포스트 클릭 → 개별 포스트 200
`/blog` → 첫 번째 `a[href^="/blog/"]` → goto → status 200 → `article h1, main h1` visible

### REQ-006 (BROWSER): 헤더 nav 카테고리 링크 3개 href 확인 + 200 반환
home → nav 링크 3개 href 확인 → 각각 goto → status 200

## Files
- Created: `tests/e2e/hero-blog.spec.ts`
- Ref: `tests/e2e/blog-editor.spec.ts`
- Ref: `src/app/components/Hero.tsx:33`
- Ref: `src/lib/config.ts:29`
