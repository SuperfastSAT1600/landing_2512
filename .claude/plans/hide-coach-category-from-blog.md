# Hide "학습코치" Category Posts from /blog Section

## Overview

The site has two distinct sections — **SAT학습팁** (`/blog`) and **학습코치** (`/coaches`). Posts authored by coaches are tagged with the category `학습코치` in the admin editor so they can surface on the coach profile pages. These posts are currently leaking into the SAT학습팁 section: they appear in the `/blog` "전체" tab, are reachable via `/blog?category=학습코치`, and may render in the home page `LatestPosts` (SAT학습팁) section. They must be made completely invisible inside the blog surface while remaining fully functional inside the coaches surface and admin editor.

The fix applies a view-layer filter at the blog page and home `LatestPosts` page, rather than mutating the data layer. Coach profile pages fetch posts by `author` (not by `category`), so they are not impacted. The data-layer helper `getSortedPostsData()` stays general-purpose.

## Requirements

### REQ-001: "전체" tab on /blog excludes 학습코치 posts
- **Priority**: Must
- **Description**: When `/blog` is visited with no `category` and no `tag` search param, posts whose `category` equals `'학습코치'` (case-insensitive, trimmed) MUST be filtered out before being passed to `BlogList`.
- **Acceptance Criteria**: Given a dataset with mixed categories, visiting `/blog` returns 0 posts where `category === '학습코치'`. Existing posts in `SAT RW`, `SAT Math`, `입시뉴스`, and uncategorized still appear.
- **Verification**: (TEST) Unit test on the filter helper `excludeCoachCategory(posts)` in `src/lib/__tests__/posts-filter.test.ts`.

### REQ-002: /blog?category=학습코치 URL returns no posts
- **Priority**: Must
- **Description**: When `/blog` is visited with `category=학습코치` (URL-encoded or raw), the page MUST short-circuit and pass an empty post array to `BlogList`. The empty-state message ("이 카테고리에 아직 글이 없습니다.") is acceptable display. The SEO `categoryMeta` entry for `'학습코치'` MUST also be removed so the page does not advertise the category in metadata.
- **Acceptance Criteria**: Rendering `Blog({ searchParams: { category: '학습코치' } })` returns a tree with 0 post cards. `generateMetadata({ searchParams: { category: '학습코치' } })` returns the default blog metadata (not the coach-specific one).
- **Verification**: (TEST) Integration test on `src/app/blog/__tests__/page.test.tsx` rendering the page component with `category=학습코치` and asserting zero posts plus default metadata.

### REQ-003: Home page LatestPosts excludes 학습코치 posts
- **Priority**: Must
- **Description**: The home page SAT학습팁 section (`src/app/components/LatestPosts.tsx`) MUST apply the same exclusion filter before passing posts to `BlogList`.
- **Acceptance Criteria**: Rendering `<LatestPosts />` produces zero post cards whose category is `'학습코치'`.
- **Verification**: (TEST) Component test on `src/app/components/__tests__/LatestPosts.test.tsx` with mocked `getSortedPostsData()` returning a mixed dataset; assert no `학습코치` post is rendered.

### REQ-004: Admin editor and coach profile pages are unaffected
- **Priority**: Must
- **Description**: The admin editor MUST continue to offer `'학습코치'` as a selectable category. Coach profile pages at `/coaches/[slug]` MUST continue to list every published post written by that coach (queried by `author`, not by `category`), including ones whose `category === '학습코치'`.
- **Acceptance Criteria**: The string `'학습코치'` still appears in `src/app/admin/editor/page.tsx` category options. `fetchArticlesByCoach()` in `src/app/coaches/[slug]/page.tsx` is unchanged and still returns posts regardless of category.
- **Verification**: (MANUAL) Code review of the diff — no edits to `src/app/admin/editor/page.tsx` or `src/app/coaches/[slug]/page.tsx`.

### REQ-005: Visual confirmation on /blog and home
- **Priority**: Should
- **Description**: After deploy/dev-server start, visiting `/` and `/blog` in a browser must visually confirm no card displays the `학습코치` badge.
- **Acceptance Criteria**: Manual Playwright MCP screenshot of `/blog` (default) and `/` showing only `SAT RW`, `SAT Math`, `입시뉴스`, or other approved category badges.
- **Verification**: (BROWSER) Playwright MCP screenshot of `/blog` and `/` after applying changes.

