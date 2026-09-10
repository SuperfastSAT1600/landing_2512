# SuperfastSAT Enrollment Page (V2) — Complete Section Breakdown

**Date:** 2026-08-01  
**Route:** `/enrollment2026`  
**Main Component:** `EnrollmentV2Page` (src/components/enrollment-v2/EnrollmentV2Page.tsx)

---

## Quick Reference: Page Structure

```
┌─────────────────────────────────────────────────────────────┐
│ VIDEO HERO (v2-exam)                                        │
│ • YouTube iframe background (3_FyzliFEbw)                   │
│ • Headline: "아이에게 / 딱 맞는 수업을 / 받아보세요"        │
│ • SAT / AP toggle buttons                                   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ FIXED STEP NAV (appears on scroll)                          │
│ 1️⃣ 과목 선택 | 2️⃣ 수업 선택 | 3️⃣ 수업료                    │
└─────────────────────────────────────────────────────────────┘
                            ↓
            ┌───────────────┴────────────────┐
            ↓                                ↓
    ┌──────────────────┐            ┌──────────────────┐
    │ SAT FLOW         │            │ AP FLOW          │
    │ ─────────────    │            │ ────────────     │
    │ • Management     │            │ • Subject Search │
    │   Type           │            │ • Showcase       │
    │ • Showcase (6)   │            │ • Hour Picker    │
    │ • Format Picker  │            │ • Pricing        │
    │ • Packages       │            │ • CTA            │
    └──────────────────┘            └──────────────────┘
```

---

## 1. VIDEO HERO SECTION

**Component:** `EnrollmentVideoHero` (src/components/enrollment-v2/EnrollmentVideoHero.tsx)  
**Anchor ID:** `v2-exam`

### Content Layers
| Layer | Type | Content |
|-------|------|---------|
| z-0 | Video BG | YouTube iframe (40% opacity) + poster fallback |
| z-1 | Overlay | Gradient black (15%→92%→97%) + blue glow |
| z-2 | Text | Headline + SAT/AP buttons + scroll hint |

### Key Props
- `onExamSelect?: (exam: 'SAT' | 'AP') => void` — Fired when user taps button

### Styling
- **Height:** `100dvh` (dynamic viewport)
- **Padding-top:** 134px (site header offset)
- **Headline:** `clamp(2rem, 9vw, 3.5rem)`, font-weight 900, letter-spacing -0.03em
- **Video aspect ratio:** Covers all screen ratios (16:9 landscape, portrait safe)
- **Mobile:** YouTube hidden, poster image at 45% opacity

### Animations
- **Chevron bounce:** 1.8s infinite (0.4→0.75 opacity)
- **No autoplay constraints:** Video muted + autoplay=1 forced

---

## 2. FIXED STEP NAVIGATION

**Component:** `EnrollmentStepNav` (inline in EnrollmentV2Page.tsx)

### Visibility Logic
- **Shown when:** `exam !== null && !heroInView`
- **Hidden when:** Hero section is visible (IntersectionObserver)
- **Position:** Fixed top-0, z-40, full width
- **Transition:** opacity + translateY (0.3s ease)

### Structure
```
┌─────────────────────────────────────────────┐
│ [1] 과목 선택  │  [2] 수업 선택  │  [3] 수업료  │
│  inactive     │    active ✓     │  inactive   │
│               │  ════════════   │             │
└─────────────────────────────────────────────┘
```

### Each Step Button
- **Badge:** Numbered circle (1/2/3), inactive: white/10, active: white bg
- **Label:** 14px uppercase, inactive: opacity-40
- **Indicator:** 2.5px white underline (active only)
- **Scroll callback:** On click, smooth-scroll to anchor with dynamic offset

### Scroll Offset Adjustments
- When nav hidden: 134px (account for site header)
- When nav visible: 72px (nav + padding combined)

---

## 3. MANAGEMENT FIT SECTION (SAT Only)

**Component:** `ManagementFitSection` (src/components/enrollment/enrollment/ManagementFitSection.tsx)  
**Anchor ID:** `v2-selection`

### Purpose
Present two enrollment paths with personas & visual thumbnails

### Data: Personas

