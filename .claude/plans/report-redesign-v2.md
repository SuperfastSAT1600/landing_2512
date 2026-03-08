# Report Redesign v2: Mobile-First, No Sales, No Global Average

## Overview

Redesign the SAT diagnostic report page to be mobile-first, remove all sales/consultation CTAs, and eliminate Global Average benchmark comparisons. The only benchmark kept is **Top 10%** as an aspiration target. The existing v1 design is archived before any changes.

This spec supersedes and extends the report-mobile-friendly plan, adding the Global Average removal and v1 archival requirements.

---

## Part A: Archive v1

### Files to Copy

Create src/app/reports/[resultId]/v1/ with these files copied verbatim:
| Source File | Archive Destination |
|---|---|
| `components/ReportCover.tsx` | `v1/ReportCover.tsx` |
| `components/ReportExecutiveSummary.tsx` | `v1/ReportExecutiveSummary.tsx` |
| `components/ReportBenchmarkChart.tsx` | `v1/ReportBenchmarkChart.tsx` |
| `components/ReportRadarChart.tsx` | `v1/ReportRadarChart.tsx` |
| `components/ReportBehavioralMatrix.tsx` | `v1/ReportBehavioralMatrix.tsx` |
| `components/ReportVocabularyGap.tsx` | `v1/ReportVocabularyGap.tsx` |
| `components/InsightBlock.tsx` | `v1/InsightBlock.tsx` |
| `components/ReportShareBar.tsx` | `v1/ReportShareBar.tsx` |
| `components/ReportConsultationCTA.tsx` | `v1/ReportConsultationCTA.tsx` |
| `page.tsx` | `v1/page.tsx` |

Create src/app/reports/[resultId]/v1/README.md documenting:
- v1 had a two-column layout (main content + sticky sidebar, sidebar hidden on mobile)
- Sidebar contained: Consultation CTA, Key Recommendations, About This Report
- Three benchmark tiers: You vs Global Average vs Top 10%
- Sales CTAs with Book Free Call links to forms.gle
- Disclaimer text about estimated benchmarks
- Cover: 60vh min-height, Confidential footer
- Fixed chart heights (not mobile-responsive)
- Why replaced: parents view on mobile, sales CTAs inappropriate, Global Average misleading with 76-student sample
- Reference copies only, NOT imported anywhere

---
## Part B: Requirements

### REQ-001: Remove all sales/consultation CTAs
- **Priority**: Must
- **Description**: Delete ReportConsultationCTA.tsx and remove all usages from page.tsx. No elements containing Book Free, Strategy Call, Unlock Your Full Score Potential, Get Your Personalized Study Plan, or links to forms.gle.
- **Acceptance Criteria**: Zero CTA elements at any viewport. No forms.gle links. Build succeeds.
- **Verification**: (BROWSER) Navigate to report at 390px and 1280px; confirm zero CTA elements. Also (TEST) tsc --noEmit passes.

### REQ-002: Single-column layout (remove sidebar)
- **Priority**: Must
- **Description**: Remove the aside right column from page.tsx. Convert from flex gap-8 2-column to single-column. Relocate Key Recommendations to main flow after Vocabulary Gap. Relocate About This Report after Key Recommendations.
- **Acceptance Criteria**: No aside element at any viewport. Key Recommendations visible in main content.
- **Verification**: (BROWSER) At 390px and 1280px, confirm single column, no aside, Key Recs in main flow.

### REQ-003: Mobile-optimized cover
- **Priority**: Must
- **Description**: In ReportCover.tsx: minHeight auto (was 60vh), responsive padding py-10 sm:py-16, stack score cards flex-col sm:flex-row, font clamp min 2rem (was 2.5rem), remove Confidential Diagnostic Assessment line.
- **Acceptance Criteria**: On 390px, cover compact with stacked score cards. No Confidential text.
- **Verification**: (BROWSER) At 390px, visually verify compact cover.

### REQ-004: Mobile chart height optimization
- **Priority**: Must
- **Description**: Wrap each chart ResponsiveContainer in a Tailwind responsive-height div, set height=100% on ResponsiveContainer. BenchmarkChart: h-[200px] sm:h-[280px]. RadarChart: h-[280px] sm:h-[360px]. BehavioralMatrix: h-[260px] sm:h-[340px].
- **Acceptance Criteria**: Charts shorter on mobile, taller on sm+.
- **Verification**: (BROWSER) At 390px, charts shorter. At 768px+, original heights.
### REQ-005: Executive Summary donut SVG responsive sizing
- **Priority**: Should
- **Description**: Wrap SVG in responsive div w-24 h-24 sm:w-[120px] sm:h-[120px], change SVG to width=100% height=100% with viewBox 0 0 120 120.
- **Acceptance Criteria**: Donut ~96px on mobile, ~120px on sm+. Text not squeezed.
- **Verification**: (BROWSER) At 390px, donut does not squeeze adjacent text.

