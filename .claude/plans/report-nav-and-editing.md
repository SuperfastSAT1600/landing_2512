# Report Navigation and Human Insight Editing

## Overview

Two features for the SuperfastSAT diagnostic report page (`/reports/[resultId]`):

1. **Bilingual Section Headers + In-Page Chapter Navigation** - Korean parents on mobile need bilingual (Korean + English) section headers and a sticky chapter navigation bar to jump between report sections quickly.

2. **Human Insight Editing (Admin Override)** - Tutors/admins need the ability to review and override AI-generated insight text before parents see it. Edited versions persist in the database and take priority over generated text.

---

## Requirements

### REQ-001: ChapterNav sticky pill navigation
- **Priority**: Must
- **Description**: A `ChapterNav` client component renders a horizontal row of pill buttons for 4 chapters. Sticks below toolbar (~48px). Mobile: horizontal scroll with hidden scrollbar. Click smooth-scrolls to `#section-0N` anchor.
- **Acceptance Criteria**: Pill tap scrolls to matching section. Bar stays visible while scrolling.
- **Verification**: (BROWSER) Verify sticky position, tap each pill, confirm scroll target.

### REQ-002: Active chapter pill highlight via IntersectionObserver
- **Priority**: Must
- **Description**: `IntersectionObserver` watches section elements and highlights the pill for the currently-visible section.
- **Acceptance Criteria**: Active pill updates on scroll matching visible section.
- **Verification**: (BROWSER) Scroll through report, verify active pill changes.

### REQ-003: Section anchor IDs
- **Priority**: Must
- **Description**: Each section in page.tsx gets id: section-01 through section-04.
- **Acceptance Criteria**: querySelectorAll returns exactly 4 section elements.
- **Verification**: (TEST) E2E test asserts 4 section IDs exist.

### REQ-004: Bilingual SectionHeader component
- **Priority**: Must
- **Description**: SectionHeader replaces SectionLabel. Shows number badge, Korean title (22px/800), English subtitle (13px/400 muted), optional parent question.
- **Acceptance Criteria**: Each section shows Korean + English text with number badge.
- **Verification**: (BROWSER) Visual inspection of each section header.

### REQ-005: Parent question line in SectionHeader
- **Priority**: Should
- **Description**: Optional parentQuestion prop renders muted gray line below titles.
- **Acceptance Criteria**: Shows when prop provided, absent otherwise.
- **Verification**: (BROWSER) Check presence/absence per section.

### REQ-006: DB migration - edited_insights column
- **Priority**: Must
- **Description**: Add `edited_insights JSONB DEFAULT NULL` column to `diagnostic_test_results`.
- **Acceptance Criteria**: Column exists, defaults NULL, accepts partial ReportInsights JSON.
- **Verification**: (MANUAL) Run migration, verify via SQL query.

### REQ-007: GET /api/reports/[resultId] returns editedInsights
- **Priority**: Must
- **Description**: Public report API includes `editedInsights` in response (null when no edits).
- **Acceptance Criteria**: Field present in response, null when unedited.
- **Verification**: (TEST) Integration test with/without edited_insights.

### REQ-008: Report page deep-merges editedInsights over AI insights
- **Priority**: Must
- **Description**: After generateAllInsights(), deep-merge data.editedInsights over AI fields. Handles nested sections, strings, arrays.
- **Acceptance Criteria**: Edited fields override AI; unedited fields remain.
- **Verification**: (TEST) Unit test for merge utility with partial overrides.

### REQ-009: Tutor review badge on edited fields
- **Priority**: Should
- **Description**: Edited fields show "튜터 검수 완료" badge with checkmark icon.
- **Acceptance Criteria**: Badge appears only on edited insight blocks.
- **Verification**: (BROWSER) Load report with partial edits, verify badge.

### REQ-010: Admin insight editing page
- **Priority**: Must
- **Description**: Page at `/admin/reports/[resultId]/insights` with textareas per insight field, save/preview buttons.
- **Acceptance Criteria**: Admin can edit any field, save, and see changes on report.
- **Verification**: (BROWSER) Edit field, save, verify on report page.

### REQ-011: PATCH /api/admin/diagnosis/results/[resultId]/insights endpoint
- **Priority**: Must
- **Description**: Admin-authenticated PATCH endpoint. Partial merge with existing edited_insights. x-admin-key auth.
- **Acceptance Criteria**: Partial save preserves other edits. 401 without auth.
- **Verification**: (TEST) Integration test for partial merge and auth.

