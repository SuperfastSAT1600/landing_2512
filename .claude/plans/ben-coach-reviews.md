# Ben 학습코치 Reviews

## Overview

Add 10 student self-reflection style reviews ("학생 자기 정리 형식") for Ben 학습코치, mirroring the pattern already established for Dana Jung. The reviews are appended to `src/data/reviews.json` and surface automatically on `/coaches/[ben-slug]` (reviews tab) and `/reviews` because both routes read from `getPublishedReviews()` and filter by `coachSlug`.

**Key dependency**: Ben's exact coach slug must be retrieved from the Supabase `coaches` table before review content is generated and written. The slug controls both `coachSlug` field values and the public URL where reviews render. We must not guess (e.g. "ben", "ben_oh", "ben_lee") — the existing `coaches` row is the source of truth.

The work is a pure content addition. No new components, routes, libraries, or database schema changes are required. All rendering, filtering, and tab UI already exist from the Dana Jung rollout.

## Requirements

### REQ-001: Ben coach exists and active in Supabase `coaches` table
- **Priority**: Must
- **Description**: Verify a row exists in the `coaches` table whose `name` matches "Ben" (or the Korean equivalent used in admin) with `is_active = true`. If no row exists, create one with appropriate `slug`, `name`, `photo`, `bio`, `subjects`, and post slugs. The slug returned by this step becomes the contract for REQ-002–REQ-005.
- **Acceptance Criteria**: `getCoachBySlug(<ben-slug>)` returns a `CoachData` object with `isActive: true` and a non-empty `name`. The slug is recorded in the spec's "Resolved Slug" note before any review content is authored.
- **Verification**: (MANUAL) Query Supabase admin UI or run `getCoaches()` from a debug script and confirm Ben's row. Manual because this is a one-time DB inspection, not behavior to regress.