### REQ-006: Remove Global Average from benchmark chart
- **Priority**: Must
- **Description**: Remove Global Avg data key (line 40) and Bar element (line 72). Only You and Top 10% bars remain.
- **Acceptance Criteria**: Bar chart shows only 2 bars per section.
- **Verification**: (BROWSER) Confirm only 2 bars per section.

### REQ-007: Remove Global Average from radar chart
- **Priority**: Must
- **Description**: (1) Remove Global Avg data key (line 57). (2) Remove Radar Global Avg element (lines 83-91). (3) Replace vsAvg delta in domain table with vsTop10 using b.top10.
- **Acceptance Criteria**: Radar chart: only You and Top 10%. Domain table deltas vs Top 10%.
- **Verification**: (BROWSER) 2 radar layers. Domain deltas reference Top 10%.

### REQ-008: Remove Global Average from Executive Summary
- **Priority**: Must
- **Description**: (1) Remove vsAvg calc (line 53) and DeltaBadge for Avg (line 92). (2) Remove BenchmarkRow for Global Average (line 99). (3) Keep DeltaBadge for Top 10%.
- **Acceptance Criteria**: Score cards show only Top 10%. No vs Avg badge. No Global Average row.
- **Verification**: (BROWSER) Score cards show only Top 10%.

### REQ-009: Remove Global Average from data layer (report-benchmarks.ts)
- **Priority**: Must
- **Description**: (1) Remove globalAverage from SectionBenchmarks, make top10 required. (2) Remove globalAverage from DomainBenchmark, make top10 required. (3-4) Remove globalAverage from data. (5) Add top10 placeholder values.
- **Acceptance Criteria**: No globalAverage. top10 required. TypeScript compiles.
- **Verification**: (TEST) tsc --noEmit passes.

### REQ-010: Remove Global Average from insight engine (report-insights.ts)
- **Priority**: Must
- **Description**: (1) DomainInsight.delta = vs top 10%. (2) generateSectionInsight: 4-tier threshold vs top10. (3) generateExecutiveSummary: remove globalAverage, keep absolute thresholds. (4) generateKeyRecommendations: wording to below top 10%. (5) generateWeakDomainInsights: note text references Top 10%.
- **Acceptance Criteria**: No globalAverage in report-insights.ts. TypeScript compiles.
- **Verification**: (TEST) tsc --noEmit passes. Grep for globalAverage returns 0.

### REQ-011: Remove mock benchmark disclaimer
- **Priority**: Must
- **Description**: Remove from: (1) ReportBenchmarkChart.tsx lines 76-78. (2) page.tsx footer lines 207-209.
- **Acceptance Criteria**: No estimated or Benchmark figures text.
- **Verification**: (BROWSER) No disclaimer text visible.

### REQ-012: Radar domain table mobile layout
- **Priority**: Should
- **Description**: Domain name: truncate max-w-[140px] sm:max-w-none. Progress bar: hidden sm:block.
- **Acceptance Criteria**: No horizontal overflow at 390px.
- **Verification**: (BROWSER) At 390px, no horizontal scroll.

### REQ-013: Behavioral matrix axis labels
- **Priority**: Could
- **Description**: XAxis: Time (s). YAxis: Confidence.
- **Acceptance Criteria**: Labels do not overlap chart at 390px.
- **Verification**: (BROWSER) At 390px, labels readable.

### REQ-014: Tighter vertical spacing on mobile
- **Priority**: Should
- **Description**: space-y-14 -> space-y-10 sm:space-y-14.
- **Acceptance Criteria**: 40px gap on mobile, 56px on desktop.
- **Verification**: (BROWSER) Visually confirm.

### REQ-015: Update E2E tests
- **Priority**: Must
- **Description**: (1) DELETE CTA test. (2) REWRITE sidebar tests. (3-6) ADD no-CTA, no-GlobalAvg, no-disclaimer tests. (7) KEEP others.
- **Acceptance Criteria**: E2E suite passes.
- **Verification**: (TEST) npx playwright test passes.
---

## Per-File Change Table