**MANAGED** (체계적인 지원형)
- 계획 세우기 어려운 학생
- 뭘 틀리는지 모르겠는 학생
- 체계적으로 SAT시험을 준비하고 싶은 학생

**UNMANAGED** (자기주도형)
- 스스로 계획을 세우는 학생
- 공부 환경이 갖춰진 학생
- 내 SAT공부의 약점을 알고 있는 학생

### Thumbnail SVGs (Blur-resistant design)
1. **ThumbSkillBars** — 4 horizontal bars with progress colors (red, blue, yellow, green)
2. **ThumbBarChart** — Vertical bars showing "91점 +19점 향상"
3. **ThumbVideoGrid** — 2×2 grid + "LIVE" badge (red)
4. **ThumbChecklist** — 4 task rows with checkmarks

### Mobile Responsiveness
| Breakpoint | Layout | Grid |
|------------|--------|------|
| Desktop | Sidebar + thumbnails | 1 col per type |
| Tablet | Full-width cards | 1 col per type |
| Mobile | Stacked cards | 2 cols per type |

---

## 4. SERVICE SHOWCASE SECTION

**Components:** `ManagedShowcase` / `UnmanagedShowcase` (src/components/enrollment/enrollment/ManagedShowcase.tsx)  
**Anchor ID:** `v2-showcase`

### Managed Service Cards (6 Tabs)

#### Card 01: 맞춤형 수업 (Custom Lesson)
- **Visual:** 4 puzzle pieces (스케줄, 시험 목표, 약점, 수업 스타일) assembling around center
- **Animation:** Sequential reveal every 550ms → center glow on complete
- **Loop:** 2.4s assembly + 1.8s hold + repeat

#### Card 02: 학습 리포트 (Score Report)
- **Visual:** Document with scrolling text, live graph, coach memo
- **Data:** 5-day progression (scores + R&W/Math breakdown)
- **Graph:** Animated polyline + gradient fill + interactive dot
- **Animation:** Doc scroll up (6.2s) + fade (6.7s cycle)

#### Card 03: 온라인 독서실 (Online Library)
- **Visual:** 2×2 video grid with status badges
- **Status colors:** Green (출석), Orange (지각), Gray (휴식)
- **Animation:** Sequential tile pop-in (250ms + 420ms intervals)

#### Card 04: AI 코치 (AI Coach)
- **Visual:** Chat bubbles between student SVG & AI robot
- **Student:** "이 문제 어떻게 풀어야 할 지 헷갈리네.." → "아뇨..."
- **AI:** 3 messages, character-by-character typing (44ms per char)
- **Animation:** ~20s dialog + 2.2s pause cycle

#### Card 05: 단어 공부 (Vocabulary)
- **Visual:** Flip cards (ephemeral, reticent, cogent)
- **Animation:** 1.3s flip + 0.7s pause + 1.4s wait → cycle
- **Indicators:** Dot progress (3 dots)

#### Card 06: 실전 모의고사 (Mock Exams)
- **Visual:** Calendar (5 weeks, 31 days) with Saturday checkmarks
- **Stars:** Appear on Saturdays (1, 8, 15, 22, 29)
- **Animation:** 400ms + 560ms per date

### Unmanaged Service Cards (3 Tabs)
Subset: Cards 01, 02, 05

### Tab Navigation
- **Tab bar:** Grid layout (3 cols for unmanaged, 6 for managed)
- **Auto-cycle:** Every 5 seconds (unless user interacts)
- **Progress bar:** Linear animation under active tab
- **Panel transitions:** 0.3s slide (±48px) + fade (ease [0.4, 0, 0.2, 1])

### Mobile Responsive Grids
| View | Managed | Unmanaged |
|------|---------|-----------|
| Desktop | grid-cols-6 | grid-cols-3 |
| Mobile (AP) | N/A | grid-cols-2 |

---

## 5. CLASS FORMAT PICKER

**Component:** `ClassFormatPicker` (inline, after management selection)  
**Section:** Full viewport height on mobile, block on desktop

### SAT Options

**MANAGED PATH:**
```
🧑‍💻 1:1 정규수업
   전담 코치와 1:1 맞춤 수업

👥 1:4 특강수업 (custom 2×2 grid icon)
   소그룹 집중 특강
```

