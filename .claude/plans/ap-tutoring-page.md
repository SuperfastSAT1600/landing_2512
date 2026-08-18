# AP Tutoring Landing Page

## Overview

SAT 튜터링 서비스에서 AP로 사업 확장. 기존 SAT 고객이 자발적으로 AP 문의 중이나 전용 페이지가 없는 상태. AP 수업 신청 폼 제출을 목표로 하는 랜딩 페이지를 추가한다. 기존 코드베이스 패턴(다크 테마, Tailwind + CSS Modules, Supabase, Resend 이메일)을 최대한 재사용하여 MVP를 빠르게 출시한다.

## Requirements

### REQ-001: AP 랜딩 페이지 라우트
- **Priority**: Must
- **Description**: `/ap` 경로에 AP 튜터링 전용 페이지가 렌더링된다
- **Acceptance Criteria**: `/ap` 접속 시 AP 튜터링 페이지가 표시되며, SEO 메타데이터(title, description, OG)가 설정되어 있다
- **Verification**: (BROWSER) `/ap` 페이지가 렌더링되고 메타 태그가 올바른지 확인

### REQ-002: 히어로 섹션 — 설득 헤드라인
- **Priority**: Must
- **Description**: "SAT 다음은 AP — 같은 코치, 같은 방식" 메시지를 전달하는 히어로 영역. SAT 실적에서 AP로의 신뢰 전이를 강조
- **Acceptance Criteria**: 헤드라인, 서브카피, CTA 버튼(신청 폼으로 스크롤)이 보인다
- **Verification**: (BROWSER) 히어로 섹션이 표시되고 CTA 클릭 시 폼 영역으로 스크롤

### REQ-003: AP 중요성 섹션 — 팩트 카드
- **Priority**: Must
- **Description**: AP 점수가 대입에서 왜 중요한지 간결한 수치/팩트 3-4개를 카드 형태로 표시
- **Acceptance Criteria**: 팩트 카드들이 그리드로 표시되며 모바일에서도 읽기 좋게 레이아웃
- **Verification**: (BROWSER) 데스크톱 2열 / 모바일 1열 그리드 확인

### REQ-004: SuperfastSAT 방식 섹션
- **Priority**: Must
- **Description**: SAT에서 검증된 "분석 → 진단 → 관리" 방식이 AP에서도 통하는 이유를 3단계로 설명
- **Acceptance Criteria**: 3개 스텝 카드(분석/진단/관리)가 아이콘과 함께 표시
- **Verification**: (BROWSER) 3개 스텝이 순서대로 표시됨

### REQ-005: 수업 가능 과목 14개 그리드
- **Priority**: Must
- **Description**: 14개 AP 과목을 카드 그리드로 표시. 각 카드에 과목명 + 간단 아이콘/이모지
- **Acceptance Criteria**: 14개 과목이 그리드(데스크톱 4열, 태블릿 3열, 모바일 2열)로 표시
- **Verification**: (BROWSER) 반응형 그리드 확인, 14개 과목 모두 표시

### REQ-006: AP 수업 신청 폼
- **Priority**: Must
- **Description**: 이름/연락처/관심 과목(복수 선택)/현재 학년을 입력하는 신청 폼. 제출 시 Supabase `ap_applications` 테이블에 저장하고, Resend로 관리자에게 이메일 알림 전송
- **Acceptance Criteria**: 폼 제출 시 DB 저장 + 이메일 알림 + 성공 메시지 표시. 필수 필드 미입력 시 클라이언트 검증 에러 표시
- **Verification**: (TEST) API 라우트 유효성 검사 및 DB 저장 로직 단위 테스트

### REQ-007: 헤더 네비게이션에 AP 메뉴 추가
- **Priority**: Must
- **Description**: Header.tsx의 NAV_ITEMS에 'AP수업' 항목 추가
- **Acceptance Criteria**: 헤더에 'AP수업' 메뉴가 표시되고 클릭 시 `/ap`로 이동, active 상태 표시
- **Verification**: (BROWSER) 헤더 메뉴에 AP수업 표시 확인

### REQ-008: Supabase 마이그레이션 — ap_applications 테이블
- **Priority**: Must
- **Description**: AP 수업 신청 데이터를 저장할 `ap_applications` 테이블 생성
- **Acceptance Criteria**: 마이그레이션 실행 후 테이블이 생성되며, 필드: id, name, phone, grade, subjects(text[]), message(optional), status, created_at
- **Verification**: (TEST) 마이그레이션 SQL이 유효한 구문인지 확인 (수동 실행)

