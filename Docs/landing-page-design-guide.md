# SuperfastSAT 랜딩 페이지 디자인 가이드

글로벌 페이지 제작 시 이 가이드를 참조한다. 랜딩 페이지(tutoring.superfastsat.com)에 실제 적용된 값과 패턴을 기준으로 작성했다.

---

## 1. 색상 시스템

### CSS 변수 (globals.css :root)

```css
/* 배경 */
--bg-base: #000000;               /* 페이지 최상위 배경 (순수 검정) */
--bg-surface: #09090b;            /* 카드·섹션 배경 (다크 징크) */
--bg-clay: rgba(25, 30, 45, 0.6); /* 반투명 네이비 — Clay UI 카드 */

/* 텍스트 */
--text-primary: #FFFFFF;
--text-secondary: #D1D5DB;        /* 보조 텍스트, 설명 문구 */
--text-inverse: #0B1F3B;          /* 밝은 버튼 위 텍스트 (네이비) */

/* 강조색 */
--accent-primary: #071be9;        /* 주요 버튼, CTA (비비드 블루) */
--accent-glow: #6085FF;           /* 아이콘, 텍스트 하이라이트, glow 효과 */
--accent-secondary: #00A6A6;      /* 보조 강조 (Teal, 레거시) */

/* 경계선 */
--border-clay: rgba(255, 255, 255, 0.08);

/* 그레이 스케일 */
--gray-100: #1a1a1a;
--gray-200: #333;
--gray-800: var(--text-secondary);
```

### 자주 쓰는 인라인 RGBA 값

| 용도 | 값 |
|------|----|
| 카드 배경 (흐림 효과) | `rgba(30, 41, 59, 0.4)` |
| 구분선 | `rgba(255, 255, 255, 0.06 ~ 0.1)` |
| 호버 테두리 glow | `rgba(96, 133, 255, 0.5)` |
| 반투명 버튼 배경 | `rgba(255, 255, 255, 0.05)` |
| 반투명 버튼 테두리 | `rgba(255, 255, 255, 0.2)` |
| 별점 (금색) | `#FFD700` |
| KakaoTalk 버튼 | `#FEE500` |
| 오류 | `#ef4444` |

### 다크 모드 강제 적용

시스템 설정과 무관하게 항상 다크 테마를 유지한다. `globals.css`에서 이미 처리되어 있으므로 새 페이지에서 별도 작업 불필요.

```css
@media (prefers-color-scheme: light) {
  :root {
    --background: var(--bg-base);
    --foreground: var(--text-primary);
  }
}
```

---

## 2. 타이포그래피

### 폰트 패밀리

```css
--font-sans: "Pretendard Variable", Pretendard, -apple-system, BlinkMacSystemFont,
  system-ui, Roboto, "Helvetica Neue", "Segoe UI", "Apple SD Gothic Neo",
  "Noto Sans KR", "Malgun Gothic", sans-serif;
```

- **주 폰트**: Pretendard (한국어 최적화 산세리프)
- **악센트 폰트**: Racing Sans One — Hero 하이라이트 텍스트 전용 (weight 400)
- CDN: `https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css`

### 폰트 렌더링

```css
body {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  line-height: 1.6;
}
```

### 타이포그래피 스케일

| 요소 | 크기 | weight | line-height | 비고 |
|------|------|--------|------------|------|
| Hero 제목 | `clamp(2.5rem, 8vw, 5rem)` | 800 | 1.1 | 중앙 정렬, 반응형 |
| 섹션 제목 | `2.5rem` | 800 | — | Testimonials, Hero 등 |
| 소섹션 제목 | `2rem` | 800 | — | LatestPosts 등 |
| 카드 제목 | `1.65rem` | 800 | 1.35 | Features 카드 |
| 리뷰 제목 | `1.35rem` | 700 | 1.4 | Testimonials 카드 |
| 부제목/설명 | `1.25rem` | 400 | 1.6 | 섹션 설명 |
| 본문 | `clamp(1rem, 2.5vw, 1.35rem)` | 400 | 1.6 | Hero 설명 등 |
| 포스트 제목 | `1.1rem` | 700 | 1.45 | 최신 포스트 목록 |
| 배지/레이블 | `0.75rem` | 600~700 | — | 대문자, `letter-spacing: 0.05em` |
| 카드 설명 | `0.92rem` | 400 | 1.55 | Features 카드 |
| 메타/푸터 | `0.75rem ~ 0.85rem` | 500~600 | — | 날짜, 작성자 정보 |

### 한국어 텍스트 규칙

```css
word-break: keep-all;               /* 단어 중간 줄바꿈 방지 */
letter-spacing: -0.02em ~ -0.03em; /* 헤드라인 자간 좁힘 */
```