**UNMANAGED PATH:**
```
🧑‍💻 1:1 정규수업
   코치와 1:1 수업 / 자기주도 방식

📱 콘텐츠 학습
   단어·인강·문제풀이 / 월간 구독 콘텐츠
```

### Card Styling
```
SelectCard {
  unselected:
    border: rgba(255,255,255,0.08)
    bg: rgba(255,255,255,0.03)
    hover: border-white/15

  selected:
    border: rgba(96,133,255,0.6)
    bg: rgba(7,27,233,0.07)
    shadow: 0_0_40px rgba(96,133,255,0.12), 0_0_0_1px rgba(96,133,255,0.2)

  touch: active:scale-0.98
}
```

### Heading
- `font-size: clamp(1.75rem, 5vw, 2.5rem)`
- `font-weight: 800`
- `letter-spacing: -0.02em`
- `word-break: keep-all`

---

## 6. PACKAGE PICKER SECTIONS

### 6.1 Managed 1:1 Packages

**Visibility:** `categoryId === 'one-on-one'`

#### Package Data
```typescript
MANAGED_PKGS = [
  { id: '1on1-10h',  hours: 10, totalPrice: 1650000, discountRate: null },
  { id: '1on1-20h',  hours: 20, totalPrice: 2990000, discountRate: 9  },
  { id: '1on1-40h',  hours: 40, totalPrice: 5390000, discountRate: 18 },
]
```

#### Card Animation
- **Unselected:** Neutral border, refund message visible
- **On click:** Gradient fill sweeps left→right (0.55s)
- **Reveal sequence:**
  - 0.45s: Discount % + savings text (red-400)
  - 0.82s: Total price (white, scale bounce)

#### Premium Director Package
- **Badge:** "프리미엄" (amber-400/20 bg, serif BookkMyungjo)
- **Price:** 1,800,000원 (10 hours)
- **Expands on selection:** Coach lineup grid (2 cols)
- **Coach card:** Photo (4:3), subjects tags, name, bio, link

#### Coach Fetching
- Endpoint: `GET /api/coaches/head`
- Triggered on director selection
- Response: `HeadCoach[]` array

---

### 6.2 Group Packages

**Visibility:** `categoryId === 'group'`

#### Package Data
```typescript
GROUP_PACKAGES_V2 = [
  { id: 'group-summer',  name: '여름특강',  subtitle: '여름방학 집중 과정', 
    totalPrice: 990000, durationLabel: '4주 · 주 5일', salesLabel: 'popular' },
  { id: 'group-chuseok', name: '추석특강',  subtitle: '연휴 집중 과정', 
    totalPrice: 490000, durationLabel: '2주 · 주 5일', salesLabel: 'new' },
  { id: 'group-theme',   name: '테마특강',  subtitle: '단기 집중 테마 과정', 
    totalPrice: 240000, durationLabel: '3일 · 6시간 코스', salesLabel: 'new' },
]
```

#### Badge Logic
- **popular:** "인기" (white bg, blue text)
- **new:** "NEW" (red-500/20 bg, red-400 text)
- **sold-out:** "마감" (white/55 text, white/20 border)

---

### 6.3 Content Packages (Unmanaged)

**Visibility:** `categoryId === 'content'`  
**Interaction:** Checkbox-based multi-select

#### Items
```typescript
CONTENT_ITEMS_V2 = [
  { id: 'content-vocab',     name: '단어',      monthlyPrice: 50000,  description: 'SAT 필수 어휘 학습' },
  { id: 'content-lecture',   name: '인강',      monthlyPrice: 249000, description: '전 범위 동영상 강의' },
  { id: 'content-problems',  name: '문제풀이',  monthlyPrice: 149000, description: '유형별 기출문제 풀이' },
]
```

#### Total Price Box (conditional)
Appears only if items selected:
```
┌────────────────────────────┐
│ 합산 월 구독료              │
│ 월 448,000원                │
└────────────────────────────┘
```

---

## 7. AP-SPECIFIC FLOW

**Anchor ID:** `v2-ap-subject` (entry point for AP exams)

### 7.1 Subject Search Section

#### Search Input
```
🔍 [과목명을 입력하세요 (예: Biology)]  [×]
```
- Real-time filtering on keystroke
- Animated result cards (opacity 0→1, y: 6→0)