### REQ-009: Meta Pixel 이벤트 전송
- **Priority**: Should
- **Description**: AP 신청 폼 제출 시 `fbq('track', 'Lead', { content_name: 'ap_tutoring' })` 이벤트 발송 + 서버사이드 CAPI 이벤트
- **Acceptance Criteria**: 폼 제출 시 클라이언트 fbq + 서버 CAPI 이벤트 전송
- **Verification**: (MANUAL) Meta Events Manager에서 이벤트 확인

### REQ-010: 반응형 디자인 및 다크 테마 일관성
- **Priority**: Must
- **Description**: 기존 사이트와 동일한 다크 테마(--bg-base, --accent-primary 등) 사용, 모바일/태블릿/데스크톱 반응형
- **Acceptance Criteria**: 모든 섹션이 모바일(375px), 태블릿(768px), 데스크톱(1280px)에서 정상 표시
- **Verification**: (BROWSER) Playwright 뷰포트별 스크린샷 확인

### REQ-011: Footer 포함
- **Priority**: Should
- **Description**: AP 페이지 하단에 기존 Footer 컴포넌트 렌더링
- **Acceptance Criteria**: Footer가 페이지 하단에 표시
- **Verification**: (BROWSER) Footer 존재 확인

## Traceability Matrix

| REQ ID  | Description               | Verification | Test/Check Location                          | Status  |
|---------|---------------------------|--------------|----------------------------------------------|---------|
| REQ-001 | AP 페이지 라우트            | (BROWSER)    | `tests/e2e/ap-page.spec.ts`                 | Pending |
| REQ-002 | 히어로 섹션                | (BROWSER)    | `tests/e2e/ap-page.spec.ts`                 | Pending |
| REQ-003 | AP 중요성 팩트 카드        | (BROWSER)    | `tests/e2e/ap-page.spec.ts`                 | Pending |
| REQ-004 | SuperfastSAT 방식 섹션    | (BROWSER)    | `tests/e2e/ap-page.spec.ts`                 | Pending |
| REQ-005 | 과목 14개 그리드           | (BROWSER)    | `tests/e2e/ap-page.spec.ts`                 | Pending |
| REQ-006 | AP 신청 폼 + API          | (TEST)       | `src/app/api/ap/__tests__/apply.test.ts`    | Pending |
| REQ-007 | 헤더 네비게이션            | (BROWSER)    | `tests/e2e/ap-page.spec.ts`                 | Pending |
| REQ-008 | DB 마이그레이션            | (MANUAL)     | `supabase/migrations/008_ap_applications.sql`| Pending |
| REQ-009 | Meta Pixel 이벤트          | (MANUAL)     | Meta Events Manager                          | Pending |
| REQ-010 | 반응형 + 다크 테마         | (BROWSER)    | `tests/e2e/ap-page.spec.ts`                 | Pending |
| REQ-011 | Footer 포함               | (BROWSER)    | `tests/e2e/ap-page.spec.ts`                 | Pending |

## Technical Design

### Architecture

기존 패턴을 최대한 따른다:

- **페이지**: `src/app/ap/page.tsx` — Server Component (메타데이터) + Client Components (인터랙션)
- **컴포넌트**: `src/app/ap/components/` 하위에 섹션별 컴포넌트
- **API**: `src/app/api/ap/apply/route.ts` — `diagnostic_applications` 패턴 복제 (`supabaseAdmin` + `sendEmail` + `sendMetaCAPIEvent`)
- **스타일**: Tailwind 중심, 필요 시 CSS Modules (`ap.module.css`)
- **DB**: `supabase/migrations/008_ap_applications.sql`

### 컴포넌트 구조

```
src/app/ap/
├── page.tsx                    # 메인 페이지 (Server Component, metadata export)
├── ApPageClient.tsx            # 클라이언트 래퍼 (섹션 조합)
├── ap.module.css               # 페이지 전용 스타일
└── components/
    ├── ApHero.tsx              # 히어로 섹션 (REQ-002)
    ├── ApWhyMatters.tsx        # AP 중요성 팩트 카드 (REQ-003)
    ├── ApMethod.tsx            # SuperfastSAT 방식 (REQ-004)
    ├── ApSubjects.tsx          # 14과목 그리드 (REQ-005)
    └── ApApplicationForm.tsx   # 신청 폼 (REQ-006)
```

### API 구조

```
src/app/api/ap/
└── apply/
    └── route.ts               # POST — 폼 제출 처리
```

