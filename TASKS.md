# Tasks

> Last audited: 2026-03-03 — 55 issues found across 8 categories.

---

## 🎨 Design & UI

- [ ] Remove `@media (prefers-color-scheme: light)` override in `globals.css` that forces dark theme on all users — add a toggle or honour system preference
- [ ] Add hover styles to "Privacy Policy" and "Terms of Service" links in `Footer.tsx` (currently `href="#"`, no visual feedback)
- [ ] Add Suspense skeleton/fallback for `LatestPosts.tsx` async component to prevent layout shift (CLS)
- [ ] Fix inconsistent scroll carousel gap in `Features.tsx` (line 59) — add mobile-specific adjustment for small screens
- [ ] Remove duplicate image alignment CSS in `globals.css` (lines 89-102) — defined 3× for `.prose img`, `.ProseMirror img`, and `[data-align]`
- [ ] Add `will-change: transform` optimization hints to Framer Motion animations in `Hero.tsx` for GPU efficiency

---

## 📝 Content

- [ ] Fix canonical domain inconsistency — `satmasterclass.com` used in `robots.ts`, `sitemap.ts`, and blog pages while layout says "SuperfastSAT" and footer says "Argonaut AI Inc." — pick one domain
- [ ] Replace placeholder config in `src/lib/config.ts` (line 31): `{ postSlug: "score-perfect-800", title: "Example Feature", description: "Description here" }` — this renders on the live page if DB is unconfigured
- [ ] Add real social media URLs to `sameAs: []` in LD+JSON structured data (`src/app/layout.tsx` lines 84-86) or remove the empty field
- [ ] Fix empty alt text on dynamic feature images in `Features.tsx` (line 122): `alt=""` → `alt={feature.title}`
- [ ] Create Privacy Policy page (currently linked as `href="#"` in Footer and Sidebar)
- [ ] Create Terms of Service page (currently linked as `href="#"` in Footer and Sidebar)

---

## ⚡ Features

- [ ] Implement diagnosis access code validation backend (`src/app/diagnosis/page.tsx` line 59: `// TODO: 접속코드 검증 로직`) — form accepts 6-digit code but does no backend validation
- [ ] Build or remove the Analytics section in admin panel (`src/app/admin/page.tsx` lines 157-158) — currently disabled with `cursor-not-allowed`
- [ ] Audit `Sidebar.tsx` — component exists but unclear if used anywhere; remove if dead code
- [ ] Review and complete the write-review form at `src/app/reviews/write/page.tsx` — verify validation and submission
- [ ] Replace external link to `https://www.superfastsat.com` in `Header.tsx` (line 16) with internal content or document the intent

---

## 🐛 Bug Fixes

- [ ] Remove/replace all `console.error()` calls in production code: `admin/editor/page.tsx` (×3), `admin/home/page.tsx`, `admin/page.tsx`, `admin/reviews/page.tsx`, `api/admin/upload/route.ts` (×2), `lib/server-auth.ts` — use a proper logger instead
- [ ] Fix `any` types in `admin/reviews/page.tsx` (lines 41, 48): `updateReview(id, updates: any)` — add proper TypeScript types
- [ ] Investigate potential race condition in `admin/editor/page.tsx` (lines 172-180) — both `pendingContent` state and `pendingContentRef` used simultaneously, content may not load correctly on rapid editor transitions
- [ ] Fix silent error swallow in `FloatingCTA.tsx` (lines 29-32): `.catch(() => {})` ignores API failures without setting error state
- [ ] Verify `.env.local` is in `.gitignore` — file contains plaintext credentials (`ADMIN_SECRET_KEY`, `ADMIN_PASSWORD`, Supabase keys)

---

## 🚀 Performance

- [ ] Compress `public/hero-background.png` (589 KB, 77% of all static assets) — convert to WebP and add blur placeholder
- [ ] Lazy-load Lottie JSON animations: `public/unicorn-hero.json` (56 KB) and `public/unicorn-features.json` (34 KB) loaded upfront
- [ ] Replace `<img>` tags with Next.js `<Image>` component everywhere: `Features.tsx` (line 122), `LatestPosts.tsx` (line 27), `blog/[slug]/page.tsx` (line 138) — enables AVIF/WebP and responsive sizes automatically
- [ ] Remove unused static assets: `public/next.svg`, `public/vercel.svg` (default Next.js files never referenced)
- [ ] Set up image CDN or cleanup script for `public/uploads/` (78 MB accumulated)
- [ ] Wire up bundle analyzer — `package.json` `"analyze"` script is currently just `echo "Add bundle analyzer command here"`
- [ ] Add `preconnect` link for Google Fonts in `layout.tsx` (display: swap is good but preconnect is missing)
- [ ] Add Cache-Control headers for static assets in `next.config.ts`
- [ ] Add `export const revalidate = 3600` to `src/app/sitemap.ts` so sitemap updates when posts change

---

## 🔍 SEO & Analytics

- [ ] Resolve canonical domain mismatch — all BASE_URL references must point to one single production domain
- [ ] Add dynamic OG image generation for non-blog pages (currently only blog posts use `/api/og`; other pages use a static `public/og-image.png` 46 KB)
- [ ] Add OG image metadata to blog index page `src/app/blog/page.tsx` — currently missing, link previews won't render
- [ ] Move Meta Pixel ID to environment variable (currently hardcoded in `src/app/layout.tsx` lines 43-56)
- [ ] Add Google Analytics 4 — no GA implementation found anywhere
- [ ] Fill in `sameAs` social URLs in LD+JSON schema or remove the empty array — search engines can't associate the site with social profiles
- [ ] Add hreflang tags if multi-language support is planned (site is currently Korean-only)
- [ ] Verify `/admin/` and `/api/` routes are disallowed in `robots.ts` (currently is — keep this)

---

## 🧪 Testing

- [ ] Add unit tests for all API routes: `/api/admin/upload`, `/api/admin/config`, `/api/reviews`, `/api/og`
- [ ] Add unit tests for `src/lib/` utilities: `posts.ts`, `server-auth.ts`, `config.ts`
- [ ] Add component tests for `Header`, `Footer`, `Hero`, `Features`, `FloatingCTA`
- [ ] Add error scenario tests to `src/lib/__tests__/posts.test.ts` — currently only happy path tested
- [ ] Add integration tests between admin editor and Supabase
- [ ] Add E2E test for diagnosis page access code flow (once backend validation is implemented)
- [ ] Increase overall test coverage from ~20% to 80%+ (only 2 test files exist for 52 source files)

---

## 🛠️ DevOps

- [ ] Create `.env.example` with masked placeholders for all required variables (`ADMIN_SECRET_KEY`, `ADMIN_PASSWORD`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`)
- [ ] Confirm `.env.local` is in `.gitignore` and audit git history for committed secrets
- [ ] Create GitHub Actions workflow: lint + type-check + tests on every PR
- [ ] Create GitHub Actions workflow: build verification on push to main
- [ ] Add security headers to `next.config.ts` (`X-Frame-Options`, `Content-Security-Policy`, `X-Content-Type-Options`)
- [ ] Add image optimization settings to `next.config.ts` (allowed domains, formats: `['avif', 'webp']`)
- [ ] Set up Husky + lint-staged for pre-commit lint and format checks
- [ ] Remove or document Prisma dependency — `package.json` has prisma scripts but the project uses Supabase directly with no Prisma schema found
- [ ] Create `vercel.json` if deploying to Vercel (no deployment config exists)
- [ ] Add Dockerfile and `docker-compose.yml` if containerized deployment is needed
