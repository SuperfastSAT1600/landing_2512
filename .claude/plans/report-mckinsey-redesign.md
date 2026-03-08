# McKinsey-Style Premium Report Redesign

## Overview
Redesign `/reports/[resultId]` to be fully independent from the landing page with premium McKinsey aesthetics, rule-based insight commentary, 2-column sticky sidebar layout, and consultation CTAs.

## Requirements

### REQ-001: Layout Independence (BROWSER)
Hide Header and FloatingCTA on `/reports/**` paths via pathname guards.

### REQ-002: Reports Layout with Premium Fonts (BROWSER)
Create `src/app/reports/layout.tsx` with Playfair Display (serif headings) + Inter (body).

### REQ-003: Rule-Based Insight Engine (TEST)
Create `src/lib/report-insights.ts` with pure functions generating per-section text commentary based on accuracy vs. benchmarks.

### REQ-004: Full-Viewport Cover Section (BROWSER)
Create `ReportCover.tsx` — Navy `#0A1628` background, student name in large Playfair Display, score summary, Gold `#C9A84C` accents.

### REQ-005: 2-Column Sticky Sidebar Layout (BROWSER)
Rewrite `page.tsx` with main content (left, ~65%) and sticky sidebar (right, ~35%) on desktop; single column on mobile.

### REQ-006: InsightBlock Component (BROWSER)
Create shared `InsightBlock.tsx` that displays rule-based insight beneath each chart section with icon, headline, and prose.

### REQ-007: Consultation CTA (BROWSER)
Create `ReportConsultationCTA.tsx` — premium card with phone booking link, appearing in sidebar + after key sections.

## Traceability Matrix

| REQ ID  | Description                | Verification | Location |
|---------|----------------------------|-------------|----------|
| REQ-001 | Layout independence         | (BROWSER)   | Header.tsx, FloatingCTA.tsx |
| REQ-002 | Premium fonts layout        | (BROWSER)   | reports/layout.tsx |
| REQ-003 | Insight engine              | (TEST)      | src/lib/report-insights.ts |
| REQ-004 | Cover section               | (BROWSER)   | ReportCover.tsx |
| REQ-005 | 2-column layout             | (BROWSER)   | reports/[resultId]/page.tsx |
| REQ-006 | InsightBlock component      | (BROWSER)   | InsightBlock.tsx |
| REQ-007 | Consultation CTA            | (BROWSER)   | ReportConsultationCTA.tsx |