### REQ-012: Reset-to-AI button per field
- **Priority**: Should
- **Description**: "AI 초안으로 되돌리기" button per textarea reverts to AI text.
- **Acceptance Criteria**: After reset and save, report shows AI text.
- **Verification**: (BROWSER) Edit, save, reset, save, verify AI text.

### REQ-013: E2E tests for sections and headers
- **Priority**: Must
- **Description**: E2E tests verify: 4 anchor IDs, Korean text in headers, nav pills.
- **Acceptance Criteria**: E2E suite passes.
- **Verification**: (TEST) npx playwright test for report E2E spec.

---

## Traceability Matrix

| REQ ID  | Description                          | Verification | Test/Check Location                       | Status  |
|---------|--------------------------------------|--------------|-------------------------------------------|---------|
| REQ-001 | ChapterNav sticky pill nav           | (BROWSER)    | Playwright MCP spot-check                 | Pending |
| REQ-002 | Active pill via IntersectionObserver  | (BROWSER)    | Playwright MCP spot-check                 | Pending |
| REQ-003 | Section anchor IDs                   | (TEST)       | tests/e2e/report-sections.spec.ts         | Pending |
| REQ-004 | Bilingual SectionHeader              | (BROWSER)    | Playwright MCP spot-check                 | Pending |
| REQ-005 | Parent question line                 | (BROWSER)    | Playwright MCP spot-check                 | Pending |
| REQ-006 | DB migration edited_insights         | (MANUAL)     | SQL verification in Supabase              | Pending |
| REQ-007 | GET returns editedInsights           | (TEST)       | src/__tests__/api/reports.test.ts         | Pending |
| REQ-008 | Deep merge editedInsights            | (TEST)       | src/__tests__/lib/merge-insights.test.ts  | Pending |
| REQ-009 | Tutor review badge                   | (BROWSER)    | Playwright MCP spot-check                 | Pending |
| REQ-010 | Admin editing page                   | (BROWSER)    | Playwright MCP + e2e/admin-insights       | Pending |
| REQ-011 | PATCH insights endpoint              | (TEST)       | src/__tests__/api/admin-insights.test.ts  | Pending |
| REQ-012 | Reset to AI button                   | (BROWSER)    | Playwright MCP spot-check                 | Pending |
| REQ-013 | E2E tests for anchors + headers      | (TEST)       | tests/e2e/report-sections.spec.ts         | Pending |

---

## Technical Design

### Architecture

**Current state**: The report page (src/app/reports/[resultId]/page.tsx) is a server component that fetches data via GET /api/reports/[resultId], generates insights with generateAllInsights(), and renders 5 numbered sections using a SectionLabel helper and various chart/insight components. The API route queries diagnostic_test_results via supabaseAdmin. Admin endpoints use x-admin-key header auth via isAuthenticated().

**Key change areas**:

1. **New components** (in src/app/reports/[resultId]/components/):
   - ChapterNav.tsx - client component (IntersectionObserver + click handlers)
   - SectionHeader.tsx - server component (pure presentation)

2. **Modified files**:
   - src/app/reports/[resultId]/page.tsx - replace SectionLabel, restructure to 4 sections with anchor IDs, insert ChapterNav, integrate deep-merge, add tutor badge
   - src/app/api/reports/[resultId]/route.ts - include edited_insights in response
   - src/app/admin/diagnosis/components/ViewResultsTab.tsx - add Edit Insights link

3. **New files**:
   - src/lib/merge-insights.ts - deep merge utility
   - src/app/api/admin/diagnosis/results/[id]/insights/route.ts - PATCH endpoint
   - src/app/admin/reports/[resultId]/insights/page.tsx - admin editing UI
   - supabase/migrations/XXXXXX_add_edited_insights.sql - DB migration

### Section Map (Current to New)

The current report has 5 numbered sections. The new design consolidates into 4 navigable chapters:

| Nav # | Current Sections Merged              | Korean Label | English Label        | Anchor ID   |
|-------|--------------------------------------|--------------|----------------------|-------------|
| 01    | 01 Executive Summary + 02 Benchmark  | 전체 성적    | Overall Score        | section-01  |
| 02    | 03 Domain Breakdown                  | 상위 10%와의 차이 | vs. Top 10%          | section-02  |
| 03    | 04 Behavioral Analysis               | 문제 풀이 패턴 | Test-Taking Patterns | section-03  |
| 04    | 05 Vocabulary Gap                    | 모르는 단어  | Vocabulary Gap       | section-04  |

