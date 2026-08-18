# Mobile Diagnostic Report — Design Guide

**Reference**: 3-screen mobile analytics dashboard (fintech style)
**Target route**: `/reports/[resultId]`
**Current state**: Desktop 2-column layout with dark cover, to be redesigned mobile-first

---

## 1. Color System

| Role | Value | Usage |
|------|-------|-------|
| Page background | `#EBEBF2` | Full page bg |
| Card background | `#FFFFFF` | All cards |
| Brand blue | `#3D3DF5` | Charts, active icons, primary button |
| Brand blue (light) | `#A5A8F8` | Secondary bars, inactive states |
| Text primary | `#1A1A2E` | Headings, large numbers |
| Text secondary | `#8B8FA8` | Labels, dates, subtitles |
| Positive | `#3AC977` | Correct answers, upward trends |
| Negative / Error | `#F04452` | Wrong answers, downward trends |
| Warning | `#F59E0B` | Caution states |
| Card border | `#F0F0F5` | Dividers inside cards |

---

## 2. Typography Scale

| Element | Size | Weight | Color | Notes |
|---------|------|--------|-------|-------|
| Page greeting (Hi {name}) | 22px | 700 | text-primary | Top of screen |
| Large metric number | 28–32px | 700 | text-primary | letter-spacing: -0.5px |
| Section label | 13px | 500 | text-secondary | UPPERCASE, letter-spacing: 0.05em |
| Card subtitle | 12px | 400 | text-secondary | Date, period labels |
| Stat change badge | 12px | 600 | positive/negative | e.g. "+2.5% vs. last month" |
| Body / description | 14px | 400 | text-secondary | Insight text inside cards |

Font stack: `Inter, system-ui, sans-serif`

---

## 3. Card Component Spec

```
border-radius:  16px
padding:        20px
background:     #FFFFFF
box-shadow:     0 2px 8px rgba(0, 0, 0, 0.05)
margin-bottom:  12px
```

### Standard Metric Card Layout

```
┌────────────────────────────────────┐
│ Section label (13px, gray)         │
│                         [mini bar  │
│ 28px bold number        chart 60h] │
│ +N% badge (green/red)              │
└────────────────────────────────────┘
```

- Mini chart sits **right-aligned**, ~80px wide, 60px tall
- Large number and change badge are **left-aligned**
- No border — shadow only

---

## 4. Chart Patterns

### Mini Bar Chart (embedded in metric card)
- 5–7 bars, height 60px, bar width 8px, gap 4px
- Inactive bars: `#D0D2F0`
- Current / highlight bar: `#3D3DF5`
- Dashed reference line: `#E0E0E8`, 1px dashed
- No axes, no labels

### Main Bar Chart (full-width card, e.g. Transactions)
- Height ~120px, bar width 8px, gap 3px
- x-axis labels: start date (left) / "Today" (right) only
- Below chart: 3-column summary row
  - Succeeded ✓ | Failed ✗ | Refunded ↩
  - Icon + count, small text, color-coded

### Line Chart (e.g. domain trends)
- Thick primary line `#3D3DF5`, stroke-width 2.5
- Secondary lines `#A5A8F8`, stroke-width 1.5
- Interactive point: open circle, 8px diameter
- Tooltip: `background #1A1A2E`, white text, border-radius 8px, arrow pointer
- Y-axis: 0, 20, 40, 60, 80, 100 — light gray labels
- Vertical crosshair: dashed `#C0C0D0`

### Horizontal Bar (domain breakdown, replaces radar on mobile)
- Full width, height 6px, border-radius 3px
- Background track: `#EBEBF2`
- Fill: `#3D3DF5`
- Label left / percentage right, both 13px

---

## 5. Mobile Page Layout

**Max width**: 390px (iPhone 14 reference), full-width on smaller screens
**Safe areas**: padding-top env(safe-area-inset-top), padding-bottom 80px (tab bar)

```
┌──────────────────────────┐
│  [Logo]          [≡]     │  ← Sticky header, 56px, white bg
│  Hi {studentName}        │
│  {date}   [Section ▾]    │  ← Greeting + tab switcher
├──────────────────────────┤
│                          │  ← Scrollable content area
│  [Score card]            │
│  [R&W card] [Math card]  │  ← 2-col mini cards side by side
│  [Benchmark bar card]    │
│  [Domain breakdown card] │
│  [Behavioral card]       │
│  [Vocabulary card]       │
│  [CTA card]              │
│                          │
├──────────────────────────┤
│  📊  📋  ⏱  📖  💡     │  ← Bottom tab bar, 64px
└──────────────────────────┘
```

### Sticky Header
```
height:     56px
background: #FFFFFF
border-bottom: 1px solid #F0F0F5
padding: 0 20px
```

### Bottom Tab Bar
```
height:     64px
background: #FFFFFF
border-top: 1px solid #F0F0F5
padding-bottom: env(safe-area-inset-bottom)
icon size:  22px
active:     #3D3DF5
inactive:   #8B8FA8
```

---

## 6. Tab Structure (Bottom Navigation)

