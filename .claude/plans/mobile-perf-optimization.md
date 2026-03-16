---
spec: mobile-perf-optimization
version: 1.0
status: draft
---

# Spec: 저사양 모바일 & 저속 네트워크 성능 최적화

## Context

저사양 폰(iPhone 6s급 / Galaxy J2급)과 열악한 네트워크(3G/2G) 환경에서도
홈페이지를 쾌적하게 사용할 수 있도록 로딩 속도·렌더링 성능·애니메이션 부하를 최소화한다.

### 감사 요약 (Audit Findings)

| 구분 | 주요 문제 | 예상 영향 |
|------|-----------|-----------|
| 이미지 | `hero-background.png` 589 KB, WebP 없음 | 3G에서 6초 추가 로딩 |
| 렌더링 | 모든 섹션 동기 렌더링, Suspense 없음 | FCP 2~4초 지연 |
| CSS | backdrop-filter 9곳, 3D transform 다수 | 저가 폰 GPU thrashing |
| 폰트 | Pretendard CDN 외부 요청 | cold cache 시 1~2초 지연 |
| 이미지 컴포넌트 | Features.tsx 에 `<img>` 태그 사용 | 최적화 누락 |
| 애니메이션 | Canvas + Framer Motion + CSS 동시 실행 | 20~30 FPS |

---

## Requirements

### REQ-001: hero-background.png → next/image + WebP 전환 `(BROWSER)`
**Priority: Must**

`public/hero-background.png` (589 KB)를 WebP로 변환 후 `next/image`의 `<Image>` 컴포넌트로 교체.
- `priority` 속성으로 preload
- `sizes="100vw"` + 적절한 `quality={75}` 설정
- 기존 PNG는 유지 (fallback)

수정 파일: `src/app/components/Hero.tsx` (또는 히어로 배경 이미지 사용 컴포넌트)

---

### REQ-002: Features.tsx `<img>` → `<Image>` 교체 `(BROWSER)`
**Priority: Must**

`src/app/components/Features.tsx` 121번 라인 부근의 plain `<img>` 태그를
`next/image`의 `<Image>`로 교체해 lazy-loading + 자동 최적화 활성화.

---

### REQ-003: backdrop-filter 모바일 비활성화 `(BROWSER)`
**Priority: Must**

저사양 기기에서 backdrop-filter는 GPU compositing 레이어를 강제 생성해 FPS를 크게 낮춘다.
`@media (max-width: 768px)` 또는 `@media (prefers-reduced-motion: reduce)` 구간에서
`backdrop-filter: none`으로 오버라이드.

대상 파일:
- `src/app/components/Features.module.css` (blur 12px)
- `src/app/components/Hero.module.css` (blur 10px — badge, primaryBtn)
- `src/app/components/Testimonials.module.css` (blur 12px)
- `src/app/components/Header.module.css` (blur 12px)

fallback: `background: rgba(9, 9, 11, 0.85)` 등 불투명 색상으로 대체

---

### REQ-004: 모바일 3D transform 비활성화 `(BROWSER)`
**Priority: Must**

`src/app/components/Hero.module.css` 의 3D perspective/rotateX/rotateY/translateZ 가
모바일에서 연속 repaint를 유발.
`@media (max-width: 768px)` 에서:
- `transform: perspective(...) rotateY(...) rotateX(...)` → `transform: none`
- `.card:hover { transform: translateZ(50px)... }` → `transform: scale(1.02)` 로 단순화

---

### REQ-005: Suspense + 스트리밍으로 초기 HTML 렌더링 가속 `(BROWSER)`
**Priority: Must**

`src/app/page.tsx` 에서 below-the-fold 컴포넌트를 `React.Suspense`로 감싸
Hero 섹션을 먼저 사용자에게 전달한다.

```tsx
// Before: 모든 섹션이 서버 데이터 완성 후 일괄 전송
<Hero />
<Features />
<Testimonials />  // Supabase 쿼리 완료까지 대기
<LatestPosts />

// After: Hero 먼저 렌더, 나머지는 스트리밍
<Hero />
<Suspense fallback={<SectionSkeleton />}>
  <Features />
</Suspense>
<Suspense fallback={<SectionSkeleton />}>
  <Testimonials />
</Suspense>
<Suspense fallback={null}>
  <LatestPosts />
</Suspense>
```

데이터 페칭을 각 컴포넌트 내부로 이동해 Hero가 차단되지 않도록.

---

### REQ-006: Pretendard 폰트 self-host 또는 font-display 최적화 `(BROWSER)`
**Priority: Should**

현재 `globals.css` line 1에서 jsdelivr.net CDN 요청으로 Pretendard를 로드.
cold cache + 저속 네트워크에서 FOIT/FOUT 발생.

옵션 A (권장): `next/font/local`로 Pretendard 변수 폰트를 self-host
옵션 B (빠름): 기존 CDN 유지, `<link rel="preconnect" href="https://cdn.jsdelivr.net">` 추가 + `font-display: swap` 명시