| File | Action | Changes |
|------|--------|---------|
| v1/ directory | CREATE | Archive all v1 copies + README.md |
| ReportConsultationCTA.tsx | DELETE | Entire file removed |
| page.tsx | MODIFY | Remove CTA import + 3 usages + 2 Dividers. Remove aside. Single-column. Key Recs + About after Vocab Gap. space-y-10 sm:space-y-14. Remove footer disclaimer. |
| ReportCover.tsx | MODIFY | minHeight auto. py-10 sm:py-16. flex-col sm:flex-row. Font clamp 2rem. Delete Confidential line. |
| ReportExecutiveSummary.tsx | MODIFY | Remove vsAvg + DeltaBadge Avg + BenchmarkRow Global Average. Responsive donut SVG. |
| ReportBenchmarkChart.tsx | MODIFY | Remove Global Avg bar + data key + disclaimer. Responsive height h-[200px] sm:h-[280px]. |
| ReportRadarChart.tsx | MODIFY | Remove Global Avg radar + data. vsAvg->vsTop10. Truncate names. Hide progress bar mobile. Responsive height h-[280px] sm:h-[360px]. |
| ReportBehavioralMatrix.tsx | MODIFY | Responsive height h-[260px] sm:h-[340px]. Shorter axis labels. |
| report-benchmarks.ts | MODIFY | Remove globalAverage from interfaces and data. Make top10 required. Add top10 placeholders. |
| report-insights.ts | MODIFY | All globalAverage -> top10. Rewrite thresholds. Update deltas and wording. |
| InsightBlock.tsx | NO CHANGE | |
| ReportShareBar.tsx | NO CHANGE | |
| ReportVocabularyGap.tsx | NO CHANGE | |
| report-page.spec.ts | MODIFY | Delete CTA test. Rewrite sidebar tests. Add no-CTA, no-GlobalAvg, no-disclaimer tests. |

---

## Exact API/Data Shape Changes

### SectionBenchmarks (before -> after)

```typescript
// BEFORE
export interface SectionBenchmarks {
  globalAverage: BenchmarkTier;   // REMOVE
  top10?: BenchmarkTier;          // CHANGE: remove ?, make required
}

// AFTER
export interface SectionBenchmarks {
  top10: BenchmarkTier;
}
```

### DomainBenchmark (before -> after)

```typescript
// BEFORE
export interface DomainBenchmark {
  globalAverage: number;   // REMOVE
  top10?: number;          // CHANGE: remove ?, make required
}

// AFTER
export interface DomainBenchmark {
  top10: number;  // accuracy 0-1
}
```

### SECTION_BENCHMARKS data (after)

```typescript
export const SECTION_BENCHMARKS: Record<string, SectionBenchmarks> = {
  "Diagnostic": {
    "top10": { "accuracy": 0.85, "avgTimeSeconds": 180, "avgConfidence": 78 }
  }
};
```

### DOMAIN_BENCHMARKS data (after)

```typescript
export const DOMAIN_BENCHMARKS: Record<string, DomainBenchmark> = {
  "Craft and Structure":               { "top10": 0.85 },
  "Information and Ideas":             { "top10": 0.82 },
  "Standard English Conventions":      { "top10": 0.80 },
  "Expression of Ideas":               { "top10": 0.83 },
  "Advanced Math":                     { "top10": 0.78 },
  "Geometry and Trigonometry":         { "top10": 0.80 },
  "Problem-Solving and Data Analysis": { "top10": 0.79 },
  "Algebra":                           { "top10": 0.77 }
};
```

Note: Top 10% values are estimated placeholders. Recompute from 76-student dataset once percentile ranking is implemented.

### generateSectionInsight new threshold logic

```typescript
// 4 tiers based on distance from top10:
if (accuracy >= bench.top10.accuracy) {
  // Elite-Tier (tone: strength)
} else if (accuracy >= bench.top10.accuracy - 0.15) {
  // Near Top 10% (tone: strength)
} else if (accuracy >= bench.top10.accuracy - 0.30) {
  // Developing (tone: opportunity)
} else {
  // Significant Gap (tone: critical)
}
```

### API route impact

The /api/reports/[resultId] route constructs data.benchmarks from SECTION_BENCHMARKS and DOMAIN_BENCHMARKS exports. Shape change propagates automatically. No API route code changes needed.
---

## Implementation Steps (Ordered)

### Step 1: Archive v1 (prerequisite)
**Files**: Create src/app/reports/[resultId]/v1/
**Dependencies**: None
**Description**: Copy all 9 component files + page.tsx into v1/. Create v1/README.md.
**Parallelizable**: Yes, independent.

