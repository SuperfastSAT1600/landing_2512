# Report Brand Unification

## Overview

Unify the SuperfastSAT report page visual identity with the landing page brand. The report currently uses a navy/gold color scheme with Playfair Display serif font. This change replaces all brand colors and fonts to match the landing page dark zinc + vivid blue palette with Pretendard sans-serif font. Body/card backgrounds remain light for readability since the report is a long mobile document.

## Color Token Mapping

| Token | Old Value | New Value | Usage |
|-------|-----------|-----------|-------|
| brand-primary | #1B2A4A navy | #071be9 | Chart bars, donut stroke, progress fills |
| brand-accent | #C9A84C gold | #6085FF | Section labels, cover label, badge highlights |
| brand-dark | #0A1628 navy | #09090b | Cover bg, toolbar bg, GenericInsightBlock border/icon |
| brand-glow | (none) | rgba(96, 133, 255, 0.20) | Top 10% radar/bar fill |
| body-bg | #F7F8FA | #F4F5F9 | Body background |
| font-heading | Playfair Display | Pretendard | Student name h1, toolbar brand, score numbers |
| font-body | Inter | Pretendard | All body copy |
## Requirements

### REQ-001: Remove Playfair Display and Inter font dependencies
- **Priority**: Must
- **Description**: Remove Playfair_Display and Inter imports from src/app/reports/layout.tsx. Replace with Pretendard via the existing --font-sans CSS variable defined in globals.css.
- **Acceptance Criteria**: layout.tsx no longer imports from next/font/google. All report text renders in Pretendard. TypeScript compiles without errors.
- **Verification**: (TEST) tsc --noEmit passes with no errors referencing removed font variables.

### REQ-002: Cover section uses landing page brand
- **Priority**: Must
- **Description**: ReportCover.tsx background becomes solid #09090b (replacing navy gradient). Label accent line and text use #6085FF (replacing #C9A84C gold). All font-playfair references replaced with Pretendard. Overall score badge border/text uses #6085FF instead of gold. Background pattern radial gradients use #6085FF and #071be9 instead of gold/navy.
- **Acceptance Criteria**: Cover renders with dark zinc background, blue accent label, and Pretendard font for student name and score numbers.
- **Verification**: (BROWSER) Navigate to report page, visually confirm cover bg is #09090b, label accent is #6085FF, font is sans-serif.

### REQ-003: Toolbar uses dark background
- **Priority**: Must
- **Description**: Sticky toolbar in page.tsx uses #09090b background (opaque, no blur needed) instead of rgba(247, 248, 250, 0.95). Brand name text color changes to #FFFFFF. Separator dot and Diagnostic Report text use #D1D5DB secondary. Font family references to --font-playfair replaced with Pretendard. Border-bottom color changes to rgba(255,255,255,0.1).
- **Acceptance Criteria**: Toolbar appears as a dark bar with white brand name matching the landing page header aesthetic.
- **Verification**: (BROWSER) Scroll report page, confirm toolbar is dark with white text.

### REQ-004: Section labels use blue accent
- **Priority**: Must
- **Description**: SectionLabel component in page.tsx changes color from #C9A84C (gold) to #6085FF (glow blue).
- **Acceptance Criteria**: All five section labels (01-05) render in blue instead of gold.
- **Verification**: (BROWSER) Confirm all section labels are blue.

### REQ-005: Benchmark chart bars use brand colors
- **Priority**: Must
- **Description**: In ReportBenchmarkChart.tsx, You bar fill changes from #1B2A4A to #071be9. Top 10% bar fill changes from #BFDBFE to #6085FF.
- **Acceptance Criteria**: Bar chart shows vivid blue bars for student score and lighter blue for top 10%.
- **Verification**: (BROWSER) Inspect bar chart colors visually.

### REQ-006: Donut arc and benchmark row use brand colors
- **Priority**: Must
- **Description**: In ReportExecutiveSummary.tsx, donut circle stroke changes from #1B2A4A to #071be9. The percentage text inside the donut removes font-serif class. The BenchmarkRow progress bar fill changes from bg-slate-300 to inline style with #6085FF. DeltaBadge is unchanged -- it already uses semantic emerald/red colors for positive/negative deltas.
- **Acceptance Criteria**: Donut arcs are vivid blue, benchmark progress bars are blue.
- **Verification**: (BROWSER) Check donut and benchmark row visuals.