#### Subject Status Data
```
AVAILABLE (14 subjects):
  • Biology, Calculus AB/BC, Chemistry, Computer Science A, 
    English Language, Macro/Micro Economics, Physics 1, 
    Precalculus, Psychology, Statistics, Comparative Govt, 
    US Govt, US History, World History

WAITING (5 subjects):
  • English Literature, Environmental Science, CS Principles, 
    Human Geography, European History, Physics 2

CLOSED (8 subjects):
  • Art History, Chinese, French, Music Theory, 
    Physics C: Mechanics, Physics C: E&M, Spanish, Latin
```

#### Status Colors
| Status | Dot | Text | BG | Label |
|--------|-----|------|-----|--------|
| available | emerald-400 | text-emerald-400 | emerald-500/7 | 수업이 가능합니다 |
| waiting | amber-400 | text-amber-400 | amber-500/7 | 대기가 필요합니다 |
| closed | white/30 | text-white/35 | white/2 | 선생님의 요청으로 마감되었습니다 |

### 7.2 Reviews Marquee (Auto-scrolling)
- **Carousel:** Duplicated AP_REVIEWS array for seamless loop
- **Speed:** 42s per full cycle
- **Hover:** Pauses animation
- **Card width:** w-64
- **Animation:** `@keyframes ap-marquee` (translateX 0→-50%)

#### Review Card Content
```
[Pill: AP Biology]
"FRQ 점수가 올라간 건 서술 구조를 배운 덕분이에요"

"채점관이 어디서 체크하는지를 알고 나니 FRQ 접근 방식이..."

eunji*** · 11학년
```

### 7.3 Managed Showcase (Filtered)
- **Props:** `excludeTabs={['단어 공부', '실전 모의고사']}`
- **Shows:** Cards 1, 2, 3, 4 only
- **Mobile columns:** 2

### 7.4 AP Hour Picker

**Pricing Tiers:**
```typescript
TIERS = [
  { min: 1,  max: 16, rate: 90000,  discount: 0 },   // 1–16시간
  { min: 17, max: 32, rate: 84600,  discount: 6 },   // 17–32시간
  { min: 33, max: 48, rate: 79200,  discount: 12 },  // 33–48시간
  { min: 49, max: 60, rate: 74700,  discount: 17 },  // 49–60시간
]
```

#### UI Components
1. **Stepper:** − / + buttons (w-11 h-11, border-white/15)
2. **Display:** Center text (text-5xl font-black)
3. **Slider:** range input (min-1 max-60, accent-red-500)
4. **Price box:** Shows discount % + total, animated gradient fill

#### Discount Animation
- Gradient sweep: left→right (0.6s)
- Discount %, savings text, total price: all staggered reveals

### 7.5 AP Pricing Section

**Popular Packages:**
```typescript
AP_PKGS = [
  { id: 'ap-16h',  hours: 16, totalPrice: 1440000,  discountRate: null },
  { id: 'ap-32h',  hours: 32, totalPrice: 2707200,  discountRate: 6  },
  { id: 'ap-48h',  hours: 48, totalPrice: 3801600,  discountRate: 12 },
]
```

#### Card Animation
Same as SAT 1:1 packages (gradient fill + reveal sequence)

#### CTA
```
과목 선택과 맞춤 커리큘럼 상담을 받으실 수 있습니다

[원장님과 직접 상담하고 로드맵 만드세요]
→ open.kakao.com/o/sxHGVZ4h
```

---

## 8. UTILITY FUNCTIONS

### Currency Formatting
```typescript
function formatWon(n: number): string {
  if (n >= 10000) {
    const man = Math.floor(n / 10000);
    const rem = n % 10000;
    return rem > 0 ? `${man}만 ${rem.toLocaleString()}원` : `${man}만원`;
  }
  return `${n.toLocaleString()}원`;
}

// Examples:
// 1650000 → "165만원"
// 2990000 → "299만원"
// 50000 → "50,000원"
```

### HTML Stripping
```typescript
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}
```

---

## 9. GLOBAL COLOR PALETTE