| # | Tab | Icon (Fluent) | Content |
|---|-----|---------------|---------|
| 1 | Overview | `fluent:home-24-regular` | Total score + section summary cards |
| 2 | Questions | `fluent:list-24-regular` | Per-question correct/wrong list |
| 3 | Behavior | `fluent:clock-24-regular` | Time vs confidence scatter + stats |
| 4 | Vocab | `fluent:book-open-24-regular` | Saved words grouped by difficulty |
| 5 | Insights | `fluent:lightbulb-24-regular` | AI insights + study plan CTA |

---

## 7. Existing Component → Mobile Card Mapping

| Current component | Mobile replacement |
|-------------------|--------------------|
| `ReportCover` (dark full-screen) | Sticky header greeting + hero score card (white, top of Overview tab) |
| `ReportExecutiveSummary` | Two side-by-side mini metric cards (R&W / Math), each with mini bar chart |
| `ReportBenchmarkChart` | Full-width horizontal grouped bar card |
| `ReportRadarChart` | Stacked horizontal bar list per domain (radar doesn't work on small screens) |
| `ReportBehavioralMatrix` (scatter) | Compact 160px scatter plot card with quadrant labels |
| `ReportVocabularyGap` | Horizontal-scroll chip list grouped by difficulty |
| `InsightBlock` | Colored left-border banner cards (tone: strength=green, priority=red, opportunity=blue) |
| `ReportConsultationCTA` | Full-width CTA card at bottom of Insights tab |
| `ReportShareBar` (sticky top) | Share icon button in sticky header (top-right) |

---

## 8. Key Card Designs

### Hero Score Card (top of Overview)
```
┌────────────────────────────────────┐
│ SAT Diagnostic · {date}            │
│                                    │
│      72%        [large donut       │
│  Overall Score   or arc chart]     │
│                                    │
│  ✓ 18/25 correct  ·  ⏱ 28m 03s   │
└────────────────────────────────────┘
```

### Section Mini Cards (2-col grid)
```
┌──────────────┐  ┌──────────────┐
│ Reading & W  │  │    Math      │
│ 68%    [bar] │  │ 76%    [bar] │
│ 9/13 correct │  │ 9/12 correct │
└──────────────┘  └──────────────┘
```

### Domain Breakdown Card
```
┌────────────────────────────────────┐
│ Domain Breakdown                   │
├────────────────────────────────────┤
│ Algebra          ████████░░  76%  │
│ Advanced Math    ██████░░░░  60%  │
│ Problem Solving  █████████░  88%  │
│ Craft & Structure████░░░░░░  40%  │
│ Information &    ███████░░░  68%  │
└────────────────────────────────────┘
```

### Insight Banner
```
┌────────────────────────────────────┐
│ ║ ✦ Strength                       │  ← green left border
│   Strong performance in Algebra.   │
│   Keep this as your anchor area.   │
└────────────────────────────────────┘
```
Left border width: 4px. Colors: strength=`#3AC977`, priority=`#F04452`, opportunity=`#3D3DF5`

---

## 9. Micro-interactions

| Trigger | Animation |
|---------|-----------|
| Tab switch | Horizontal slide (left/right), 200ms ease |
| Card entry (scroll into view) | `opacity: 0→1`, `translateY: 8px→0`, 300ms staggered |
| Metric number | countUp animation, 600ms ease-out on tab first-view |
| Chart bar | Grow from 0 height, 400ms ease-out, staggered 30ms per bar |
| Card tap | `scale(0.98)` 100ms, release back |
| Tooltip | Fade in 150ms |

---

## 10. Responsive Breakpoints

| Breakpoint | Behavior |
|-----------|----------|
| `< 390px` | Single column, full-width cards, 16px padding |
| `390–640px` | Target range — 2-col grid for mini cards |
| `640–1024px` | Tablet: slightly wider cards, same tab structure |
| `> 1024px` | Revert to current 2-column desktop layout |

The mobile layout is the **primary experience** (students use phones). Desktop is secondary.

---

## 11. Implementation Notes

- Use `framer-motion` (already in project) for card entry and tab transitions
- Replace `ReportRadarChart` (SVG radar) with horizontal bars — radar is unreadable below 400px
- Bottom tab state: `useState` or URL hash (`#overview`, `#questions`, etc.) for deep-linking
- Sticky header height: account for iOS notch via `env(safe-area-inset-top)`
- Chart library: current project uses custom SVG — keep consistent, no new chart lib
- All cards: `will-change: transform` only during animation, remove after

---

## 12. Files to Create / Modify

```
src/app/reports/[resultId]/
├── page.tsx                          ← add mobile layout branch
├── components/
│   ├── mobile/
│   │   ├── MobileReportLayout.tsx    ← tab shell + bottom nav
│   │   ├── MobileHeroCard.tsx        ← overall score card
│   │   ├── MobileSectionCards.tsx    ← 2-col R&W + Math cards
│   │   ├── MobileDomainBars.tsx      ← horizontal bar breakdown
│   │   ├── MobileBehaviorCard.tsx    ← compact scatter
│   │   ├── MobileVocabCard.tsx       ← chip scroll list
│   │   └── MobileInsightsTab.tsx     ← insights + CTA
│   └── [existing desktop components unchanged]
```

Detection: `useMediaQuery('(max-width: 1024px)')` → render mobile layout.