### REQ-007: Radar chart uses brand stroke colors
- **Priority**: Must
- **Description**: In ReportRadarChart.tsx, You radar stroke and fill change from #1B2A4A to #071be9. Top 10% radar stroke changes from #BFDBFE to #6085FF. Domain table progress bar fill changes from #1B2A4A to #071be9.
- **Acceptance Criteria**: Radar polygon is vivid blue, top 10% outline is lighter blue dashed, domain progress bars are vivid blue.
- **Verification**: (BROWSER) Inspect radar chart and domain table visuals.

### REQ-008: InsightBlock semantic tone colors preserved
- **Priority**: Must
- **Description**: InsightBlock.tsx TONE_STYLES for strength (emerald), opportunity (amber), and critical (red) remain unchanged. Only the opportunity tone border color changes from #C9A84C to #D97706 (standard amber-600) to avoid referencing the old gold. GenericInsightBlock border and icon background change from #0A1628 to #09090b.
- **Acceptance Criteria**: Strength blocks are green, opportunity blocks are amber, critical blocks are red. GenericInsightBlock uses dark zinc instead of navy.
- **Verification**: (BROWSER) Verify insight blocks maintain semantic coloring.

### REQ-009: Score card progress bar uses brand primary
- **Priority**: Must
- **Description**: In ReportExecutiveSummary.tsx BenchmarkRow, the progress bar div fill color changes from Tailwind bg-slate-300 to inline style background #6085FF (representing the benchmark comparison, not the student score).
- **Acceptance Criteria**: Benchmark progress bars in score cards use blue fill.
- **Verification**: (BROWSER) Check score card benchmark rows.

### REQ-010: Body and card backgrounds updated
- **Priority**: Must
- **Description**: In page.tsx, the outermost div background changes from #F7F8FA to #F4F5F9. Card backgrounds remain #FFFFFF. The fontFamily on the outermost div changes from var(--font-inter, ...) to var(--font-sans). Print header brand name color changes from #0A1628 to #09090b and removes --font-playfair. Key Recommendations badge background changes from #0A1628 to #09090b. Key Recommendations label color changes from #0A1628 to #09090b.
- **Acceptance Criteria**: Body background is slightly adjusted warm gray, all text renders in Pretendard.
- **Verification**: (BROWSER) Confirm body bg, font rendering.

### REQ-011: Existing E2E tests still pass
- **Priority**: Must
- **Description**: All 14 existing E2E tests in tests/e2e/report-page.spec.ts continue to pass. The test at line 143 checks for gold in its name but only checks text visibility, not color, so it will still pass. No test modifications needed.
- **Acceptance Criteria**: npx playwright test tests/e2e/report-page.spec.ts passes 14/14.
- **Verification**: (TEST) Run the full E2E suite for report page.
## Traceability Matrix

| REQ ID  | Description                            | Verification | Test/Check Location                        | Status  |
|---------|----------------------------------------|--------------|-------------------------------------------|---------|
| REQ-001 | Remove Playfair/Inter font deps        | (TEST)       | tsc --noEmit                              | Pending |
| REQ-002 | Cover bg, accent, font                 | (BROWSER)    | Playwright MCP spot-check                  | Pending |
| REQ-003 | Toolbar dark background                | (BROWSER)    | Playwright MCP spot-check                  | Pending |
| REQ-004 | Section labels blue accent             | (BROWSER)    | Playwright MCP spot-check                  | Pending |
| REQ-005 | Benchmark chart bar colors             | (BROWSER)    | Playwright MCP spot-check                  | Pending |
| REQ-006 | Donut arc and benchmark row colors     | (BROWSER)    | Playwright MCP spot-check                  | Pending |
| REQ-007 | Radar chart stroke colors              | (BROWSER)    | Playwright MCP spot-check                  | Pending |
| REQ-008 | InsightBlock semantic tones preserved  | (BROWSER)    | Playwright MCP spot-check                  | Pending |
| REQ-009 | Score card progress bar color          | (BROWSER)    | Playwright MCP spot-check                  | Pending |
| REQ-010 | Body bg and font family                | (BROWSER)    | Playwright MCP spot-check                  | Pending |
| REQ-011 | E2E tests pass 14/14                   | (TEST)       | tests/e2e/report-page.spec.ts             | Pending |

## Technical Design

