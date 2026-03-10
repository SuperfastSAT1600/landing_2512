# Report Page Mobile-First Redesign

## Overview

The `/reports/[resultId]` page is the SAT diagnostic report that parents view primarily on mobile devices. The current layout has a 2-column desktop design with sales-oriented CTAs (consultation booking) that must be removed, and several chart/layout elements that render poorly on small screens. This redesign strips all sales elements and optimizes every component for 320px-414px viewports while preserving the desktop experience.

## Requirements

### REQ-001: Remove all sales/consultation CTAs
- **Priority**: Must
- **Description**: Delete the `ReportConsultationCTA` component and all its usages -- sidebar CTA, mid-report inline CTA, and bottom inline CTA.
- **Acceptance Criteria**: No elements containing "Book Free," "Strategy Call," "Unlock Your Full Score Potential," "Get Your Personalized Study Plan," or links to `forms.gle` appear on the page.
- **Verification**: (BROWSER) Navigate to report at 390px and 1280px; confirm zero CTA elements.

### REQ-002: Remove sidebar and convert to single-column layout
- **Priority**: Must
- **Description**: Remove the `<aside>` right column. Relocate "Key Recommendations" and "About This Report" to main content flow (after Vocabulary Gap, before footer).
- **Acceptance Criteria**: Single column at all viewports. No `<aside>` element exists.
- **Verification**: (BROWSER) At 390px and 1280px, confirm single-column layout.

### REQ-003: Mobile-optimized cover section
- **Priority**: Must
- **Description**: In `ReportCover.tsx`: (a) `min-height: auto` with responsive padding. (b) Score cards stack vertically on mobile. (c) Student name clamp min `2rem`. (d) Remove "Confidential Diagnostic Assessment" line.
- **Acceptance Criteria**: On 390px, cover is compact, score cards stacked, no Confidential text.
- **Verification**: (BROWSER) At 390px viewport, verify visually.

### REQ-004: Mobile chart height optimization
- **Priority**: Must
- **Description**: Wrap `ResponsiveContainer` in Tailwind responsive-height divs: BenchmarkChart `h-[200px] sm:h-[280px]`, RadarChart `h-[280px] sm:h-[360px]`, BehavioralMatrix `h-[260px] sm:h-[340px]`. Set `height="100%"` on ResponsiveContainer.
- **Acceptance Criteria**: Charts shorter on mobile, taller on sm+. No JS window checks.
- **Verification**: (BROWSER) At 390px, charts are shorter. At 768px+, original height.

### REQ-005: Executive Summary donut SVG mobile sizing
- **Priority**: Should
- **Description**: SVG wrapper `w-24 h-24 sm:w-[120px] sm:h-[120px]`. SVG uses `width/height="100%"` with `viewBox="0 0 120 120"`.
- **Acceptance Criteria**: Donut ~96px on mobile, 120px on sm+.
- **Verification**: (BROWSER) At 390px, donut does not squeeze adjacent text.

### REQ-006: Radar chart domain table mobile layout
- **Priority**: Should
- **Description**: Domain name `truncate max-w-[140px] sm:max-w-none`. Progress bar `hidden sm:block`. Pct and delta always visible.
- **Acceptance Criteria**: No overflow on 390px. Progress bar shows on sm+.
- **Verification**: (BROWSER) At 390px, no horizontal scroll on domain table.

### REQ-007: Tighter vertical spacing on mobile
- **Priority**: Should
- **Description**: Change `space-y-14` to `space-y-10 sm:space-y-14`.
- **Acceptance Criteria**: 40px gap on mobile, 56px on desktop.
- **Verification**: (BROWSER) Visually confirm.

### REQ-008: Behavioral matrix axis labels mobile readability
- **Priority**: Could
- **Description**: Shorten axis labels to "Time (s)" and "Confidence".
- **Acceptance Criteria**: Labels do not overlap chart on 390px.
- **Verification**: (BROWSER) At 390px, labels readable.