### Step 2: Update data layer (REQ-009)
**Files**: src/lib/report-benchmarks.ts
**Dependencies**: None
**Description**: Remove globalAverage from interfaces and data. Make top10 required. Add top10 placeholders.
**Satisfies**: REQ-009
**Parallelizable**: Must come before Steps 3-5.

### Step 3: Update insight engine (REQ-010)
**Files**: src/lib/report-insights.ts
**Dependencies**: Step 2
**Description**: Replace all bench.globalAverage with bench.top10. Rewrite generateSectionInsight threshold logic. Update generateWeakDomainInsights delta. Update wording.
**Satisfies**: REQ-010
**Parallelizable**: Can parallel with Steps 4 and 5.

### Step 4: Delete CTA + strip sales (REQ-001)
**Files**: page.tsx, ReportConsultationCTA.tsx
**Dependencies**: Step 1 (archive first)
**Description**: Remove import, 3 JSX usages, 2 flanking Dividers. Delete CTA file.
**Satisfies**: REQ-001
**Parallelizable**: Can parallel with Steps 3 and 5.

### Step 5: Remove Global Average from charts (REQ-006, REQ-007, REQ-008, REQ-011)
**Files**: ReportBenchmarkChart.tsx, ReportRadarChart.tsx, ReportExecutiveSummary.tsx
**Dependencies**: Step 2
**Description**: Remove Global Avg bars/radars/rows/badges/disclaimer from all chart components.
**Satisfies**: REQ-006, REQ-007, REQ-008, REQ-011
**Parallelizable**: Can parallel with Steps 3 and 4.

### Step 6: Mobile layout optimizations (REQ-002 through REQ-005, REQ-012 through REQ-014)
**Files**: page.tsx, ReportCover.tsx, all chart components
**Dependencies**: Steps 4 and 5
**Description**: Remove aside, relocate Key Recs, single-column, responsive heights, cover mobile, donut sizing, domain table truncation, axis labels, spacing.
**Satisfies**: REQ-002, REQ-003, REQ-004, REQ-005, REQ-012, REQ-013, REQ-014

### Step 7: Verify TypeScript compilation
**Dependencies**: Steps 2-6
**Description**: Run tsc --noEmit to confirm zero type errors.

### Step 8: Update E2E tests (REQ-015)
**Files**: tests/e2e/report-page.spec.ts
**Dependencies**: Steps 1-7
**Satisfies**: REQ-015

### Step 9: Run E2E + Playwright spot-checks
**Dependencies**: Step 8
**Description**: npx playwright test. Playwright MCP spot-checks at 390px and 1280px.

### Parallelization Diagram

```
Step 1 (archive) ────────────────────────────┐
                                              v
Step 2 (data) ──┬── Step 3 (insights)  Step 4 (delete CTA)
                └── Step 5 (charts)         |
                         |                   |
                Step 6 (mobile) <────────────┘
                         |
                Step 7 (tsc verify)
                         |
                Step 8 (E2E tests)
                         |
                Step 9 (run tests)
```

Steps 1, 2, and 4 can all start in parallel.
Steps 3 and 5 start once Step 2 is done, and run in parallel.
Step 6 depends on Steps 4 and 5.
Steps 7-9 are sequential.
---

## E2E Test Changes Detail

### Tests to DELETE
- Line 169-179: Consultation CTAs present with booking link

### Tests to REWRITE

**Line 181-187** -> Key Recommendations visible in main content (assert visible, no aside, no forms.gle links)

**Line 189-196** -> No sidebar at any viewport (at both 390px and 1280px, aside count is 0)

### Tests to ADD

1. **No sales CTAs or booking links** - assert no Book Free, Unlock Your Full Score Potential, Get Your Personalized Study Plan, or forms.gle links
2. **No Global Average benchmark text** - assert no Global Avg, vs Avg, or Global Average text
3. **No benchmark disclaimer text** - assert no estimated averages or Benchmark figures are estimated text

### Tests UNCHANGED
- REQ-001: Header and FloatingCTA are hidden (line 88)
- REQ-001: Cover section shows student name (line 98)
- REQ-002: Sticky toolbar visible with brand name (line 111)
- REQ-003: Section labels 01-05 in gold appear (line 119)
- REQ-003: Analyst Take insight block appears (line 129)
- REQ-004: Domain breakdown shows SAT domain names (line 134)
- REQ-004: Highest-Leverage Domains insight appears (line 149)
- REQ-004: Behavioral analysis shows pacing insight (line 154)
- REQ-004: Vocabulary gap shows flagged words (line 161)
- Report ID appears in footer (line 198)