### Architecture

This is a purely presentational change touching 7 files in src/app/reports/. No new dependencies, no API changes, no database changes.

**Files modified:**
1. src/app/reports/layout.tsx -- Font provider
2. src/app/reports/[resultId]/page.tsx -- Page shell, toolbar, section labels, recommendations
3. src/app/reports/[resultId]/components/ReportCover.tsx -- Cover section
4. src/app/reports/[resultId]/components/ReportExecutiveSummary.tsx -- Score cards, donut, benchmark rows
5. src/app/reports/[resultId]/components/ReportBenchmarkChart.tsx -- Bar chart
6. src/app/reports/[resultId]/components/ReportRadarChart.tsx -- Radar chart, domain table
7. src/app/reports/[resultId]/components/InsightBlock.tsx -- GenericInsightBlock border/icon bg

**Unchanged files:**
- ReportBehavioralMatrix.tsx -- Uses semantic emerald/red/amber colors for correct/incorrect/flagged, no brand colors to change.
- ReportVocabularyGap.tsx -- Not in brand color scope.
- ReportShareBar.tsx -- Not affected.

### Dependencies

- Pretendard font is already loaded globally via globals.css @import and available as var(--font-sans).
- No new packages needed. Playfair Display and Inter imports will be removed (reduces bundle).
## Implementation Steps

### Step 1 (standalone -- must complete first): Font cleanup in layout.tsx
**Files**: src/app/reports/layout.tsx
**Dependencies**: None
**Description**:
Remove the Playfair_Display and Inter imports from next/font/google. Remove the playfair and inter const declarations. Simplify the layout wrapper to a pass-through since the Pretendard font is already set by globals.css on the root element. The new layout.tsx should just render children directly without any font variable wrapper divs.
**Satisfies**: REQ-001