## Technical Design

### Architecture

The fix lives at the **view layer**, not the data layer. This preserves the generality of `getSortedPostsData()` (still used elsewhere, e.g., if any feed or sitemap needs all posts) and keeps the coach data path untouched.

```
src/
├── lib/
│   ├── posts.ts                       (unchanged)
│   └── posts-filter.ts                (NEW — exports excludeCoachCategory + HIDDEN_BLOG_CATEGORIES)
├── app/
│   ├── blog/page.tsx                  (MODIFIED — apply filter, drop 학습코치 from categoryMeta/headerContent)
│   └── components/LatestPosts.tsx     (MODIFIED — apply filter)
```

**Why a separate `posts-filter.ts` module?**
- One source of truth for "categories the blog surface must hide" — the constant `HIDDEN_BLOG_CATEGORIES = ['학습코치']` can grow later without touching multiple files.
- Pure function, trivial to unit-test.
- Avoids coupling the filter to React component code.

**Helper contract:**
```typescript
// src/lib/posts-filter.ts
import type { PostData } from './posts';

export const HIDDEN_BLOG_CATEGORIES = ['학습코치'] as const;

export function excludeCoachCategory(posts: PostData[]): PostData[] {
  return posts.filter(p => !HIDDEN_BLOG_CATEGORIES.includes(
    (p.category ?? '').trim() as typeof HIDDEN_BLOG_CATEGORIES[number]
  ));
}
```

**Blog page change** (`src/app/blog/page.tsx`):
1. Import `excludeCoachCategory` and `HIDDEN_BLOG_CATEGORIES`.
2. After the existing `getSortedPostsData() / getPostsByCategory(category) / getPostsByTag(tag)` branch, run the result through `excludeCoachCategory()` **only when no category was explicitly requested OR when the requested category is in `HIDDEN_BLOG_CATEGORIES`**. The simplest safe rule: if `category` is in `HIDDEN_BLOG_CATEGORIES`, return `[]`; otherwise, if `category` is empty and no tag is set, apply `excludeCoachCategory()`. When the user filters by `SAT RW` etc., no extra filtering is needed (the category query already excludes 학습코치).
3. Remove the `'학습코치'` entry from `categoryMeta` and `headerContent` so the page no longer advertises coach-column metadata. This also satisfies REQ-002's metadata clause.

**LatestPosts change** (`src/app/components/LatestPosts.tsx`):
1. Import `excludeCoachCategory`.
2. Wrap `allPosts` with `excludeCoachCategory(allPosts)` before passing to `BlogList`.

### Dependencies
None. No new packages. Uses existing `PostData` type from `src/lib/posts.ts`.

### Edge Cases & Notes
- `category` field in the DB is a free-form string; treat it case-sensitively as `'학습코치'`. We do not currently see variants like `' 학습코치 '` in production, but we trim defensively in the filter.
- `getPostsByCategory(category)` uses `.ilike('category', '%${category}%')`, meaning a category like `'SAT RW'` will NOT match `'학습코치'`, so the SAT RW tab is naturally clean — no additional filtering required for non-hidden categories.
- A future feed/RSS endpoint that consumes `getSortedPostsData()` directly will still get all posts including `학습코치`; if that's undesirable later, the consumer can call `excludeCoachCategory()`. Not in scope here.
- The `/blog/[slug]` post detail page is NOT filtered. A direct deep-link to a `학습코치` post remains accessible (out of scope; the user only asked to hide them from listings).

## Traceability Matrix

