# CONTEXT.md — SuperfastSAT Landing 프로젝트

> 모든 개발 작업 시작 시 가장 먼저 읽는 문서. 새로 파악한 내용이 생기면 즉시 업데이트.

---

## 1. 프로젝트 개요

**SAT 진단 테스트 플랫폼 + 콘텐츠 랜딩 페이지**

- 진단 테스트 → 결과 보고서 → 수업 신청 유도
- 블로그 포스팅(SEO), 코치 개인 페이지, 리뷰
- 관리자 대시보드(포스팅 에디터, 진단 관리, 코치 관리)

---

## 2. 기술 스택

| 항목 | 버전/선택 |
|------|---------|
| Framework | Next.js 16.0.7 (App Router) |
| Language | TypeScript (strict mode) |
| React | 19.2.0 |
| Styling | Tailwind CSS + CSS Modules (일부) |
| DB | Supabase (PostgreSQL + RLS) |
| 에디터 | TipTap (WYSIWYG) |
| 차트 | Recharts |
| 애니메이션 | Framer Motion |
| 이메일 | Resend |
| 분석 | PostHog + Meta Pixel + Meta CAPI |
| AI | OpenAI (SEO 메타 생성), Google Generative AI |
| 아이콘 | Iconify React, Lucide React |
| 마크다운 | Remark, Marked |
| 테스트 | Vitest (단위), Playwright (E2E) |
| 폰트 | Pretendard (한글 최적화) |

**경로 별칭**: `@/*` → `./src/*`

---

## 3. 접근 제어 방식 (Access Control & Gating)

### 블로그 포스트 게이팅 (Gated Posts)
특정 프리미엄 블로그 포스트는 `access_code`(6자리 문자열)를 통해 접근을 엄격히 제어합니다.
- **데이터베이스 (Supabase)**: `posts` 테이블의 `access_code` 필드가 존재하면 게이팅된 포스트로 인식합니다.
- **서버사이드 처리 (`lib/posts.ts`)**: `getPostData` 함수는 포스트가 게이팅된 경우(`access_code` 존재), 본문(`content`)을 완전히 제외하고 메타데이터만 반환합니다. 이로 인해 Next.js의 SSR/SSG HTML 소스코드에 본문 내용이 전혀 노출되지 않아 보안이 유지됩니다.
- **클라이언트 렌더링 (`GateWall.tsx`)**: 클라이언트가 해당 페이지 접근 시 `isGated`가 `true`이면 입력창 UI를 렌더링합니다. 사용자가 코드를 입력하면 `POST /api/posts/[slug]/verify-code` API를 호출하여 서버 측에서 코드를 검증하고 본문 HTML을 반환받습니다.
- **상태 유지**: 코드 검증이 성공하면 해당 코드를 브라우저의 `sessionStorage`(`gated_post_${slug}`)에 저장하여, 새로고침 시에도 세션 동안 본문을 유지합니다.

### 관리자(Admin) 인증
- **로그인 방식**: 비밀번호 + API 키 기반.
- **클라이언트**: 로그인 성공 시 `localStorage`에 인증 토큰 저장. 관리자 페이지(`/admin/*`)는 모두 Client Component(`'use client'`)로 구성되어 있으며 `useAdminAuth()` 훅을 통해 보호됩니다.
- **서버 API (`server-auth.ts`)**: API 라우트에서는 요청 헤더 또는 쿼리 파라미터로 전달된 API 키를 검증하여 인가(Authorization)를 처리합니다.

### 데이터베이스 보안 (Row Level Security - RLS)
- Supabase의 행 수준 보안(RLS)을 사용하여 데이터 접근을 제어합니다.
- 예: `diagnostic_applications` 테이블은 `service_role` 키를 사용하는 서버 런타임에서만 접근 가능하도록 설정하여, 클라이언트에서 직접 쿼리할 수 없게 설계되었습니다.

### 진단 테스트 토큰
- 진단 테스트는 별도 발급된 `diagnostic_access_tokens` 테이블의 `token` 값을 통해 일회성 또는 기간제 접근을 제어합니다. `phone_number` 등과 매핑되며, 만료 기간과 사용 여부가 체크됩니다.

---

## 4. Supabase DB 스키마

### diagnostic_access_tokens
```
id UUID PK
token VARCHAR(255) UNIQUE          -- 접근 토큰
student_email VARCHAR nullable
student_name VARCHAR
test_id VARCHAR(100)               -- 기본값 'diagnostic-test-1'
test_version_id UUID FK → diagnostic_test_versions
expires_at TIMESTAMPTZ
used_at TIMESTAMPTZ
is_active BOOLEAN
phone_number TEXT                  -- Meta CAPI 매칭용
time_limit_minutes INTEGER         -- 기본값 30
slack_notified_at TIMESTAMPTZ      -- 중복 알림 방지
created_at TIMESTAMPTZ
```