### 기존 코드 재사용

| 재사용 대상 | 원본 위치 | 용도 |
|------------|----------|------|
| supabaseAdmin | `src/lib/supabase.ts` | DB 저장 |
| sendMetaCAPIEvent | `src/lib/meta-capi.ts` | CAPI 이벤트 |
| Resend 이메일 | `src/lib/email.ts` | 관리자 알림 (새 함수 추가) |
| Footer | `src/app/components/Footer.tsx` | 하단 푸터 |
| Header NAV_ITEMS | `src/app/components/Header.tsx` | 메뉴 항목 추가 |
| FloatingCTA | `src/app/components/FloatingCTA.tsx` | 플로팅 CTA (자동 포함, `/ap`에서 숨기지 않음) |
| 다크 테마 CSS vars | `src/app/globals.css` | 색상 시스템 |

### Dependencies

- 기존 의존성만 사용 (신규 패키지 없음)
- `lucide-react`: 아이콘 (이미 설치됨)
- `Resend`: 이메일 알림 (이미 설치됨)
- Supabase: DB (이미 설정됨)

## Implementation Steps

### Step 1: DB 마이그레이션 — ap_applications 테이블
**Files**: `supabase/migrations/008_ap_applications.sql`
**Dependencies**: 없음
**Description**: AP 수업 신청 데이터 테이블 생성. `diagnostic_applications` 스키마 참고하되, `subjects` (text[]) 컬럼 추가, `preferred_date`/`preferred_time` 대신 `grade`/`message` 사용
**Satisfies**: REQ-008