| REQ ID  | Description                                              | Verification | Test File / Check Location                                          | Status  |
|---------|----------------------------------------------------------|--------------|---------------------------------------------------------------------|---------|
| REQ-001 | "전체" tab excludes 학습코치 posts                       | (TEST)       | `src/lib/__tests__/posts-filter.test.ts`                            | Pending |
| REQ-002 | /blog?category=학습코치 returns empty + clean metadata   | (TEST)       | `src/app/blog/__tests__/page.test.tsx`                              | Pending |
| REQ-003 | LatestPosts (home) excludes 학습코치 posts               | (TEST)       | `src/app/components/__tests__/LatestPosts.test.tsx`                 | Pending |
| REQ-004 | Admin editor and coach profile unaffected                | (MANUAL)     | Diff review: editor + coaches files untouched                       | Pending |
| REQ-005 | Visual confirmation on /blog and /                       | (BROWSER)    | Playwright MCP screenshot of `/blog` and `/`                        | Pending |

## Implementation Order

1. **REQ-001** — Create `src/lib/posts-filter.ts` with `excludeCoachCategory` + `HIDDEN_BLOG_CATEGORIES`. Write unit test first (TDD red), then implement (green). Foundation for the rest.
2. **REQ-003** — Apply filter in `LatestPosts.tsx`. Smaller surface area than the blog page, good warm-up. Add component test.
3. **REQ-002** — Apply filter in `blog/page.tsx` for the no-category branch, short-circuit `category === '학습코치'` to an empty array, and remove `'학습코치'` from `categoryMeta` + `headerContent`. Add integration test.
4. **REQ-004** — Verify (read-only) that `src/app/admin/editor/page.tsx` and `src/app/coaches/[slug]/page.tsx` were not edited. This is a diff check, not code.
5. **REQ-005** — Start dev server, take Playwright screenshots of `/blog` and `/` to confirm no `학습코치` badges.

## Testing Strategy

- **REQ-001** → Unit test in `src/lib/__tests__/posts-filter.test.ts`:
  - Filters out `category === '학습코치'`
  - Keeps `SAT RW`, `SAT Math`, `입시뉴스`, undefined category
  - Trims whitespace before comparing
  - Returns a new array (no mutation)
- **REQ-002** → Integration test in `src/app/blog/__tests__/page.test.tsx`:
  - Mock `getSortedPostsData` and `getPostsByCategory`
  - Rendering with `category=학습코치` → 0 cards
  - `generateMetadata({ searchParams: { category: '학습코치' } })` → default title (not coach-specific)
- **REQ-003** → Component test in `src/app/components/__tests__/LatestPosts.test.tsx`:
  - Mock `getSortedPostsData` returning mixed categories
  - Assert no rendered card has the `학습코치` badge
- **REQ-004** → Manual diff inspection (not automated): confirm zero changes to admin editor or coach page files.
- **REQ-005** → Playwright MCP screenshot after dev server start.

## Risks & Considerations

- **Risk**: A `unstable_cache` warmed with `학습코치`-including data won't auto-invalidate. **Mitigation**: filtering happens *after* the cached fetch, so cache contents don't matter — the filter runs every render.
- **Risk**: A coach later renames their category to `'코치칼럼'` or similar variant. **Mitigation**: `HIDDEN_BLOG_CATEGORIES` is a single array — add new strings as needed. Documented in the helper file.
- **Risk**: Direct URL `/blog/[slug]` to a `학습코치` post is still reachable. **Out of scope**: user explicitly asked for invisibility in listings, not access denial. If needed later, add a redirect in `/blog/[slug]/page.tsx` when `post.category === '학습코치'` to `/coaches/[author-slug]`.
- **Risk**: Sitemap/RSS may still expose `학습코치` posts via `getSortedPostsData()`. **Out of scope** for this change; flag for future review if it matters for SEO.
- **Risk**: Hardcoded string `'학습코치'` could drift from the editor's option list. **Mitigation**: keep it in `HIDDEN_BLOG_CATEGORIES` constant so it's grep-able and reviewable in one place.

## Out of Scope

- Removing `'학습코치'` from the admin editor's category dropdown (must stay — coaches need to write coach posts).
- Filtering the `/blog/[slug]` post detail page (deep links remain functional).
- Filtering sitemap / RSS / any other public list that reads `getSortedPostsData()` directly.
- Database migration to rename or move existing `학습코치` posts.
- Redirecting `/blog?category=학습코치` to `/coaches` (returning an empty list is the chosen UX; a redirect is a possible follow-up).