### diagnostic_test_results
```
id UUID PK
token_id UUID FK (CASCADE)
student_email VARCHAR nullable
student_name VARCHAR
test_id VARCHAR(100)
test_version_id UUID FK
created_at / started_at / submitted_at TIMESTAMPTZ
total_time_seconds INTEGER
time_limit_minutes INTEGER         -- 토큰 값을 스냅샷
answers JSONB                      -- { questionId: answer }
confidence_levels JSONB            -- { questionId: 1-5 }
flagged_questions TEXT[]
question_times JSONB               -- { questionId: seconds }
saved_words JSONB default '[]'     -- 어휘 추적
edited_insights JSONB nullable     -- 관리자 편집 인사이트
coupon JSONB                       -- { discountPercent, expiresAt }
slack_sent_at / slack_error
UNIQUE(token_id, test_id)
```

### diagnostic_test_versions
```
id UUID PK
version_number INTEGER
title VARCHAR(255)
time_limit_minutes INTEGER
directions TEXT
questions JSONB
is_current BOOLEAN UNIQUE          -- 현재 활성 버전 1개만
created_from UUID FK               -- 버전 계보
created_at TIMESTAMPTZ
```

### diagnostic_applications
```
id UUID PK
name TEXT / phone TEXT
preferred_date DATE / preferred_time TEXT
status TEXT CHECK (pending|contacted|code_issued|cancelled)
notes TEXT / created_at TIMESTAMPTZ
-- RLS: service_role만 접근
```

### posts (블로그)
```
id VARCHAR PK                      -- URL slug가 PK
title TEXT / date DATE / category TEXT
excerpt TEXT / description TEXT
featured_image TEXT                -- 이미지 URL (두 필드 병존 주의)
feature_image TEXT                 -- ← 동일 역할, 레거시 필드
featured_image_alt TEXT
author TEXT / tags TEXT[] / focus_keyword TEXT
cta_featured BOOLEAN
meta_title TEXT / meta_robots TEXT
is_published BOOLEAN default true
access_code VARCHAR(6) nullable    -- 6자리 = 게이트된 포스트
updated_at TIMESTAMPTZ
```

### coaches
```
slug TEXT PK / name TEXT / photo TEXT / bio TEXT
intro_post_slug TEXT               -- 자기소개 포스팅 ID
curriculum_post_slug TEXT          -- 커리큘럼 포스팅 ID
is_active BOOLEAN
```

### site_config
```
id TEXT PK / config JSONB          -- 홈페이지 설정 (단일 행)
```

---

## 5. 주요 파일 경로

### 라우트 구조 (src/app/)
```
/                           app/page.tsx           SSR, revalidate:60
/blog                       app/blog/page.tsx       SSR
/blog/[slug]                app/blog/[slug]/page.tsx  SSG (generateStaticParams)
/coaches/[slug]             app/coaches/[slug]/page.tsx  SSR, revalidate:60
/diagnosis                  app/diagnosis/page.tsx  CSR ('use client')
/reports/[resultId]         app/reports/[resultId]/page.tsx  SSR
/reviews                    app/reviews/page.tsx    CSR ('use client')
/dashboard                  app/dashboard/page.tsx  CSR (온톨로지 익스플로러)
/admin/*                    app/admin/             모두 CSR + 인증
```

### 핵심 라이브러리 (src/lib/)
```
supabase.ts          Supabase 클라이언트/서버 인스턴스
posts.ts             블로그 포스트 쿼리 (unstable_cache)
coaches-data.ts      코치 프로필 쿼리
config.ts            홈페이지 설정 (site_config 테이블)
report-data.ts       보고서 데이터 페칭 (직접 DB 쿼리, API 경유 X)
report-insights.ts   규칙 기반 인사이트 생성
report-benchmarks.ts 상위 10% 벤치마크
ontology.ts          SAT 온톨로지 JSONL 메모리 캐싱
email.ts             Resend 이메일 발송
slack.ts             Slack Bot + Webhook 알림
meta-capi.ts         Meta CAPI (SHA256 해싱)
server-auth.ts       서버 인증 헬퍼
```

### 전역 컴포넌트 (src/app/components/)
```
Header.tsx / Header.module.css    전역 헤더 (랜딩 페이지용)
Hero.tsx                          히어로 섹션
FeaturesSection.tsx               기능 섹션 (Suspense 스트리밍)
Testimonials.tsx                  후기
LatestPosts.tsx                   최신 포스팅
Curriculum.tsx / Features.tsx
ConsultModal.tsx / FloatingCTA.tsx
Footer.tsx
LiveStatus.tsx                    실시간 상태
ScrollReveal.tsx                  스크롤 애니메이션
SidebarLayout.tsx / Sidebar.tsx
```

### 코치 페이지 (src/app/coaches/[slug]/)
```
page.tsx              서버 컴포넌트, SSR, generateMetadata
CoachPageClient.tsx   클라이언트 컴포넌트 (탭 UI, 독립 헤더)
```
⚠️ 코치 페이지는 전역 Header 대신 독립 인라인 헤더 사용