### Step 2 (parallel -- after Step 1): ReportCover.tsx brand update
**Files**: src/app/reports/[resultId]/components/ReportCover.tsx
**Dependencies**: Step 1 (font variables removed)
**Description**:
1. Replace gradient background (linear-gradient 160deg #0A1628/0F2040/1B2A4A) with solid background: #09090b
2. Replace all #C9A84C gold references with #6085FF:
   - Line 50: accent line background
   - Line 51: label color
   - Lines 79, 85: score badge border rgba and text color
3. Replace all var(--font-playfair, Georgia, serif) with var(--font-sans):
   - Lines 60, 84, 106: h1, overall score, section scores
4. Update background pattern radial gradients (line 43): replace #C9A84C with #6085FF, replace #4A6FA5 with #071be9
5. Update overall score badge: border rgba(96,133,255,0.3), bg rgba(96,133,255,0.12), text color #6085FF
**Satisfies**: REQ-002

### Step 3 (parallel -- after Step 1): page.tsx brand update
**Files**: src/app/reports/[resultId]/page.tsx
**Dependencies**: Step 1 (font variables removed)
**Description**:
1. Line 49: Change body bg from #F7F8FA to #F4F5F9, fontFamily to var(--font-sans)
2. Lines 54-55: Print header -- change color to #09090b, remove --font-playfair fontFamily
3. Lines 71-74: Toolbar -- change background to #09090b (opaque), remove backdropFilter, change border class to inline style border-bottom with rgba(255,255,255,0.1)
4. Lines 78-79: Toolbar brand name -- color to #FFFFFF, remove fontFamily (inherits Pretendard)
5. Lines 83-84: Toolbar separator/subtitle -- colors to #D1D5DB
6. SectionLabel component: Change color from #C9A84C to #6085FF
7. Key Recommendations label and badge bg -- change #0A1628 to #09090b
**Satisfies**: REQ-003, REQ-004, REQ-010

### Step 4 (parallel -- after Step 1): ReportExecutiveSummary.tsx color update
**Files**: src/app/reports/[resultId]/components/ReportExecutiveSummary.tsx
**Dependencies**: Step 1 (font variables removed)
**Description**:
1. Line 66: Donut stroke #1B2A4A to #071be9
2. Line 75: Remove font-serif class from percentage text inside donut
3. Line 106: BenchmarkRow progress bar -- replace bg-slate-300 class with inline style background: #6085FF
**Satisfies**: REQ-006, REQ-009

### Step 5 (parallel): ReportBenchmarkChart.tsx color update
**Files**: src/app/reports/[resultId]/components/ReportBenchmarkChart.tsx
**Dependencies**: None (no font references)
**Description**:
1. Line 71: You bar fill #1B2A4A to #071be9
2. Line 72: Top 10% bar fill #BFDBFE to #6085FF
**Satisfies**: REQ-005

### Step 6 (parallel): ReportRadarChart.tsx color update
**Files**: src/app/reports/[resultId]/components/ReportRadarChart.tsx
**Dependencies**: None (no font references)
**Description**:
1. Line 78: You radar stroke #1B2A4A to #071be9
2. Line 79: You radar fill #1B2A4A to #071be9
3. Line 85: Top 10% radar stroke #BFDBFE to #6085FF
4. Line 117: Domain table progress bar background #1B2A4A to #071be9
**Satisfies**: REQ-007

### Step 7 (parallel): InsightBlock.tsx minor update
**Files**: src/app/reports/[resultId]/components/InsightBlock.tsx
**Dependencies**: None
**Description**:
1. Line 17: Opportunity tone border #C9A84C to #D97706 (amber-600, standard semantic amber)
2. Line 79: GenericInsightBlock borderLeft #0A1628 to #09090b
3. Line 83: GenericInsightBlock icon bg #0A1628 to #09090b
**Satisfies**: REQ-008

### Step 8 (sequential -- after Steps 1-7): Verification
**Dependencies**: All previous steps complete
**Description**:
1. Run npx tsc --noEmit -- confirm no type errors (REQ-001)
2. Start dev server, use Playwright MCP to navigate to a report page
3. Screenshot cover, toolbar, charts, insight blocks -- visual confirmation (REQ-002 through REQ-010)
4. Run npx playwright test tests/e2e/report-page.spec.ts -- confirm 14/14 pass (REQ-011)
## Testing Strategy

| REQ ID  | Test Type       | Location / Method                                      |
|---------|-----------------|--------------------------------------------------------|
| REQ-001 | TypeScript check | npx tsc --noEmit -- no compile errors                 |
| REQ-002 | Browser check    | Playwright MCP: navigate to report, screenshot cover   |
| REQ-003 | Browser check    | Playwright MCP: scroll, screenshot toolbar             |
| REQ-004 | Browser check    | Playwright MCP: screenshot section labels              |
| REQ-005 | Browser check    | Playwright MCP: screenshot benchmark chart             |
| REQ-006 | Browser check    | Playwright MCP: screenshot score card donuts           |
| REQ-007 | Browser check    | Playwright MCP: screenshot radar chart                 |
| REQ-008 | Browser check    | Playwright MCP: screenshot insight blocks              |
| REQ-009 | Browser check    | Playwright MCP: screenshot score card benchmark rows   |
| REQ-010 | Browser check    | Playwright MCP: inspect body bg color                  |
| REQ-011 | E2E test suite   | npx playwright test tests/e2e/report-page.spec.ts     |

No new E2E tests are needed. The existing 14 tests validate structure and content, not colors. Color verification is handled via Playwright MCP spot-checks during implementation.

## Risks and Considerations

1. **Playfair Display removal may affect other routes under /reports/**
   - Mitigation: Grep confirmed no other files under src/app/reports/ reference --font-playfair except the files being modified. The layout.tsx at src/app/reports/layout.tsx is the only provider.

2. **Pretendard font weight coverage**
   - Pretendard supports weights 100-900 which covers all usage (bold 700 for headings, semibold 600, regular 400).

3. **Recharts SVG fill colors are inline, not CSS**
   - All chart color changes are to inline props (fill, stroke), not CSS classes, so they take effect immediately with no specificity concerns.

4. **Print stylesheet**
   - The print header uses print:flex and has its own brand name styling. Updated in Step 3 to use new colors. Print stylesheets should be tested manually if print output matters.

5. **E2E test naming**
   - Test at line 143 says in gold but only checks text presence, not color. No test update needed, but the test description is now technically inaccurate. This is cosmetic and can be updated separately.

## Out of Scope

- Landing page color changes (already correct)
- ReportBehavioralMatrix.tsx (uses semantic green/red/amber, no brand colors)
- ReportVocabularyGap.tsx (not in brand color scope)
- ReportShareBar.tsx (functional component, no brand colors)
- Creating a shared color constants file (could be a follow-up refactor)
- Dark mode support for the report page