수정 파일: `src/app/layout.tsx`, `src/app/globals.css`

---

### REQ-007: LiveStatus.tsx 애니메이션 조건부 비활성화 `(BROWSER)`
**Priority: Should**

`src/app/components/LiveStatus.tsx` 의 `setInterval` 4초 순환 + Framer Motion `AnimatePresence` 는
저사양 기기에서 불필요한 JavaScript 실행 비용 발생.

`prefers-reduced-motion` 감지 시 + 모바일 저사양 판단 시:
- interval 비활성화 (정적 텍스트 표시)
- Framer Motion `AnimatePresence` → 단순 CSS opacity transition으로 대체

---

### REQ-008: 고사양 기기에서만 Framer Motion ScrollReveal 활성화 `(BROWSER)`
**Priority: Could**

`src/app/components/ScrollReveal.tsx` 의 `motion.div` whileInView 효과가
저사양 기기에서 intersection 계산 + 애니메이션 연산 과부하.

`prefers-reduced-motion: reduce` 일 때 → ScrollReveal을 그냥 `<div>` pass-through로 렌더링.
(Testimonials, LatestPosts, Features 섹션 헤더에 사용 중)

---

## Implementation Steps

### Step 1 — 이미지 최적화 (REQ-001, REQ-002)
독립적, 가장 빠른 성능 개선 효과.

**REQ-001:**
- `public/hero-background.png` → WebP 변환 (`sharp` 또는 squoosh CLI)
- Hero 컴포넌트에서 `next/image`로 교체, `priority` + `quality={75}` + `sizes="100vw"`

**REQ-002:**
- `Features.tsx` ~121번 라인: `<img>` → `<Image>` 교체
- `width`, `height`, `sizes` 명시

### Step 2 — CSS 성능 (REQ-003, REQ-004)
`@media` 추가만으로 즉각적 효과.

각 module.css 파일에 모바일 브레이크포인트 오버라이드 추가:
```css
@media (max-width: 768px) {
  .card { backdrop-filter: none; background: rgba(9, 9, 11, 0.9); }
  .perspective { transform: none; transform-style: flat; }
}
```

### Step 3 — React 스트리밍 (REQ-005)
`page.tsx` 리팩토링. 데이터 페칭을 각 컴포넌트로 이동.

### Step 4 — 폰트 최적화 (REQ-006)
`layout.tsx` + `globals.css` preconnect 추가 또는 self-host.

### Step 5 — 애니메이션 조건부 비활성화 (REQ-007, REQ-008)
`prefers-reduced-motion` + 하드웨어 감지로 분기.

---

## Traceability Matrix

| REQ ID  | 설명                              | 검증      | 수정 파일                                          |
|---------|-----------------------------------|-----------|----------------------------------------------------|
| REQ-001 | hero-background WebP + next/image | (BROWSER) | Hero.tsx, public/hero-background.*                |
| REQ-002 | Features img → Image              | (BROWSER) | Features.tsx:121                                   |
| REQ-003 | backdrop-filter 모바일 제거       | (BROWSER) | Features.module.css, Hero.module.css, 등           |
| REQ-004 | 3D transform 모바일 비활성화      | (BROWSER) | Hero.module.css                                    |
| REQ-005 | Suspense 스트리밍                  | (BROWSER) | page.tsx, Testimonials.tsx, LatestPosts.tsx        |
| REQ-006 | 폰트 최적화                       | (BROWSER) | layout.tsx, globals.css                            |
| REQ-007 | LiveStatus 조건부 비활성화        | (BROWSER) | LiveStatus.tsx                                     |
| REQ-008 | ScrollReveal reduced-motion 분기 | (BROWSER) | ScrollReveal.tsx                                   |

---

## Expected Impact

| 환경 | 최적화 전 | 최적화 후 |
|------|----------|----------|
| iPhone 6s / 3G | FCP 15~18초, 애니메이션 stutter | FCP 4~6초, smooth |
| Galaxy J2 / 2G | FCP 25~30초, 페이지 거의 불가 | FCP 8~12초, 사용 가능 |
| 중사양 / LTE | FCP 3~4초 | FCP 1~2초 |
| LCP (largest contentful paint) | hero-bg 6~8초 | 1.5~2.5초 (WebP) |

---

## Risks & Considerations

| 위험 | 영향 | 완화 방법 |
|------|------|---------|
| WebP 변환 시 화질 저하 | Medium | quality=80 이상으로 확인 |
| Suspense fallback UI 없으면 CLS | Medium | 스켈레톤 높이 = 실제 섹션 높이 |
| backdrop-filter 제거 후 디자인 차이 | Low | 불투명 배경색으로 충분히 보완 |
| self-host 폰트 초기 설정 복잡 | Low | 옵션 B (preconnect)로 시작해도 충분 |