### REQ-002: Generate 10 student self-reflection reviews matching Dana Jung tone
- **Priority**: Must
- **Description**: Produce 10 `ReviewData` objects authored in first-person student perspective ("학생 자기 정리 형식"). Each must describe a specific learning breakthrough or "aha moment" with Ben, mention concrete SAT skill areas tied to Ben's actual `subjects` (read from Supabase row in REQ-001), and use 3–5 conversational sentences in the `content` field. Required field values:
  - `id`: `ben-r-001` through `ben-r-010` (sequential, lowercase, hyphen-separated)
  - `title`: 1 short Korean sentence naming the breakthrough (no quotes around the whole title)
  - `author`: anonymized handle in the form `xxxx####***` (4–8 letter prefix + 2–4 digits + `***`), 10 distinct values
  - `authorType`: `"Student"` for all 10
  - `grade`: mix of `"9학년"`, `"10학년"`, `"11학년"`, `"12학년"` — at least 2 grades represented, no single grade more than 4 reviews
  - `category`: `"수업 후기"` for all 10
  - `rating`: `5` for all 10
  - `content`: 3–5 sentences, Korean, conversational, references Ben's subject areas concretely (e.g. specific skill tied to the subjects from REQ-001)
  - `date`: format `YYYY.MM.DD`, spread across the window `2025.09.01`–`2026.05.10`, no two reviews on the same calendar day, ordered so newest dates come first when sorted descending
  - `marketingConsent`: `true`
  - `rewardType`: `"Legacy"`
  - `contact`: `""`
  - `status`: `"published"`
  - `isFeatured`: `true` for `ben-r-001` and `ben-r-002`, `false` for the remaining 8 (matches Dana's 1–2 featured pattern)
  - `coachSlug`: equal to the slug resolved in REQ-001 (exact string match)
- **Acceptance Criteria**: A 10-element JSON array exists in a staging buffer (or PR diff) where every object passes the `ReviewData` interface and the field rules above. No two `id`, `author`, or `date` values are duplicated. Each `content` is between 120 and 600 characters.
- **Verification**: (TEST) Unit test in `src/__tests__/ben-reviews.test.ts` reads `reviews.json`, filters by `coachSlug === <ben-slug>`, and asserts: array length is 10, all IDs match the regex `^ben-r-0(0[1-9]|10)$`, exactly 2 are `isFeatured`, every entry has `status === 'published'`, `rating === 5`, `authorType === 'Student'`, `category === '수업 후기'`, `marketingConsent === true`, `rewardType === 'Legacy'`, dates parse and fall within the allowed window, IDs/authors/dates are unique.

### REQ-003: Append the 10 reviews to `src/data/reviews.json` without disturbing existing entries
- **Priority**: Must
- **Description**: Add the 10 Ben review objects to the existing JSON array. Existing Dana Jung entries (and any others) must be byte-identical before vs. after the edit aside from the appended elements and the closing bracket. The file must remain valid JSON, indented 4 spaces (matching current style), and parseable by `getReviews()`.
- **Acceptance Criteria**: `JSON.parse(fs.readFileSync('src/data/reviews.json'))` returns an array whose length equals `previousLength + 10`. All previously-present `id` values still exist. `git diff src/data/reviews.json` shows only additions, no modifications, no deletions.
- **Verification**: (TEST) Unit test in `src/__tests__/ben-reviews.test.ts` (same file as REQ-002) asserts: `getReviews()` length increased by exactly 10 versus a snapshot of pre-existing Dana IDs; every Dana ID from the pre-existing set still resolves via `reviews.find(r => r.id === danaId)`; the file passes `JSON.parse` with no error.

### REQ-004: Ben's coach page renders the reviews tab with the new reviews
- **Priority**: Must
- **Description**: Navigating to `/coaches/<ben-slug>` and clicking the "수업 후기" tab must display all 10 Ben reviews using the existing `ReviewCard` rendering in `CoachPageClient.tsx`. The gradient header "수강생들의 생생한 후기." and the subtitle "<Ben의 표시 이름> 코치님과 목표를 달성한 / 모든 학생들의 이야기를 확인해보세요." must appear. No code change to `CoachPageClient.tsx` should be needed — this is a verification that existing filtering (`allReviews.filter(r => r.coachSlug === slug)` at `src/app/coaches/[slug]/page.tsx:95`) picks up the new entries automatically.
- **Acceptance Criteria**: Reviews tab shows 10 review cards. Gradient header text and Ben-personalized subtitle render. No console errors. The empty-state copy "아직 등록된 후기가 없습니다." does NOT appear.
- **Verification**: (BROWSER) Playwright MCP: start dev server, navigate to `/coaches/<ben-slug>`, click the "수업 후기" tab, screenshot the section, confirm 10 `ReviewCard` elements render and the subtitle contains Ben's name from the Supabase row.

### REQ-005: Main `/reviews` page lists Ben's reviews alongside Dana's
- **Priority**: Must
- **Description**: The public `/reviews` page already calls `getPublishedReviews()` (no `coachSlug` filter), so adding Ben rows with `status: "published"` must cause them to appear without any code change. This requirement is a verification gate to ensure the rollout did not regress the main reviews page (e.g. by introducing invalid JSON or accidentally setting `status: "pending"`).
- **Acceptance Criteria**: `/reviews` lists at least `previousPublishedCount + 10` reviews. At least one card whose `id` starts with `ben-r-` is visible.
- **Verification**: (BROWSER) Playwright MCP: navigate to `/reviews`, search the DOM for a card matching `ben-r-001` (by content snippet from REQ-002 entry 1) and confirm it renders.

## Technical Design

### Architecture

Pure content addition. No new files, no schema migrations, no library imports. The work touches:

- **Read**: `src/lib/coaches-data.ts` → `getCoachBySlug` (or admin UI) to confirm REQ-001
- **Write**: `src/data/reviews.json` — append 10 entries (REQ-003)
- **Write**: `src/__tests__/ben-reviews.test.ts` — new unit test file covering REQ-002 + REQ-003
- **Verify (read-only at runtime)**:
  - `src/app/coaches/[slug]/page.tsx:95` already filters by `coachSlug`
  - `src/app/coaches/[slug]/CoachPageClient.tsx:253–278` already renders the reviews tab with gradient header and `ReviewCard` map
  - `src/app/reviews/page.tsx` (and equivalent route) already aggregates via `getPublishedReviews`

The `ReviewData` interface and JSON schema are unchanged. The `coachSlug` field already exists and is optional, so no migration of older entries is required.

### Tone & Style Constraints for Generated Content (REQ-002)

Anchor against the 10 existing Dana Jung entries (`dana-r-001` through `dana-r-010` in `src/data/reviews.json`). Patterns to mirror:

- **First-person voice**: "저는...", "처음엔...", "근데...", "이제는..."
- **Specific breakthrough**: identify ONE change in how the student approaches the subject (e.g. RW text-evidence discipline, Math problem-reading habit, panic recovery in test conditions)
- **Coach attribution**: at least one line quotes or paraphrases something Ben said
- **Outcome framing**: shift from technique to internal change ("점수보다 저한테는 더 큰 변화예요")
- **Avoid**: bullet lists, marketing language, score numbers (e.g. "1500점"), parent voice, English brand names

Sentence count target: 3–5 in `content`. Title under 30 characters, declarative, no question marks.

### Dependencies

- **Hard dependency**: Ben's slug from Supabase `coaches` table (blocks REQ-002 → REQ-005). Resolve before writing review content.
- **Soft dependency**: Knowledge of Ben's `subjects` array (RW only? Math only? Both? Other?) drives the skill areas referenced in `content`. If `subjects` is empty in Supabase, populate that field as part of REQ-001 before generating review content.
- No new npm packages.

## Traceability Matrix

| REQ ID  | Description                                            | Verification | Test/Check Location                                    | Status  |
|---------|--------------------------------------------------------|--------------|--------------------------------------------------------|---------|
| REQ-001 | Ben coach row exists & active in Supabase              | (MANUAL)     | Supabase admin UI / debug `getCoachBySlug` call        | Pending |
| REQ-002 | 10 reviews authored in Dana-style with required fields | (TEST)       | `src/__tests__/ben-reviews.test.ts`                    | Pending |
| REQ-003 | reviews.json appended cleanly (no existing entries modified) | (TEST)  | `src/__tests__/ben-reviews.test.ts`                    | Pending |
| REQ-004 | Coach page reviews tab renders 10 cards + gradient header | (BROWSER) | Playwright MCP screenshot of `/coaches/<ben-slug>` reviews tab | Pending |
| REQ-005 | `/reviews` lists merged Dana + Ben reviews             | (BROWSER)    | Playwright MCP screenshot of `/reviews` showing `ben-r-001` | Pending |

## Implementation Order

1. **REQ-001** — Resolve Ben's slug & subjects in Supabase. Blocks everything; no review can be written without the slug, and `content` quality depends on knowing the subjects. Record the resolved slug at the top of the spec (e.g. "Resolved Slug: `ben`") before continuing.
2. **REQ-002** — Generate the 10 review objects in a staging buffer. Self-review against the Dana style anchors (first-person, breakthrough, coach attribution) before serializing.
3. **REQ-003** — Append to `src/data/reviews.json` with 4-space indentation. Run `node -e "JSON.parse(require('fs').readFileSync('src/data/reviews.json'))"` to confirm validity.
4. **REQ-002 + REQ-003 tests** — Write `src/__tests__/ben-reviews.test.ts` covering both requirements. Run `npm test ben-reviews` until green.
5. **REQ-004** — Start dev server, navigate to `/coaches/<ben-slug>`, click 수업 후기 tab, screenshot via Playwright MCP, attach to PR.
6. **REQ-005** — Same dev server session: navigate to `/reviews`, confirm `ben-r-001` content snippet is present in DOM, screenshot.

## Risks & Considerations

- **Risk: slug guessed instead of resolved** → URLs 404 or coach page renders empty reviews tab. **Mitigation**: REQ-001 is gated as Must with a (MANUAL) verification before content is authored. Reject any review draft whose `coachSlug` is set before REQ-001 records the resolved value.
- **Risk: Ben's subjects differ from Dana's (e.g. Math-only, or Essay)** → Generated content drifts toward Dana's RW + Math tropes and feels inauthentic. **Mitigation**: Read `subjects` from the Supabase row in REQ-001 and constrain each review's referenced skill area to that list. If only one subject, all 10 reviews discuss that subject; if two, split roughly 5/5 or 6/4.
- **Risk: JSON corruption from manual edit** → `getReviews()` returns `[]` (catch block at `src/lib/reviews-data.ts:35`) and the entire site loses all reviews silently. **Mitigation**: REQ-003 test asserts post-edit array length equals pre-edit length + 10. Run the JSON.parse smoke check before committing.
- **Risk: Date collision with existing Dana reviews** → Visually fine but feels machine-generated when sorted. **Mitigation**: REQ-002 requires unique dates across all 10 Ben reviews and the spec's date window (`2025.09.01`–`2026.05.10`) is wide enough that 10 unique dates is trivial.
- **Risk: Content rated as AI-generated by readers** → Erodes trust. **Mitigation**: Anchor language patterns directly to existing Dana reviews (specific quoted coach phrases, internal-change framing, no score numbers). Diverse author handles and grades. Review pass before commit.
- **Risk: `isFeatured: true` rules surface Ben reviews on the homepage hero unintentionally** → `getFeaturedReviewsData()` returns the first 3 featured-published reviews; adding 2 Ben featured entries may push out a Dana entry. **Mitigation**: Acceptable per requirements (matches Dana pattern). If unwanted, set all Ben reviews to `isFeatured: false` and note the deviation. Confirm with stakeholder before commit if hero composition is sensitive.

## Out of Scope

- Translating reviews to English or other languages.
- Modifying `ReviewCard`, `CoachPageClient`, or `/reviews` page rendering logic.
- Adding admin UI for inputting coach-specific reviews (existing `/admin/reviews` is sufficient if used).
- Generating reviews for any coach other than Ben.
- Backfilling `coachSlug` on existing non-Dana, non-Ben reviews.
- Updating Ben's bio, photo, or curriculum post (handled separately if needed; REQ-001 only requires the row to exist and be active).