```css
--accent-primary: #071be9    (main blue, buttons, selection)
--accent-glow: #6085ff       (lighter blue, borders, accents)
--accent-secondary: #00A6A6  (teal, secondary accents)
--bg-base: #000000           (page background)
--bg-surface: #09090b        (card background)
--text-primary: #ffffff      (main text)
--text-secondary: rgba(255,255,255,0.4-0.8) (muted text)
--red-accent: #ef4444        (discounts, alerts)
--amber-accent: #fbbf24      (premium/director badge)
```

---

## 10. RESPONSIVE BREAKPOINTS

| Breakpoint | Width | Hero | Tabs | Grid | Features |
|------------|-------|------|------|------|----------|
| Desktop | ≥768px | Full viewport | 6 cols (managed) | 1-2 cols | All animations |
| Tablet | 640-767px | Full viewport | 3-6 cols | 1-2 cols | All animations |
| Mobile | <640px | Full viewport | 2-3 cols | 2 cols | Touch-optimized |

### Mobile-Specific
- YouTube iframe hidden (poster image only)
- Single-column stacking
- Touch targets ≥44px height
- Reduced motion support

---

## 11. ANIMATION SPECIFICATIONS

### Page-Level
- **Hero scroll:** Step nav opacity + translateY (0.3s ease)
- **Chevron bounce:** 1.8s infinite (0→6px, 0.4→0.75 opacity)

### Component-Level
- **Puzzle pieces:** 400ms + 550ms per piece (2.4s total)
- **Flip cards:** 1.3s flip + 0.7s pause
- **Tab panels:** 0.3s slide ±48px + fade
- **Gradient fills:** 0.55s left→right (cubic easing)
- **Number reveal:** 0.28s scale + move (ease [0.34, 1.56, 0.64, 1])

### Framer Motion Config
```typescript
PANEL_TRANSITION = {
  duration: 0.3,
  ease: [0.4, 0, 0.2, 1]  // Cubic easing curve
};
```

---

## 12. ACCESSIBILITY

### Semantic HTML
- `<section>` + `id` anchors for landmarks
- `<article>` for card components
- `role="tab"`, `role="tabpanel"`, `role="group"`
- `aria-selected`, `aria-pressed` state tracking
- `aria-label`, `aria-controls` relationships
- `aria-hidden="true"` for decorative SVGs

### Keyboard Navigation
- Tab focus on buttons
- Enter/Space activation
- Anchor links (smooth scroll)

### Motion Preference
- Respects `prefers-reduced-motion: reduce`
- Disables all Framer Motion animations when set
- No auto-playing video with audio

---

## 13. METADATA & SEO

**Layout File:** enrollment2026/layout.tsx

```typescript
export const metadata: Metadata = {
  title: 'SAT목표 점수에 가장 빠르게 | SuperfastSAT',
  description: '올릴 딱 맞는 수업을 받아보세요',
  robots: { index: false },  // Prevent indexing (gate-protected)
};
```

### OG Tags
```
og:url = https://tutoring.superfastsat.com/enrollment2026
og:type = website
og:site_name = SuperfastSAT
```

### Access Control
- Route gated by `enrollment-page-status.json`
- Admin cookie `admin_verified=1` bypasses pause
- Non-admin users redirected to `/` when paused

---

## 14. STATE MANAGEMENT FLOW

### Main State (EnrollmentV2Page)
```typescript
const [exam, setExam] = useState<'SAT' | 'AP' | null>(null);
const [managementType, setManagementType] = useState<ManagementType | null>(null);
const [classFormat, setClassFormat] = useState<CategoryIdV2 | null>(null);
const [selectedOption, setSelectedOption] = useState<OptionSelectionV2 | null>(null);
const [showcaseOpen, setShowcaseOpen] = useState(false);
const [heroInView, setHeroInView] = useState(true);
```

### Option Types
```typescript
type OptionSelectionV2 =
  | { type: 'hour-package'; packageId: string }
  | { type: 'group-package'; packageId: string }
  | { type: 'content'; contentIds: string[] };

type CategoryIdV2 = 'one-on-one' | 'group' | 'unmanaged' | 'content';
```

### Scroll Behavior
- `scrollOffsetRef`: Dynamic nav height (134px → 72px)
- IntersectionObserver: Hero visibility detection
- Root margin: `-20% 0px -65% 0px` (step indicator trigger)

---

**Documentation Reference**  
For component-specific details, see individual `.tsx` files in src/components/enrollment*.