### REQ-009: Delete ReportConsultationCTA.tsx file
- **Priority**: Must
- **Description**: Delete file, remove import from `page.tsx`.
- **Acceptance Criteria**: File gone, build succeeds.
- **Verification**: (TEST) `tsc --noEmit` passes.

### REQ-010: E2E tests updated for new layout
- **Priority**: Must
- **Description**: Update `tests/e2e/report-page.spec.ts`: remove CTA assertions, add no-CTA assertions, add no-sidebar assertions, add Key Recs in main content assertion.
- **Acceptance Criteria**: E2E suite passes.
- **Verification**: (TEST) `npx playwright test tests/e2e/report-page.spec.ts` passes.
## Technical Design

### Architecture

All changes are localized to the `/reports/[resultId]` route and its components. No backend, API, or data-model changes required.

**Key decisions:**
- Use Tailwind responsive prefixes (`sm:`, `md:`) for all mobile-vs-desktop differences. No JS-based responsive logic.
- For recharts height control, wrap `ResponsiveContainer` in a Tailwind-classed div with responsive height classes and set `ResponsiveContainer height="100%"`.
- "Key Recommendations" and "About This Report" move from sidebar to main flow. They were already rendered by `page.tsx`, so this is a JSX relocation.

### Dependencies

No new dependencies. Only uses existing: `recharts`, `tailwindcss`, `next`, `react`.

### Files to Modify

| File | Changes |
|------|---------|
| `src/app/reports/[resultId]/page.tsx` | Remove CTA imports/usages, remove aside, move Key Recs + About inline, single column, `space-y-10 sm:space-y-14` |
| `src/app/reports/[resultId]/components/ReportCover.tsx` | `minHeight: auto`, responsive padding, score cards `flex-col sm:flex-row`, remove Confidential line, clamp min 2rem |
| `src/app/reports/[resultId]/components/ReportExecutiveSummary.tsx` | Donut SVG responsive sizing via container classes |
| `src/app/reports/[resultId]/components/ReportBenchmarkChart.tsx` | Wrap `ResponsiveContainer` in responsive-height div |
| `src/app/reports/[resultId]/components/ReportRadarChart.tsx` | Responsive-height div, domain table truncation + hidden progress bar on mobile |
| `src/app/reports/[resultId]/components/ReportBehavioralMatrix.tsx` | Responsive-height div, shorten axis labels |
| `src/app/reports/[resultId]/components/ReportConsultationCTA.tsx` | **DELETE** |
| `tests/e2e/report-page.spec.ts` | Update assertions per REQ-010 |

## Traceability Matrix

| REQ ID  | Description                          | Verification | Test/Check Location                        | Status  |
|---------|--------------------------------------|--------------|--------------------------------------------|---------|
| REQ-001 | Remove all sales/consultation CTAs   | (BROWSER)    | `tests/e2e/report-page.spec.ts`            | Pending |
| REQ-002 | Remove sidebar, single-column layout | (BROWSER)    | `tests/e2e/report-page.spec.ts`            | Pending |
| REQ-003 | Mobile-optimized cover section       | (BROWSER)    | Playwright MCP spot-check at 390px         | Pending |
| REQ-004 | Mobile chart height optimization     | (BROWSER)    | Playwright MCP spot-check at 390px         | Pending |
| REQ-005 | Donut SVG mobile sizing              | (BROWSER)    | Playwright MCP spot-check at 390px         | Pending |
| REQ-006 | Domain table mobile layout           | (BROWSER)    | Playwright MCP spot-check at 390px         | Pending |
| REQ-007 | Tighter vertical spacing on mobile   | (BROWSER)    | Playwright MCP spot-check at 390px         | Pending |
| REQ-008 | Behavioral matrix axis labels        | (BROWSER)    | Playwright MCP spot-check at 390px         | Pending |
| REQ-009 | Delete ReportConsultationCTA.tsx      | (TEST)       | `tsc --noEmit` / `next build`              | Pending |
| REQ-010 | E2E tests updated                    | (TEST)       | `tests/e2e/report-page.spec.ts`            | Pending |