---

## 3. 간격 & 레이아웃

### 섹션 패딩

```css
/* 데스크톱 */
padding: 8rem 2rem;

/* 모바일 */
padding: 5rem 1.25rem;
```

### 컨테이너 최대 너비

| 섹션 | max-width |
|------|-----------|
| Hero, Features | `1200px ~ 1400px` |
| Testimonials | `1200px` |
| LatestPosts | `900px` |
| 페이지 가로 여백 | `0 5%` (padding) |

### 그리드 패턴

```css
/* 3컬럼 (데스크톱) */
grid-template-columns: repeat(3, 1fr);
gap: 2rem;

/* 모바일 → 1컬럼 */
grid-template-columns: 1fr;
gap: 1rem;
```

### 반응형 브레이크포인트

| 구간 | 쿼리 | 주요 변경 |
|------|------|----------|
| 데스크톱 | ≥ 1024px | 3컬럼 그리드, backdrop-filter, 3D 트랜스폼 |
| 태블릿 | 768px ~ 1023px | 2컬럼 → 1컬럼, 효과 단순화 |
| 모바일 | ≤ 767px | 1컬럼, 가로 스크롤 캐러셀, 불투명 배경 |
| 소형 모바일 | ≤ 480px | 패딩·폰트 추가 축소 |

---

## 4. 테두리 반경

| 토큰 | 값 | 사용처 |
|------|----|--------|
| `--radius-soft` | `2rem` (32px) | 주요 섹션, 대형 카드 |
| `--radius-medium` | `1.5rem` (24px) | Hero 카드, 보조 요소 |
| 일반 카드 | `20px` | Features·Testimonials 카드 |
| 소형 요소 | `12px ~ 14px` | 입력 필드, 소형 버튼, 배지 |
| 아이콘 컨테이너 | `10px` | 아이콘 박스 |
| 버튼/Pill | `9999px` | 모든 CTA 버튼, 배지 |

---

## 5. 그림자 시스템

### CSS 변수

```css
--shadow-clay-card:
  20px 20px 40px rgba(0, 0, 0, 0.4),
  inset 0 0 0 1px rgba(255, 255, 255, 0.05),
  inset 0 1px 0 rgba(255, 255, 255, 0.1);

--shadow-clay-float:
  30px 30px 60px rgba(0, 0, 0, 0.5),
  inset 0 0 0 1px rgba(255, 255, 255, 0.1);
```

### 상황별 그림자

| 상황 | 값 |
|------|----|
| 카드 기본 | `0 2px 8px rgba(0,0,0,0.1)` |
| 카드 호버 | `0 24px 56px rgba(0,0,0,0.5)` |
| 버튼 glow | `0 4px 12px rgba(7,27,233,0.3)` |
| Floating CTA | `0 4px 20px rgba(255,255,255,0.3)` |

---

## 6. 컴포넌트 패턴

### 카드 (기본)

```css
background: rgba(30, 41, 59, 0.4);
backdrop-filter: blur(12px);
border: 1px solid rgba(255, 255, 255, 0.08);
border-radius: 20px;
padding: 2rem;

/* 호버 */
transform: translateY(-10px) scale(1.02);
border-color: rgba(96, 133, 255, 0.5);
transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
```

### 버튼 — Glassmorphism (투명 계열)

```css
background: rgba(255, 255, 255, 0.05);
backdrop-filter: blur(10px);
border: 1px solid rgba(255, 255, 255, 0.2);
border-radius: 9999px;
padding: 14px 28px;
color: #fff;

/* 호버 */
transform: translateY(-2px);
background: rgba(255, 255, 255, 0.1);
```

### 버튼 — Solid Primary (파란색)

```css
background: var(--accent-primary);  /* #071be9 */
color: #fff;
border-radius: 9999px;
padding: 14px 28px;
box-shadow: 0 4px 12px rgba(7, 27, 233, 0.3);

/* 호버 */
transform: translateY(-2px);
box-shadow: 0 8px 20px rgba(7, 27, 233, 0.4);
```

### 카테고리 배지

```css
background: #fff;
color: var(--accent-primary);
border-radius: 9999px;
padding: 4px 12px;
font-size: 0.75rem;
font-weight: 700;
text-transform: uppercase;
letter-spacing: 0.05em;
box-shadow: 0 2px 8px rgba(0,0,0,0.15);
```

### 입력 필드 (Toss 스타일)

```css
background: #F4F5F9;
border: 1.5px solid transparent;
border-radius: 12px;
padding: 14px 16px;
font-family: var(--font-sans);

/* 포커스 */
border-color: #3182F6;
background: #fff;
transition: border-color 0.2s ease, background-color 0.2s ease;
```