---

## Traceability Matrix

| REQ ID  | Description                              | Verification     | Test/Check Location               | Status  |
|---------|------------------------------------------|------------------|-----------------------------------|---------|
| REQ-001 | Remove all sales/consultation CTAs       | (BROWSER)+(TEST) | E2E spec + tsc --noEmit           | Pending |
| REQ-002 | Single-column layout (remove sidebar)    | (BROWSER)        | E2E spec                          | Pending |
| REQ-003 | Mobile-optimized cover                   | (BROWSER)        | Playwright MCP 390px              | Pending |
| REQ-004 | Mobile chart height optimization         | (BROWSER)        | Playwright MCP 390px + 768px      | Pending |
| REQ-005 | Donut SVG responsive sizing              | (BROWSER)        | Playwright MCP 390px              | Pending |
| REQ-006 | Remove Global Avg from benchmark chart   | (BROWSER)        | Playwright MCP + E2E spec         | Pending |
| REQ-007 | Remove Global Avg from radar chart       | (BROWSER)        | Playwright MCP + E2E spec         | Pending |
| REQ-008 | Remove Global Avg from Executive Summary | (BROWSER)        | Playwright MCP + E2E spec         | Pending |
| REQ-009 | Remove Global Avg from data layer        | (TEST)           | tsc --noEmit                      | Pending |
| REQ-010 | Remove Global Avg from insight engine    | (TEST)           | tsc --noEmit + grep               | Pending |
| REQ-011 | Remove benchmark disclaimer text         | (BROWSER)        | E2E spec                          | Pending |
| REQ-012 | Radar domain table mobile layout         | (BROWSER)        | Playwright MCP 390px              | Pending |
| REQ-013 | Behavioral matrix axis labels            | (BROWSER)        | Playwright MCP 390px              | Pending |
| REQ-014 | Tighter vertical spacing on mobile       | (BROWSER)        | Playwright MCP 390px              | Pending |
| REQ-015 | Update E2E tests                         | (TEST)           | npx playwright test               | Pending |

---

## Testing Strategy

- **REQ-001** -> E2E: no CTA text, no forms.gle links
- **REQ-002** -> E2E: no aside, Key Recs in main
- **REQ-003** -> Playwright MCP spot-check at 390px
- **REQ-004** -> Playwright MCP spot-check at 390px and 768px
- **REQ-005** -> Playwright MCP spot-check at 390px
- **REQ-006** -> E2E: no Global Avg text + Playwright MCP
- **REQ-007** -> E2E: no Global Avg text + Playwright MCP
- **REQ-008** -> E2E: no Global Average / vs Avg text + Playwright MCP
- **REQ-009** -> tsc --noEmit passes
- **REQ-010** -> tsc --noEmit + grep globalAverage returns 0
- **REQ-011** -> E2E: no estimated averages text
- **REQ-012** -> Playwright MCP 390px (no h-scroll)
- **REQ-013** -> Playwright MCP 390px (labels readable)
- **REQ-014** -> Playwright MCP 390px (spacing visual)
- **REQ-015** -> npx playwright test passes

---

## Risks and Considerations

1. **Top 10% placeholder values**: No real top-10% values from the 76-student dataset. Placeholders (0.77-0.85) used. Extend scripts/export-question-benchmarks.mjs for percentile rankings. Not blocking.

2. **API route compatibility**: /api/reports/[resultId] constructs benchmarks from report-benchmarks.ts. Shape change propagates automatically. No API route changes needed.

3. **Print layout**: Aside was print:hidden. Relocated Key Recs and About will now print. Worth a spot-check.

4. **recharts ResponsiveContainer height=100%**: Requires parent with explicit height. Tailwind h-[Xpx] satisfies this.

5. **SVG donut scaling**: width=100% height=100% with viewBox is standard SVG. Math is viewBox-relative.

6. **E2E seeded data**: New tests assert absence of text, which pass regardless of data content.

7. **Insight text regression**: Rewriting generateSectionInsight changes insight copy. Still rule-based and deterministic, calibrated against Top 10%.

---

## Out of Scope

- Computing real Top 10% percentile values from the dataset (follow-up task)
- Redesigning the report data model or API route logic
- Adding new report sections or analytics
- Changing the Navy/Gold color scheme or Playfair/Inter typography
- Touch/swipe interactions for charts
- Offline/PWA support
- Any new npm dependencies
- Server-side responsive detection (all CSS-based)
- i18n / localization