## Implementation Order

### Step 1: Delete CTA and strip sales elements (REQ-001, REQ-009)
**Files**: `page.tsx`, `ReportConsultationCTA.tsx`
**Dependencies**: None
**Description**:
1. Remove the `import { ReportConsultationCTA }` line from `page.tsx`.
2. Remove all three `<ReportConsultationCTA ... />` JSX usages (line 160, 199, 217).
3. Remove the two `<Divider />` elements that flanked the mid-report CTA (lines 158 and 162).
4. Delete `ReportConsultationCTA.tsx`.
5. Run `tsc --noEmit` to confirm clean build.
**Satisfies**: REQ-001, REQ-009

### Step 2: Remove sidebar, convert to single-column, relocate content (REQ-002, REQ-007)
**Files**: `page.tsx`
**Dependencies**: Step 1 (CTA removed from sidebar)
**Description**:
1. Remove the `<aside>` block (lines 214-264 in the original file).
2. Extract the "Key Recommendations" JSX and "About This Report" JSX from the deleted aside.
3. Change the outer wrapper from `<div className="flex gap-8 items-start print:block">` to `<div className="print:block">`.
4. Remove `flex-1 min-w-0` from the left column div. Keep `space-y-...` and `print:space-y-8`.
5. Change `space-y-14` to `space-y-10 sm:space-y-14`.
6. Insert "Key Recommendations" after Vocabulary Gap (before footer), `max-w-2xl mx-auto`. Only render if `insights.keyRecommendations.length > 0`.
7. Insert "About This Report" after Key Recs, same `max-w-2xl mx-auto`.
8. Remove the `<Divider />` that was before the bottom CTA.
**Satisfies**: REQ-002, REQ-007

### Step 3: Mobile-optimize cover (REQ-003)
**Files**: `ReportCover.tsx`
**Dependencies**: None (parallel with Steps 1-2)
**Description**:
1. Replace `minHeight: "60vh"` with `minHeight: "auto"`.
2. Change inner padding to `px-[6%] py-10 sm:py-16`.
3. Score cards: `flex flex-col sm:flex-row sm:flex-wrap gap-3 sm:gap-6`.
4. Font clamp: `clamp(2rem, 6vw, 4.5rem)` (was 2.5rem min).
5. Delete "SuperfastSAT Confidential Diagnostic Assessment" paragraph and gradient divider (lines 122-125).
**Satisfies**: REQ-003

### Step 4: Mobile chart heights (REQ-004)
**Files**: `ReportBenchmarkChart.tsx`, `ReportRadarChart.tsx`, `ReportBehavioralMatrix.tsx`
**Dependencies**: None
**Description**:
For each chart component:
1. **BenchmarkChart**: Wrap in `<div className="h-[200px] sm:h-[280px]">`. Set `height="100%"`.
2. **RadarChart**: Wrap in `<div className="h-[280px] sm:h-[360px]">`. Set `height="100%"`.
3. **BehavioralMatrix**: Wrap in `<div className="h-[260px] sm:h-[340px]">`. Set `height="100%"`.
**Satisfies**: REQ-004

### Step 5: Executive Summary donut sizing (REQ-005)
**Files**: `ReportExecutiveSummary.tsx`
**Dependencies**: None
**Description**:
1. Wrap SVG in `<div className="w-24 h-24 sm:w-[120px] sm:h-[120px]">`.
2. Change SVG from `width={120} height={120}` to `width="100%" height="100%"` (viewBox handles scaling).
**Satisfies**: REQ-005

### Step 6: Radar domain table mobile fix (REQ-006)
**Files**: `ReportRadarChart.tsx`
**Dependencies**: Step 4 (same file)
**Description**:
1. Domain name span: add `truncate max-w-[140px] sm:max-w-none inline-block`.
2. Progress bar wrapper: add `hidden sm:block`.
**Satisfies**: REQ-006

