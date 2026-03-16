# Report Visual Hierarchy Redesign

## Overview

The diagnostic report page targets **parents** on mobile. Currently, every section opens with a tiny gold uppercase label (e.g. "01 Executive Summary") that carries almost no visual weight. Parents cannot instantly understand what they are looking at. This plan introduces a clear **title > hero metric > detail data > insight** cascade by replacing the SectionLabel helper with a new SectionHeader component and applying a consistent typography scale across all four report sections.

The current page has 5 sections (Executive Summary, Benchmark Comparison, Domain Breakdown, Behavioral Analysis, Vocabulary Gap). This redesign consolidates to **4 parent-facing sections** by merging the Domain Breakdown radar chart into Section 01, since domain accuracy is logically an extension of how many questions were answered correctly. The renumbering becomes 01-04.

## Requirements

### REQ-001: SectionHeader component
- **Priority**: Must
- **Description**: Create a new SectionHeader component in src/app/reports/[resultId]/components/SectionHeader.tsx. It accepts number (string, e.g. "01"), title (Korean heading), and subtitle (one-line question). It renders: (a) a small pill badge with the number (#6085FF bg, white text, 11px/700), (b) the Korean title at 22-24px/800 in #0f172a, and (c) the subtitle at 13px/400 in #64748B. Badge and title sit on the same row; subtitle below. Bottom margin of 24px (mb-6).
- **Acceptance Criteria**: Rendering SectionHeader with number="01" title="..." subtitle="..." produces the three-part header with correct sizes, weights, and colors.
- **Verification**: (BROWSER) Navigate to report page, visually confirm the section header layout matches spec.

### REQ-002: Section 01 -- Overall Score
- **Priority**: Must
- **Description**: First section uses SectionHeader with number="01", title="전체 성적", subtitle="이번 시험에서 몇 문제나 맞았나요?". The section retains ReportExecutiveSummary (donut cards with section accuracy) and the Analyst Take GenericInsightBlock. The ReportRadarChart (domain breakdown) moves into this section as tier-1 detail below the donut cards, along with its Highest-Leverage Domains insight block.
- **Acceptance Criteria**: Section 01 renders the new header, donut cards, radar chart, domain insight, and analyst-take insight -- in that order.
- **Verification**: (BROWSER) Confirm Section 01 shows the Korean title and contains both donut cards and radar chart.

### REQ-003: Section 02 -- Benchmark Comparison
- **Priority**: Must
- **Description**: Second section uses SectionHeader with number="02", title="상위 10%와의 차이", subtitle="우리 아이는 상위권과 얼마나 다른가요?". Contains ReportBenchmarkChart and per-section insight blocks (unchanged content).
- **Acceptance Criteria**: Section 02 renders the new header followed by the benchmark bar chart and insight blocks.
- **Verification**: (BROWSER) Confirm Section 02 shows the Korean title.

### REQ-004: Section 03 -- Behavioral Analysis
- **Priority**: Must
- **Description**: Third section uses SectionHeader with number="03", title="문제 풀이 패턴", subtitle="시간 배분과 자신감은 어떤 모습인가요?". Contains ReportBehavioralMatrix and Pacing Confidence Pattern insight block (unchanged content).
- **Acceptance Criteria**: Section 03 renders the new header followed by scatter chart and insight.
- **Verification**: (BROWSER) Confirm Section 03 shows the Korean title.

### REQ-005: Section 04 -- Vocabulary Gap
- **Priority**: Must
- **Description**: Fourth section uses SectionHeader with number="04", title="모르는 단어", subtitle="단어 때문에 틀린 문제가 있었나요?". Contains ReportVocabularyGap and Vocabulary Strategy insight block (unchanged content).
- **Acceptance Criteria**: Section 04 renders the new header followed by word chips and insight.
- **Verification**: (BROWSER) Confirm Section 04 shows the Korean title.

### REQ-006: page.tsx uses SectionHeader, removes SectionLabel
- **Priority**: Must
- **Description**: All SectionLabel calls in page.tsx are replaced with SectionHeader calls. The old SectionLabel helper function is deleted. Section count reduces from 5 to 4 (Domain Breakdown merged into Section 01). Dividers between the 4 sections remain.
- **Acceptance Criteria**: No SectionLabel usage in page.tsx. Four sections render with SectionHeader. Page compiles without errors.
- **Verification**: (BROWSER) Page loads with 4 sections, each showing pill badge + Korean title + subtitle.

### REQ-007: Typography scale applied
- **Priority**: Must
- **Description**: The SectionHeader component applies the specified typography scale: L0 badge (11px/700, #6085FF bg, white text, pill shape), L1 title (22-24px/800, #0f172a), L2 subtitle (13px/400, #64748B). Font family uses Pretendard via CSS variable for the title; system default for subtitle.
- **Acceptance Criteria**: Inspecting the rendered elements shows the correct font sizes, weights, and colors.
- **Verification**: (BROWSER) Inspect DOM elements and compare to spec values.

### REQ-008: InsightBlock typography consistency
- **Priority**: Should
- **Description**: Verify that InsightBlock and GenericInsightBlock body text matches L6 (13px/400, #475569). Currently the body uses text-sm text-slate-600 (14px, #475569). Adjust to 13px if needed. Headline stays text-sm font-semibold text-slate-800.
- **Acceptance Criteria**: Insight body text renders at 13px, color #475569.
- **Verification**: (BROWSER) Inspect InsightBlock body text size and color.

### REQ-009: E2E tests updated
- **Priority**: Must
- **Description**: Update tests/e2e/report-page.spec.ts to assert the new section titles instead of the old English labels. Section count assertions change from 5 to 4.
- **Acceptance Criteria**: E2E tests pass with the new Korean section titles.
- **Verification**: (TEST) npx playwright test tests/e2e/report-page.spec.ts
## Technical Design

### Architecture

The change is scoped to the report rendering layer. No API, database, or data-fetching changes.

**New file:**
- src/app/reports/[resultId]/components/SectionHeader.tsx -- Pure presentational server component. Props: { number: string; title: string; subtitle: string }.

**Modified files:**
- src/app/reports/[resultId]/page.tsx -- Replace SectionLabel with SectionHeader, consolidate Domain Breakdown into Section 01, remove one Divider, delete SectionLabel helper function.
- src/app/reports/[resultId]/components/InsightBlock.tsx -- Minor font-size adjustment to body text (14px to 13px).
- tests/e2e/report-page.spec.ts -- Update section label assertions.

**Unchanged files:**
- ReportCover.tsx, ReportExecutiveSummary.tsx, ReportBenchmarkChart.tsx, ReportRadarChart.tsx, ReportBehavioralMatrix.tsx, ReportVocabularyGap.tsx -- No changes.

### Dependencies

None. All styling uses Tailwind utility classes and inline styles. No new packages.

### SectionHeader component design

The component renders three elements in a vertical stack:

1. A flex row containing:
   - A pill-shaped span (rounded-full, px-2.5 py-0.5) with #6085FF background, white text, 11px font at weight 700, min-width 28px
   - An h2 element with fontSize 22px, fontWeight 800, color #0f172a, lineHeight 1.3, margin 0

2. A paragraph element with left padding matching the badge width + gap (pl-[calc(28px+0.75rem)]), fontSize 13px, fontWeight 400, color #64748B, lineHeight 1.5, margin 0

The outer div has className mb-6 print:mb-3.

### Typography scale reference

| Level | Role | Size | Weight | Color | Where used |
|-------|------|------|--------|-------|------------|
| L0 | Section number badge | 11px | 700 | white on #6085FF | SectionHeader pill |
| L1 | Section title | 22px | 800 | #0f172a | SectionHeader h2 |
| L2 | Subtitle/question | 13px | 400 | #64748B | SectionHeader subtitle |
| L3 | Hero metric | 40-48px | 900 | brand primary | Cover score, future hero numbers |
| L4 | Card heading | 13px | 700 | #334155 | Inside-card labels (existing) |
| L5 | Body / detail data | 12-13px | 400 | #64748B | Table rows, small stats (existing) |
| L6 | Insight / annotation | 13px | 400 | #475569 | InsightBlock / GenericInsightBlock body |

### Section consolidation mapping

| Old # | Old title | New # | New title | Notes |
|-------|-----------|-------|-----------|-------|
| 01 | Executive Summary | 01 | 전체 성적 | Absorbs old Section 03 (Domain Breakdown radar) |
| 02 | Benchmark Comparison | 02 | 상위 10%와의 차이 | Unchanged content |
| 03 | Domain Breakdown | -- | (merged into 01) | Radar chart + domain insight move up |
| 04 | Behavioral Analysis | 03 | 문제 풀이 패턴 | Renumbered |
| 05 | Vocabulary Gap | 04 | 모르는 단어 | Renumbered |

## Traceability Matrix

| REQ ID  | Description                        | Verification | Test/Check Location                              | Status  |
|---------|------------------------------------|--------------|--------------------------------------------------|---------|
| REQ-001 | SectionHeader component            | (BROWSER)    | Playwright MCP spot-check                        | Pending |
| REQ-002 | Section 01 title and content       | (BROWSER)    | Playwright MCP spot-check                        | Pending |
| REQ-003 | Section 02 title and content       | (BROWSER)    | Playwright MCP spot-check                        | Pending |
| REQ-004 | Section 03 title and content       | (BROWSER)    | Playwright MCP spot-check                        | Pending |
| REQ-005 | Section 04 title and content       | (BROWSER)    | Playwright MCP spot-check                        | Pending |
| REQ-006 | page.tsx uses SectionHeader        | (BROWSER)    | Playwright MCP spot-check; grep for SectionLabel | Pending |
| REQ-007 | Typography scale applied           | (BROWSER)    | DOM inspection via Playwright MCP                | Pending |
| REQ-008 | InsightBlock L6 styling            | (BROWSER)    | DOM inspection via Playwright MCP                | Pending |
| REQ-009 | E2E tests updated                  | (TEST)       | tests/e2e/report-page.spec.ts                    | Pending |
## Implementation Order

### Step 1: Create SectionHeader.tsx
**Files**: src/app/reports/[resultId]/components/SectionHeader.tsx (new)
**Dependencies**: None
**Description**: Create the new component with badge + title + subtitle layout per the design above. Pure server component (no use client). Export as named export.
**Satisfies**: REQ-001, REQ-007

### Step 2: Update page.tsx -- replace SectionLabel, consolidate sections
**Files**: src/app/reports/[resultId]/page.tsx
**Dependencies**: Step 1 (SectionHeader must exist)
**Description**:
1. Import SectionHeader from ./components/SectionHeader.
2. Replace all 5 SectionLabel calls with 4 SectionHeader calls using the Korean titles and subtitles.
3. Move ReportRadarChart and its Highest-Leverage Domains insight block from old Section 03 into Section 01 (after ReportExecutiveSummary and its Analyst Take insight).
4. Remove the Divider that was between old Section 02 and old Section 03.
5. Delete the SectionLabel helper function.
6. Verify build compiles.
**Satisfies**: REQ-002, REQ-003, REQ-004, REQ-005, REQ-006

### Step 3: Adjust InsightBlock body text
**Files**: src/app/reports/[resultId]/components/InsightBlock.tsx
**Dependencies**: None (can run in parallel with Step 2)
**Description**: Change body p element in both InsightBlock and GenericInsightBlock from text-sm (14px) to explicit style fontSize 13px and ensure color is #475569 (Tailwind text-slate-600 maps to #475569 -- verify and keep if correct, or switch to inline style).
**Satisfies**: REQ-008

### Step 4: Update E2E tests
**Files**: tests/e2e/report-page.spec.ts
**Dependencies**: Steps 1-3 complete
**Description**: Replace all assertions for old section labels:
- "01 Executive Summary" becomes assertion for text containing 전체 성적
- "02 Benchmark Comparison" becomes assertion for 상위 10%와의 차이
- "03 Domain Breakdown" removed (merged into Section 01)
- "04 Behavioral Analysis" becomes assertion for 문제 풀이 패턴
- "05 Vocabulary Gap" becomes assertion for 모르는 단어
Update any count assertions from 5 sections to 4.
**Satisfies**: REQ-009

## Testing Strategy

- **REQ-001 through REQ-007** (BROWSER): After implementation, start dev server and use Playwright MCP to navigate to a report page. Take a screenshot. Verify: (a) 4 section headers visible with blue pill badges, (b) Korean titles at large bold size, (c) subtitle questions visible in muted gray, (d) no old English section labels present.
- **REQ-008** (BROWSER): Inspect an InsightBlock body text in dev tools to confirm 13px / #475569.
- **REQ-009** (TEST): Run npx playwright test tests/e2e/report-page.spec.ts and confirm all assertions pass.

## Risks and Considerations

1. **Pretendard font availability**: The design specifies Pretendard for the Korean title. If --font-pretendard CSS variable is not configured in the project, the title will fall back to system-ui. Mitigation: check if Pretendard is already loaded; if not, the fallback is acceptable for V1 and a follow-up task can add the font.

2. **Section consolidation changes reading flow**: Moving the radar chart into Section 01 makes that section longer. On mobile this is fine (vertical scroll), but on desktop the section may feel dense. Mitigation: adequate spacing (space-y-5) between sub-blocks within Section 01.

3. **E2E test fragility**: Asserting on Korean text requires the test environment to handle UTF-8 properly. Playwright handles this natively, so risk is low.

4. **Print styles**: The SectionHeader should include print:mb-3 for tighter spacing in print mode. The old SectionLabel had this; the new component must preserve it.

5. **Backward compatibility**: The old English section labels will no longer appear anywhere. If any other part of the app links to these anchors by text, those references will break. Mitigation: grep the codebase for these strings before shipping.

## Out of Scope

- Hero metric numbers (L3 typography level) -- these require data plumbing changes and are a follow-up task
- Pretendard font installation if not already present
- Reordering content within individual section cards (e.g., adding difficulty breakdown to Section 01)
- Key Recommendations and About This Report sections -- unchanged
- Cover component redesign
- Mobile-specific layout changes beyond typography
