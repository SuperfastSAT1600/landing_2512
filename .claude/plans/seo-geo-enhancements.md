# SEO & GEO Enhancements

## Overview

Google SEO 및 GEO(Generative Engine Optimization)에 적합한 사이트 구축을 위한 12개 항목 구현.
도메인 불일치 수정부터 구조화 데이터, llms.txt, 스피커블 스키마까지 단계적으로 적용.

## Requirements

### REQ-001: BASE_URL 도메인 불일치 수정
- **Priority**: Must
- **Description**: `satmasterclass.com` 하드코딩을 env var로 교체
- **Acceptance Criteria**: `NEXT_PUBLIC_SITE_URL` 환경변수 사용, fallback `https://tutoring.superfastsat.com`
- **Verification**: (MANUAL) canonical URL이 올바른 도메인을 가리키는지 확인

### REQ-002: EducationalOrganization sameAs 소셜 링크
- **Priority**: Must
- **Description**: layout.tsx의 `sameAs: []`에 소셜/채널 링크 추가
- **Acceptance Criteria**: JSON-LD에 sameAs 배열이 실제 URL 포함
- **Verification**: (BROWSER) Google Rich Results Test에서 Organization schema 확인

### REQ-003: BlogPosting 저자 Person 스키마 강화
- **Priority**: Must
- **Description**: author 필드에 Person 스키마(url, image) 추가
- **Acceptance Criteria**: BlogPosting JSON-LD의 author가 `@type: Person` + url 포함
- **Verification**: (MANUAL) 블로그 포스트 페이지 소스 확인

### REQ-004: BreadcrumbList 스키마 (블로그 포스트)
- **Priority**: Must
- **Description**: 블로그 포스트 페이지에 BreadcrumbList JSON-LD 추가
- **Acceptance Criteria**: Home > Blog > [Post Title] 브레드크럼 구조화 데이터
- **Verification**: (BROWSER) Google Rich Results Test

### REQ-005: FAQ 스키마 (홈페이지)
- **Priority**: Should
- **Description**: 홈페이지에 FAQPage JSON-LD + 시각적 FAQ 섹션 추가
- **Acceptance Criteria**: Google AI Overviews에서 FAQ가 노출될 수 있도록 구조화 데이터 포함
- **Verification**: (MANUAL) 홈페이지 소스에 FAQPage schema 확인

### REQ-006: llms.txt 생성
- **Priority**: Must
- **Description**: AI 크롤러를 위한 /llms.txt 파일 생성
- **Acceptance Criteria**: 사이트 구조, 주요 컨텐츠, 저작권 정보 포함
- **Verification**: (MANUAL) /llms.txt URL 접근 확인

### REQ-007: speakable 스키마
- **Priority**: Should
- **Description**: 블로그 포스트에 speakable CSS selectors 추가
- **Acceptance Criteria**: BlogPosting JSON-LD에 speakable 속성 포함
- **Verification**: (MANUAL) 소스 코드 확인

### REQ-008: Course/EducationalOccupationalProgram 스키마
- **Priority**: Should
- **Description**: 홈페이지 또는 별도 페이지에 Course 스키마 추가
- **Acceptance Criteria**: SAT 강의 JSON-LD schema 존재
- **Verification**: (MANUAL) 소스 코드 확인

### REQ-009: 홈페이지 generateMetadata 강화
- **Priority**: Must
- **Description**: 정적 metadata를 generateMetadata + canonical + OG 강화
- **Acceptance Criteria**: canonical URL, OG image URL이 올바른 도메인 사용
- **Verification**: (MANUAL) 페이지 소스 확인

### REQ-010: 블로그 카테고리 랜딩 페이지 메타데이터
- **Priority**: Should
- **Description**: /blog?category=X URL에 동적 canonical + OG 메타데이터 적용
- **Acceptance Criteria**: 카테고리별 고유 canonical URL과 설명
- **Verification**: (MANUAL) 소스 확인

### REQ-011: AggregateRating 스키마 준비
- **Priority**: Could
- **Description**: layout.tsx EducationalOrganization에 AggregateRating 추가 (샘플 데이터)
- **Acceptance Criteria**: JSON-LD에 ratingValue, reviewCount 포함
- **Verification**: (MANUAL) 소스 확인

### REQ-012: 내부 링킹 강화 (관련 포스트 anchor text)
- **Priority**: Could
- **Description**: 관련 포스트 섹션에 더 의미있는 anchor text 확인
- **Acceptance Criteria**: 관련 포스트 링크에 post title이 anchor text로 사용됨 (이미 구현됨)
- **Verification**: (MANUAL) 확인

## Technical Design

### Architecture
- `src/app/layout.tsx` — EducationalOrganization schema, sameAs, AggregateRating
- `src/app/blog/[slug]/page.tsx` — BlogPosting, BreadcrumbList, speakable, Person author
- `src/app/blog/page.tsx` — generateMetadata로 전환, canonical 수정
- `src/app/page.tsx` — generateMetadata, FAQ schema, Course schema
- `src/app/llms.txt/route.ts` — llms.txt dynamic route

### Dependencies
- No new npm packages needed
- `NEXT_PUBLIC_SITE_URL` env var needed

## Traceability Matrix

| REQ ID  | Description                     | Verification | Status  |
|---------|---------------------------------|--------------|---------|
| REQ-001 | BASE_URL 도메인 수정            | (MANUAL)     | Pending |
| REQ-002 | sameAs 소셜 링크                | (BROWSER)    | Pending |
| REQ-003 | Person 저자 스키마              | (MANUAL)     | Pending |
| REQ-004 | BreadcrumbList 스키마           | (BROWSER)    | Pending |
| REQ-005 | FAQ 스키마                      | (MANUAL)     | Pending |
| REQ-006 | llms.txt                        | (MANUAL)     | Pending |
| REQ-007 | speakable 스키마                | (MANUAL)     | Pending |
| REQ-008 | Course 스키마                   | (MANUAL)     | Pending |
| REQ-009 | 홈페이지 generateMetadata       | (MANUAL)     | Pending |
| REQ-010 | 카테고리 페이지 메타데이터      | (MANUAL)     | Pending |
| REQ-011 | AggregateRating 스키마          | (MANUAL)     | Pending |
| REQ-012 | 내부 링킹 확인                  | (MANUAL)     | Pending |

## Implementation Order

1. REQ-001 — 도메인 통일 (모든 URL의 기반)
2. REQ-009 — 홈페이지 메타데이터 (canonical 필요)
3. REQ-002 — sameAs (layout.tsx)
4. REQ-011 — AggregateRating (layout.tsx, REQ-002와 함께)
5. REQ-003 — Person 저자 스키마 (블로그)
6. REQ-004 — BreadcrumbList (블로그)
7. REQ-007 — speakable (블로그, REQ-003/004와 함께)
8. REQ-010 — 카테고리 메타데이터
9. REQ-005 — FAQ 스키마 (홈페이지)
10. REQ-008 — Course 스키마 (홈페이지)
11. REQ-006 — llms.txt
12. REQ-012 — 내부 링킹 확인 (이미 구현됨)

## Out of Scope

- 실제 리뷰 데이터 수집 시스템
- 저자 전용 페이지 (/authors/[name])
- 블로그 카테고리 전용 URL (/blog/category/[name])