### Step 7: Behavioral matrix axis labels (REQ-008)
**Files**: `ReportBehavioralMatrix.tsx`
**Dependencies**: Step 4 (same file)
**Description**:
1. XAxis label: "Time Spent (seconds)" -> "Time (s)".
2. YAxis label: "Confidence (1-5)" -> "Confidence".
**Satisfies**: REQ-008

### Step 8: Update E2E tests (REQ-010)
**Files**: `tests/e2e/report-page.spec.ts`
**Dependencies**: Steps 1-7 complete
**Description**:
1. **Remove** test "REQ-005: Consultation CTAs are present with booking link".
2. **Replace** test "REQ-005: Sidebar visible on desktop with Key Recommendations" -- assert Key Recs in main content, no `forms.gle` links.
3. **Update** "Sidebar hidden on mobile" -> "No sidebar exists at any viewport"; assert no `<aside>` at 390px and 1280px.
4. **Add** "REQ-001: No sales CTAs or booking links on page" -- confirm no CTA text, no `forms.gle` links.
5. **Add** "REQ-002: Key Recommendations appears in main content" -- visible, not inside `<aside>`.
6. **Add** "Mobile layout is single column" -- all 5 section labels visible at 390px.
7. **Keep** all other existing tests unchanged.

**E2E coverage map:**

| REQ | E2E Test |
|-----|----------|
| REQ-001 | "No sales CTAs or booking links on page" |
| REQ-002 | "Key Recommendations in main content", "No sidebar at any viewport", "Mobile single column" |
| REQ-003 | BROWSER spot-check via Playwright MCP |
| REQ-004 | BROWSER spot-check (chart heights visual) |
| REQ-005 | BROWSER spot-check (donut size visual) |
| REQ-006 | BROWSER spot-check (domain table overflow) |
| REQ-007 | BROWSER spot-check (spacing visual) |
| REQ-008 | BROWSER spot-check (axis labels visual) |
| REQ-009 | Build verification (`tsc --noEmit`) |
| REQ-010 | Updated E2E file must pass |

## Testing Strategy

- **REQ-001** -> E2E test: assert no CTA text, no booking links
- **REQ-002** -> E2E test: assert `<aside>` absent, Key Recommendations in main flow
- **REQ-003** -> Playwright MCP spot-check at 390px during dev
- **REQ-004** -> Playwright MCP spot-check at 390px and 768px during dev
- **REQ-005** -> Playwright MCP spot-check at 390px during dev
- **REQ-006** -> Playwright MCP spot-check at 390px (no horizontal scroll)
- **REQ-007** -> Playwright MCP spot-check at 390px
- **REQ-008** -> Playwright MCP spot-check at 390px
- **REQ-009** -> `tsc --noEmit` passes
- **REQ-010** -> `npx playwright test tests/e2e/report-page.spec.ts` passes

## Risks and Considerations

1. **Key Recommendations relocation**: Moving from sidebar to main content changes reading flow. Mitigated by placing after final data section (Vocabulary Gap) as a summary/action section.

2. **recharts ResponsiveContainer height="100%"**: Requires parent to have explicit height. Tailwind `h-[Xpx]` classes satisfy this. If parent has no explicit height, recharts renders at 0px. Pattern verified to work.

3. **Print layout**: Sidebar was already `print:hidden`, main content has `print:block` and `print:space-y-8`. Removing flex/aside structure should not break print. Relocated Key Recs and About sections print fine. Worth a spot-check.

4. **Existing E2E tests**: Several tests reference CTA text that will no longer exist. Must be updated (REQ-010) or they will fail. Explicit step.

5. **SVG scaling for donut**: `width="100%" height="100%"` with fixed `viewBox` is standard SVG behavior. The `r=52` / `cx=60` / `cy=60` math is viewBox-relative, not pixel-relative, so it remains correct.

## Out of Scope

- Redesigning the report data model or API
- Adding new sections or analytics
- Changing the color scheme or typography system
- Touch/swipe interactions for charts
- Offline/PWA support
- Any new dependencies
- Server-side responsive detection (all CSS-based)