### 헤더 (Fixed)

```css
position: fixed;
z-index: 1000;
min-height: 56px;

/* 데스크톱 */
background: rgba(5, 8, 22, 0.85);
backdrop-filter: blur(20px);

/* 모바일 — backdrop-filter 제거 (GPU 성능) */
@media (max-width: 768px) {
  background: rgba(5, 8, 22, 0.97);
  backdrop-filter: none;
}
```

### 구분선

```css
border-bottom: 1px solid rgba(255, 255, 255, 0.06);
/* 또는 약간 더 강조 */
border: 1px solid rgba(255, 255, 255, 0.1);
```

---

## 7. 애니메이션 & 트랜지션

### 기본 트랜지션

```css
/* 표준 */
transition: all 0.3s ease;
transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

/* 빠른 호버 */
transition: all 0.15s ease;

/* 부드러운 슬라이드 (이미지 등) */
transition: all 0.6s cubic-bezier(0.25, 1, 0.5, 1);
```

### 호버 트랜스폼

```css
/* 카드 리프트 */
transform: translateY(-8px);               /* Features 카드 */
transform: translateY(-10px) scale(1.02);  /* Testimonials 카드 */

/* 버튼 리프트 */
transform: translateY(-2px);

/* 이미지 줌 */
transform: scale(1.06);

/* 버튼 누름 효과 */
transform: scale(0.96);
```

### 주요 키프레임

| 이름 | 시간 | 용도 |
|------|------|------|
| `slideUp` | `0.5s cubic-bezier(0.16,1,0.3,1)` | Floating CTA 진입 |
| `warpIn` | `0.55s cubic-bezier(0.4,0,0,1)` | Features 카드 전환 |
| `fadeAway` | `0.4s` | Features 형제 카드 페이드 |
| `floatBar` | `3s ease-in-out infinite alternate` | Hero 바 차트 |
| `pulseGlow` | `2s ease-in-out infinite` | CTA 버튼 glow |
| `bounce` | `2s infinite` | Floating CTA 버블 |
| `fadeInDown` | `0.4s ease` | 공지 버튼 |

### 모바일 성능 최적화

```css
@media (max-width: 768px) {
  /* backdrop-filter 제거 → 불투명 배경으로 대체 */
  /* 3D 트랜스폼 제거 */
  /* 무한 반복 애니메이션 중단 */
  /* will-change 최소화 */
}

/* 접근성 */
@media (prefers-reduced-motion: reduce) {
  * {
    animation: none !important;
    transition: none !important;
  }
}
```

---

## 8. Z-index 스택

| 요소 | z-index |
|------|---------|
| 헤더 | 1000 |
| Floating CTA | 100 |
| 모달·오버레이 | 20 ~ 50 |
| 카드 콘텐츠 | 1 ~ 10 |

---

## 9. 글로벌 페이지 제작 체크리스트

새 페이지를 만들 때 반드시 확인할 항목:

- [ ] `font-family: var(--font-sans)` 적용
- [ ] `background: var(--background)` (순수 검정) 기본값
- [ ] `color: var(--text-primary)` 기본 텍스트
- [ ] `word-break: keep-all` 한국어 텍스트에 적용
- [ ] 섹션 수직 패딩 `8rem` (데스크톱), `5rem` (모바일)
- [ ] 카드 테두리 `1px solid rgba(255,255,255,0.08)`
- [ ] 버튼 border-radius `9999px`
- [ ] 모바일에서 `backdrop-filter` 제거, 불투명 배경으로 대체
- [ ] 터치 타겟 최소 `44px` 높이
- [ ] `prefers-reduced-motion` 대응
- [ ] Z-index: 헤더 1000 기준으로 스택 설계

---

## 10. 핵심 파일 참조

| 용도 | 파일 |
|------|------|
| CSS 변수·전역 스타일 | `src/app/globals.css` |
| Tailwind 설정 | `tailwind.config.ts` |
| Hero 섹션 | `src/app/components/Hero.tsx` + `Hero.module.css` |
| Features 캐러셀 | `src/app/components/Features.tsx` + `Features.module.css` |
| Testimonials | `src/app/components/Testimonials.tsx` + `Testimonials.module.css` |
| 최신 포스트 | `src/app/components/LatestPosts.tsx` + `LatestPosts.module.css` |
| Floating CTA | `src/app/components/FloatingCTA.tsx` + `FloatingCTA.module.css` |
| 헤더 | `src/app/components/Header.tsx` + `Header.module.css` |
| 푸터 | `src/app/components/Footer.tsx` + `Footer.module.css` |