### API 라우트 (src/app/api/)
```
diagnosis/submit/route.ts          POST, 멱등성, 30일 중복 방지
diagnosis/validate-token/route.ts  GET, 토큰 검증
diagnosis/apply/route.ts           POST, 신청서 제출
admin/auth/route.ts                POST, 비밀번호 인증
admin/posts/route.ts               GET/POST, 블로그 CRUD
admin/coaches/route.ts             코치 관리
admin/generate-seo/route.ts        POST, OpenAI 메타 생성
admin/diagnosis/tokens/route.ts    GET/POST, 토큰 관리
admin/diagnosis/results/route.ts   GET, 결과 조회
ontology/route.ts                  GET, SAT 온톨로지 검색
posts/[slug]/verify-code/route.ts  POST, 게이트 코드 인증
```

---

## 6. 렌더링 방식

| 방식 | 적용 범위 | 특이사항 |
|------|----------|---------|
| SSG | `/blog/[slug]` | `generateStaticParams` 빌드 시 생성 |
| SSR | 홈, 블로그목록, 코치, 보고서 | `revalidate: 60` 또는 on-demand |
| CSR | 진단 테스트, 리뷰, 대시보드, 어드민 전체 | `'use client'` |
| Suspense | 홈페이지 기능 섹션 | 스트리밍으로 지연 로드 |
| `unstable_cache` | `lib/posts.ts` | 60초 캐시 |

---

## 7. 컴포넌트 패턴

### 서버/클라이언트 분리
```
page.tsx (서버) → XxxClient.tsx ('use client')
예: coaches/[slug]/page.tsx → CoachPageClient.tsx
예: blog/[slug]/page.tsx → PostContent.tsx
```

### 데이터 페칭
- 서버 컴포넌트에서 직접 `lib/` 함수 호출 (API route 경유 X)
- 보고서: `fetchReportData()` 직접 사용 (API route 아님)
- 클라이언트에서 필요한 경우 `fetch('/api/...')` 호출

### 스타일링 우선순위
1. Tailwind utility classes (기본)
2. CSS Modules (`Header.module.css` 등, 복잡한 반응형에만 제한적 사용)
3. 인라인 style (동적 값만)

### 이미지
- `next/image` 사용 (항상 `alt` 속성 포함)
- `unoptimized` prop: 외부 URL이거나 Supabase CDN 이미지
- 원격 패턴: Supabase CDN + 모든 HTTPS 허용 (`next.config.ts`에 정의)

---

## 8. 환경 변수 목록

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY

# 관리자
ADMIN_PASSWORD
ADMIN_SECRET_KEY

# 진단 테스트
NEXT_PUBLIC_DIAGNOSIS_CODE      # 테스트 접근 코드

# 사이트
NEXT_PUBLIC_SITE_URL

# 분석
NEXT_PUBLIC_POSTHOG_KEY
NEXT_PUBLIC_POSTHOG_HOST

# AI
OPENAI_API_KEY

# Slack
SLACK_BOT_TOKEN
SLACK_DIAGNOSIS_CHANNEL_ID
SLACK_APPLICATION_WEBHOOK_URL

# Meta
META_PIXEL_ID
META_CAPI_ACCESS_TOKEN
```

---

## 9. 주요 아키텍처 결정 & 주의사항

- **posts 테이블 id = slug**: PK가 URL slug. `'my-post'` 같은 문자열.
- **featured_image vs feature_image**: 두 필드 모두 존재 (레거시 지원). 코드에서 둘 다 확인.
- **진단 멱등성**: 동일 토큰+학생의 제출은 30일 내 중복 허용 안 함.
- **온톨로지**: `blog_database/master_sat_ontology_v3.jsonl` → `lib/ontology.ts`가 메모리 캐싱하여 사용.
- **보고서 인사이트**: AI 생성(규칙 기반) → 관리자 편집 → `merge-insights.ts`로 병합.
- **코치 헤더**: 전역 `Header.tsx`가 아닌 `CoachPageClient.tsx` 내 독립 헤더 사용.
- **어드민 전체 CSR**: 어드민은 모든 페이지가 `'use client'` + `useAdminAuth()` 훅 사용.
- **테스트 버전 관리**: 문제 변경 시 새 버전 레코드 생성. `is_current = true` 는 1개만 활성화.
- **게이트 포스트 보안**: 게이트된 포스트는 SSR 단계에서 본문을 절대 포함시키지 않고, `/api/posts/[slug]/verify-code` API를 통해서만 본문 제공.

---

## 10. 주요 개발 명령어

```bash
npm run dev          # 개발 서버 (localhost:3000)
npm run build        # 프로덕션 빌드
npm run typecheck    # TypeScript 타입 체크
npm run test         # Vitest 단위 테스트
npm run test:e2e     # Playwright E2E
npm run check        # 린트 + 포맷 검사
npm run fix          # 린트 + 포맷 자동 수정
```

---

*최종 업데이트: 2026-05-01*
