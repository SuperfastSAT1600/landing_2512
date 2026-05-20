# Naver Blog Click Tracking

## Overview

네이버 블로그 포스팅 하단 링크 클릭을 추적하여 admin 페이지에서 포스팅별 유입 통계를 확인할 수 있도록 한다. 모든 포스팅에 동일한 URL(`/api/naver-redirect`)을 사용하고, 서버에서 Referer 헤더로 어느 포스팅에서 왔는지 자동 구분한다.

## Requirements

### REQ-001: Supabase 마이그레이션 — naver_clicks 테이블 생성
- **Priority**: Must
- **Description**: 클릭 로그를 저장하는 테이블 생성. id, created_at, referer_url(전체 URL), post_id(네이버 포스트 번호), user_agent 컬럼.
- **Acceptance Criteria**: 마이그레이션 실행 후 테이블 존재 확인
- **Verification**: (MANUAL) `supabase migration up` 후 테이블 조회

### REQ-002: /api/naver-redirect 엔드포인트
- **Priority**: Must
- **Description**: GET 요청 시 Referer 헤더에서 네이버 포스트 ID 추출 → naver_clicks에 insert → tutoring.superfastsat.com으로 302 리다이렉트. Referer 없으면 post_id='direct'로 저장.
- **Acceptance Criteria**: curl로 호출 시 302 리다이렉트, DB에 row 생성됨
- **Verification**: (MANUAL) curl -I https://superfastsat.com/api/naver-redirect

### REQ-003: /admin/naver 통계 페이지
- **Priority**: Must
- **Description**: 어드민 사이드바에 "Naver" 항목 추가. 페이지에서: 전체 클릭 수, 포스팅별 클릭 수(post_id + 클릭수 + 마지막 클릭일), 날짜별 클릭 추이(최근 30일).
- **Acceptance Criteria**: /admin/naver 접근 시 테이블과 기본 통계 렌더링
- **Verification**: (BROWSER) admin 로그인 후 /admin/naver 확인

### REQ-004: admin /api/admin/naver-stats API 라우트
- **Priority**: Must
- **Description**: admin key 인증 후 naver_clicks에서 집계 쿼리 실행. 포스팅별 클릭 수(GROUP BY post_id), 날짜별 클릭 수(최근 30일) 반환.
- **Acceptance Criteria**: x-admin-key 헤더 있으면 200 + JSON, 없으면 401
- **Verification**: (MANUAL) curl with/without admin key

## Technical Design

### Architecture
- Migration: `supabase/migrations/014_naver_clicks.sql`
- API redirect: `src/app/api/naver-redirect/route.ts`
- API stats: `src/app/api/admin/naver-stats/route.ts`
- Admin page: `src/app/admin/naver/page.tsx`
- Sidebar: `src/app/admin/layout.tsx` — NAV_ITEMS에 추가

### Naver URL 파싱
`https://blog.naver.com/superfastsat/223456789` → post_id = `223456789`
regex: `/\/(\d+)(?:\?|$)/`

### 인증
기존 admin API 패턴 그대로 — `x-admin-key` 헤더 검증.

## Traceability Matrix

| REQ ID  | Description               | Verification | Status  |
|---------|---------------------------|--------------|---------|
| REQ-001 | naver_clicks 테이블       | (MANUAL)     | Pending |
| REQ-002 | /api/naver-redirect       | (MANUAL)     | Pending |
| REQ-003 | /admin/naver 페이지       | (BROWSER)    | Pending |
| REQ-004 | /api/admin/naver-stats    | (MANUAL)     | Pending |

## Implementation Order

1. REQ-001 — DB 먼저
2. REQ-002 — redirect API (DB 의존)
3. REQ-004 — stats API (DB 의존)
4. REQ-003 — admin 페이지 (stats API 의존)

## Out of Scope

- Slack 알림
- PostHog 이벤트
- 포스팅 제목 자동 조회 (post_id만 표시)
- 이전 데이터 마이그레이션