**Design decision**: Sections 01+02 merge into chapter 01 (both address overall score). Key Recommendations stays at bottom, not navigable.

### ChapterNav Component Design

Location: src/app/reports/[resultId]/components/ChapterNav.tsx
Directive: use client
Props: none (reads section IDs from DOM)
State: activeSection (string)

Behavior:
- On mount: IntersectionObserver on [id^=section-] elements, rootMargin: -96px 0px -50% 0px
- On intersection: set activeSection to topmost intersecting section
- On pill click: scrollIntoView({ behavior: smooth, block: start })
- Each section gets scroll-margin-top: 96px

Styling:
- Container: bg-white, border-b border-slate-200, sticky top-[48px] z-20, print:hidden
- Inner: max-w-3xl mx-auto px-4, flex gap-2, overflow-x-auto, scrollbar hidden
- Active pill: bg-slate-900 text-white rounded-full px-3 py-1.5 text-xs font-semibold
- Inactive pill: bg-slate-100 text-slate-600 rounded-full px-3 py-1.5 text-xs font-medium
- Pill labels: "01 전체 성적", "02 상위 10%", "03 풀이 패턴", "04 단어"

### SectionHeader Component Design

Location: src/app/reports/[resultId]/components/SectionHeader.tsx
Props: number (string), titleKo (string), titleEn (string), parentQuestion? (string)

Layout: number badge (text-sm font-bold text-slate-400) + Korean title (text-[22px] font-extrabold) on same line, English subtitle (text-[13px] text-slate-400) below, optional parent question below that.

### Deep Merge Utility (src/lib/merge-insights.ts)

mergeInsights(ai: ReportInsights, edited: Partial<ReportInsights> | null): ReportInsights

Rules:
- null/undefined edited returns ai unchanged
- String fields (executiveSummary, behavioral, vocabulary): edited overrides if present
- sections (Record<string, SectionInsight>): per-section merge, override headline/body/tone individually
- keyRecommendations (string[]): replace entire array if present
- topWeakDomains: replace entire array if present
- Returns new object (immutable)

Also export getEditedFieldKeys(edited) -> Set<string> for tutor badge logic.

### PATCH Endpoint Design

Route: src/app/api/admin/diagnosis/results/[id]/insights/route.ts

PATCH /api/admin/diagnosis/results/{id}/insights
Headers: x-admin-key
Body: Partial<ReportInsights>

Logic: authenticate -> fetch current edited_insights -> deep-merge incoming body -> UPDATE row -> return merged
If field value is explicitly null: remove that key (reset to AI).
Errors: 401 (no auth), 404 (not found), 400 (invalid body).

### Admin Editing Page Design

Route: src/app/admin/reports/[resultId]/insights/page.tsx (use client)

Data loading:
1. Fetch report data (GET /api/reports/[resultId])
2. Fetch admin result (GET /api/admin/diagnosis/results/[id])
3. Generate AI insights locally via generateAllInsights()
4. Pre-fill forms: editedInsights[field] if present, else aiInsights[field]

Field layout: Executive Summary textarea, per-section headline/body/tone, Behavioral textarea, Vocabulary textarea, Key Recommendations list.

Each field shows: label, "수정됨" badge if changed, "AI 초안으로 되돌리기" reset button.

Save: diff against AI, PATCH changed fields, send null for reset fields. Preview button opens report in new tab.

### Dependencies

No new external packages. Uses existing supabaseAdmin, isAuthenticated, ReportInsights.

---

## Implementation Order

### Step 1: DB Migration (REQ-006)
**Files**: supabase/migrations/XXXXXX_add_edited_insights.sql
**Dependencies**: None
**Description**: Add edited_insights JSONB DEFAULT NULL to diagnostic_test_results.
**Satisfies**: REQ-006

### Step 2: Deep Merge Utility + API Changes (REQ-007, REQ-008, REQ-011)
**Files**:
- src/lib/merge-insights.ts (new)
- src/__tests__/lib/merge-insights.test.ts (new)
- src/app/api/reports/[resultId]/route.ts (modify)
- src/app/api/admin/diagnosis/results/[id]/insights/route.ts (new)
- src/__tests__/api/admin-insights.test.ts (new)
**Dependencies**: Step 1
**Description**: Build merge utility with tests, update public API to include editedInsights, create admin PATCH endpoint.
**Satisfies**: REQ-007, REQ-008, REQ-011