```sql
CREATE TABLE IF NOT EXISTS ap_applications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  phone       TEXT NOT NULL,
  grade       TEXT NOT NULL,
  subjects    TEXT[] NOT NULL DEFAULT '{}',
  message     TEXT,
  status      TEXT NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending', 'contacted', 'enrolled', 'cancelled')),
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

### Step 2: API 라우트 — POST /api/ap/apply
**Files**: `src/app/api/ap/apply/route.ts`, `src/lib/email.ts` (함수 추가)
**Dependencies**: Step 1 (테이블 존재)
**Description**: `diagnosis/apply` 패턴 복제. 유효성 검사 → Supabase insert → 이메일 알림 → CAPI 이벤트. `email.ts`에 `sendApApplicationNotification()` 함수 추가
**Satisfies**: REQ-006, REQ-009

### Step 3: AP 페이지 컴포넌트 구현
**Files**: `src/app/ap/page.tsx`, `src/app/ap/ApPageClient.tsx`, `src/app/ap/ap.module.css`, `src/app/ap/components/*.tsx`
**Dependencies**: Step 2 (API 존재)
**Description**: 
- `page.tsx`: Server Component, metadata export (title, OG 등)
- `ApPageClient.tsx`: 'use client', 각 섹션 조합
- `ApHero.tsx`: 헤드라인 + CTA 버튼
- `ApWhyMatters.tsx`: 팩트 카드 3-4개
- `ApMethod.tsx`: 분석→진단→관리 3단계
- `ApSubjects.tsx`: 14과목 그리드
- `ApApplicationForm.tsx`: 이름/연락처/학년/관심과목(체크박스)/메시지 폼
**Satisfies**: REQ-001, REQ-002, REQ-003, REQ-004, REQ-005, REQ-006, REQ-010, REQ-011

### Step 4: 헤더 네비게이션 업데이트
**Files**: `src/app/components/Header.tsx`
**Dependencies**: Step 3 (페이지 존재)
**Description**: `NAV_ITEMS` 배열에 `{ href: '/ap', label: 'AP수업' }` 추가. 진단테스트 뒤, SAT인강 앞에 배치
**Satisfies**: REQ-007

### Step 5: 단위 테스트 — API 라우트
**Files**: `src/app/api/ap/__tests__/apply.test.ts`
**Dependencies**: Step 2
**Description**: API 라우트의 유효성 검사(필수 필드 누락, 전화번호 형식), DB insert 호출, 에러 처리를 테스트
**Satisfies**: REQ-006

### Step 6: E2E 테스트 — AP 페이지
**Files**: `tests/e2e/ap-page.spec.ts`
**Dependencies**: Step 3, Step 4
**Description**: 페이지 렌더링, 각 섹션 존재, 과목 그리드 14개, 폼 필드 존재, 헤더 메뉴 확인, 반응형 레이아웃 확인
**Satisfies**: REQ-001~REQ-005, REQ-007, REQ-010, REQ-011

## 14개 AP 과목 데이터

```typescript
const AP_SUBJECTS = [
  { id: 'bio', name: 'Biology', nameKo: '생물학', icon: '🧬' },
  { id: 'calc-ab', name: 'Calculus AB', nameKo: '미적분 AB', icon: '📐' },
  { id: 'calc-bc', name: 'Calculus BC', nameKo: '미적분 BC', icon: '📏' },
  { id: 'chem', name: 'Chemistry', nameKo: '화학', icon: '⚗️' },
  { id: 'comp-gov', name: 'Comparative Gov & Politics', nameKo: '비교정치', icon: '🌍' },
  { id: 'cs-a', name: 'Computer Science A', nameKo: '컴퓨터과학 A', icon: '💻' },
  { id: 'eng-lang', name: 'English Language', nameKo: '영어', icon: '📝' },
  { id: 'macro', name: 'Macroeconomics', nameKo: '거시경제학', icon: '📊' },
  { id: 'micro', name: 'Microeconomics', nameKo: '미시경제학', icon: '📈' },
  { id: 'physics-1', name: 'Physics 1', nameKo: '물리학 1', icon: '⚡' },
  { id: 'precalc', name: 'Precalculus', nameKo: '프리캘큘러스', icon: '🔢' },
  { id: 'psych', name: 'Psychology', nameKo: '심리학', icon: '🧠' },
  { id: 'us-gov', name: 'US Gov & Politics', nameKo: '미국정치', icon: '🏛️' },
  { id: 'us-hist', name: 'US History', nameKo: '미국사', icon: '📜' },
  { id: 'world-hist', name: 'World History', nameKo: '세계사', icon: '🗺️' },
] as const;
```

## Testing Strategy

- **REQ-006** → 단위 테스트: `src/app/api/ap/__tests__/apply.test.ts`
  - 필수 필드 누락 시 400 반환
  - 전화번호 형식 검증
  - 정상 제출 시 201 + DB insert 호출 확인
  - Supabase 에러 시 500 반환
- **REQ-001~005, 007, 010, 011** → E2E: `tests/e2e/ap-page.spec.ts`
  - 페이지 200 응답
  - 각 섹션 존재 (data-testid 기반)
  - 과목 그리드 14개 아이템
  - 폼 필드 렌더링
  - 헤더 메뉴 'AP수업' 존재
  - 모바일 뷰포트 스크린샷
- **REQ-008** → (MANUAL) Supabase Dashboard에서 테이블 확인
- **REQ-009** → (MANUAL) Meta Events Manager 확인

## Risks & Considerations

1. **과목 목록 변경 가능성**: 과목 데이터를 상수 배열로 분리하여 수정 용이하게 함
2. **폼 스팸**: MVP에서는 rate limiting 미적용. 2차 이터레이션에서 honeypot 또는 reCAPTCHA 추가 고려
3. **SEO 초기 부재**: AP 관련 블로그 콘텐츠가 없으므로, AP 페이지 자체가 유일한 랜딩. 페이스북 광고 트래픽이 주 유입 경로
4. **FloatingCTA 동작**: `/ap` 경로에서 FloatingCTA가 표시됨 (SAT 상담 CTA). AP 전용 CTA와 혼동 가능 → MVP에서는 유지, 추후 AP 전용 CTA 분기 고려

## Out of Scope

- AP 과목별 상세 페이지 (개별 과목 랜딩)
- AP 블로그 콘텐츠 / 문제 분석 자료
- AP 진단 테스트 기능
- 어드민 페이지에서 AP 신청 관리 UI (DB에 저장은 하되, 어드민 UI는 2차)
- AP 수강 후기 섹션
- i18n (영어 버전)

## 신규 파일 목록 (총 12개)

```
supabase/migrations/008_ap_applications.sql
src/app/ap/page.tsx
src/app/ap/ApPageClient.tsx
src/app/ap/ap.module.css
src/app/ap/components/ApHero.tsx
src/app/ap/components/ApWhyMatters.tsx
src/app/ap/components/ApMethod.tsx
src/app/ap/components/ApSubjects.tsx
src/app/ap/components/ApApplicationForm.tsx
src/app/api/ap/apply/route.ts
src/app/api/ap/__tests__/apply.test.ts
tests/e2e/ap-page.spec.ts
```

## 수정 파일 목록 (2개)

```
src/app/components/Header.tsx        # NAV_ITEMS에 AP수업 추가
src/lib/email.ts                     # sendApApplicationNotification() 추가
```