### Step 3: Frontend - ChapterNav, SectionHeader, Page Restructure (REQ-001 thru REQ-005, REQ-009)
**Files**:
- src/app/reports/[resultId]/components/ChapterNav.tsx (new)
- src/app/reports/[resultId]/components/SectionHeader.tsx (new)
- src/app/reports/[resultId]/page.tsx (modify)
**Dependencies**: Step 2 (merge utility for page.tsx)
**Description**: Create ChapterNav (IntersectionObserver + smooth scroll), SectionHeader (bilingual), restructure page.tsx to 4 chapters with anchor IDs, integrate merge logic, add tutor badge.
**Satisfies**: REQ-001, REQ-002, REQ-003, REQ-004, REQ-005, REQ-009
**Note**: ChapterNav.tsx and SectionHeader.tsx can start in parallel with Step 2.

### Step 4: Admin Editing UI (REQ-010, REQ-012)
**Files**:
- src/app/admin/reports/[resultId]/insights/page.tsx (new)
- src/app/admin/diagnosis/components/ViewResultsTab.tsx (modify)
**Dependencies**: Steps 2 and 3
**Description**: Admin editing page with textareas, save/reset buttons, preview link. Add link from results list.
**Satisfies**: REQ-010, REQ-012

### Step 5: E2E Tests + Verification (REQ-013)
**Files**: tests/e2e/report-sections.spec.ts
**Dependencies**: Steps 2-4 complete
**Description**: Playwright E2E tests for section anchors, Korean headers, nav pills. Run tsc --noEmit and full E2E suite.
**Satisfies**: REQ-013

### Parallelization

Two workstreams:
- Backend: Step 1 -> Step 2 (migration, merge utility, API endpoints, tests)
- Frontend: Step 3 component files (ChapterNav, SectionHeader) can start immediately
- Merge point: page.tsx integration requires both streams
- Then Step 4 and Step 5 are sequential

---

## Testing Strategy

| REQ ID  | Test Type     | Test Location                              | What to Assert                                                  |
|---------|---------------|--------------------------------------------|-----------------------------------------------------------------|
| REQ-003 | E2E           | tests/e2e/report-sections.spec.ts          | 4 elements with id=section-0N exist in DOM in order             |
| REQ-007 | Integration   | src/__tests__/api/reports.test.ts          | Response includes editedInsights (null or object)               |
| REQ-008 | Unit          | src/__tests__/lib/merge-insights.test.ts   | Partial override, null passthrough, nested merge, no mutation   |
| REQ-011 | Integration   | src/__tests__/api/admin-insights.test.ts   | Auth required (401), partial merge saves, null removes field    |
| REQ-013 | E2E           | tests/e2e/report-sections.spec.ts          | Section anchors, Korean headers, nav pills count = 4            |

BROWSER verifications (REQ-001, 002, 004, 005, 009, 010, 012): Playwright MCP spot-checks during development.

---

## Risks and Considerations

### Risk 1: Section consolidation breaks existing bookmarks
**Impact**: Low. No published anchor IDs exist. **Mitigation**: None needed.

### Risk 2: IntersectionObserver accuracy with stacked sticky elements
**Impact**: Medium. Toolbar (~48px) + ChapterNav (~48px) = ~96px. **Mitigation**: scroll-margin-top: 96px on sections, rootMargin: -96px 0px -50% 0px. Test on mobile viewports.

### Risk 3: Admin edits overwrite each other (concurrent editing)
**Impact**: Low (single admin). Read-merge-write is not atomic. **Mitigation**: Acceptable at current scale. Add optimistic locking later if needed.

### Risk 4: edited_insights schema drift from ReportInsights
**Impact**: Medium. **Mitigation**: Merge handles partial objects gracefully. Add Zod validation on PATCH endpoint.

### Risk 5: Server component calling generateAllInsights + merge
**Impact**: Low. Both pure functions, no I/O. **Mitigation**: None needed.

---

## Out of Scope

- AI re-generation via LLM (this spec covers rule-based insights only)
- Edit version history / audit trail (only latest edit stored)
- Role-based editing permissions (all admins share x-admin-key)
- Translating insight body text to Korean (insights remain English; only headers are bilingual)
- Changing total number of report sections beyond the 4-chapter consolidation
- Mobile app or native navigation (web-only, mobile-responsive)