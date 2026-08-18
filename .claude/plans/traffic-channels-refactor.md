# Traffic Channels Refactor: 멀티채널 유입 통계 시스템

## Overview

현재 네이버 블로그 유입만 추적하는 `/admin/naver` 페이지를 다중 채널 (Naver, Ghost, Instagram, 향후 확장) 유입 통계 시스템으로 리팩토링한다.

**목표**:
1. 단일 채널(Naver) 구조 → 채널 추상화(`channel` 컬럼) 기반 통합 스키마로 전환
2. 사이드바 메뉴 "Naver 유입" → "채널 유입 통계"로 일반화
3. URL `/admin/naver` → `/admin/traffic` (허브 + 채널별 필터/탭)
4. 채널별 redirect API는 그대로 유지하되, 내부적으로 단일 테이블(`channel_clicks`)에 통합 기록
5. 무중단(zero-downtime) 마이그레이션: 기존 `naver_clicks` 데이터 보존 + 점진적 전환

**비범위 (Out of Scope)**:
- 새 채널(Ghost, Instagram) 페이지 실제 콘텐츠 — 본 리팩토링은 인프라/허브만 준비
- UTM 파라미터 자동 분해 / 외부 분석 도구 연동 (GA4 등)
- 클릭 → 전환(가입/결제) 퍼널 추적 (별도 스펙)
- 채널별 권한 분리 (모든 admin 사용자가 전체 채널 조회)

---

## Requirements

### REQ-001: 통합 채널 클릭 테이블 신규 마이그레이션
- **Priority**: Must
- **Description**: `channel_clicks` 테이블을 신설한다. 컬럼: `id`, `created_at`, `channel`(text, NOT NULL), `post_id`(text, default `'direct'`), `referer_url`(text, nullable), `user_agent`(text, nullable). `channel` 컬럼은 enum 대신 text + CHECK 제약(`channel IN ('naver','ghost','instagram')`)으로 유연성 확보. `(channel, created_at DESC)` 복합 인덱스와 `(channel, post_id)` 인덱스 생성.
- **Acceptance Criteria**: 마이그레이션 `015_channel_clicks.sql` 적용 후 `channel_clicks` 테이블 존재, 인덱스 2개 생성, CHECK 제약 동작 확인 (잘못된 channel 값 INSERT 시 실패).
- **Verification**: (TEST) `src/__tests__/api/channel-clicks-schema.test.ts` — Supabase admin 클라이언트로 INSERT/SELECT/CHECK 위반 시나리오 검증

### REQ-002: 기존 naver_clicks 데이터 백필 마이그레이션
- **Priority**: Must
- **Description**: `naver_clicks`의 모든 기존 row를 `channel_clicks`에 `channel='naver'`로 백필한다. 마이그레이션 `016_backfill_naver_to_channel_clicks.sql`에서 `INSERT INTO channel_clicks (created_at, channel, post_id, referer_url, user_agent) SELECT created_at, 'naver', post_id, referer_url, user_agent FROM naver_clicks ON CONFLICT DO NOTHING` 형태로 수행. `naver_clicks` 테이블은 **삭제하지 않고 유지**(롤백 안전).
- **Acceptance Criteria**: 마이그레이션 후 `SELECT COUNT(*) FROM channel_clicks WHERE channel='naver'` 가 마이그레이션 직전 `naver_clicks` row 수와 동일.
- **Verification**: (TEST) `src/__tests__/migrations/backfill-naver.test.ts` — 마이그레이션 전후 카운트 비교

### REQ-003: 공통 클릭 로깅 헬퍼 추출
- **Priority**: Must
- **Description**: `src/lib/channel-clicks.ts` 신설. `logChannelClick({ channel, postId, request })` 함수로 모든 redirect API에서 재사용. 함수는 Supabase admin 클라이언트로 `channel_clicks` INSERT를 수행하며 실패해도 redirect 흐름을 막지 않도록 try/catch로 감싼다 (에러는 console.error 로깅). channel 값은 함수 시그니처에서 union type (`'naver' | 'ghost' | 'instagram'`)으로 제약.
- **Acceptance Criteria**: 함수 호출 시 정상 INSERT, Supabase 실패 시 throw 없이 false 반환, 성공 시 true 반환.
- **Verification**: (TEST) `src/__tests__/lib/channel-clicks.test.ts` — Supabase 클라이언트 mock으로 success/failure 경로 검증

### REQ-004: 기존 /api/naver-redirect 통합 테이블 사용으로 전환
- **Priority**: Must
- **Description**: `src/app/api/naver-redirect/route.ts`를 수정해 (a) **dual-write**: 기존 `naver_clicks` INSERT는 한 릴리스 동안 유지하고, (b) 신규 `logChannelClick({ channel: 'naver', ... })`를 추가 호출. 리다이렉트 도착지(`tutoring.superfastsat.com`)와 응답 코드(302)는 그대로. dual-write는 REQ-010 cleanup 마이그레이션에서 제거.
- **Acceptance Criteria**: GET `/api/naver-redirect?post=foo` 호출 시 (1) 302 리다이렉트 응답, (2) `naver_clicks`에 row 1개 추가, (3) `channel_clicks`에 channel='naver' row 1개 추가.
- **Verification**: (TEST) `src/__tests__/api/naver-redirect.test.ts` — Next.js route handler 테스트, Supabase mock으로 두 테이블 INSERT 호출 검증

### REQ-005: /api/ghost-redirect 신규 엔드포인트
- **Priority**: Must
- **Description**: `src/app/api/ghost-redirect/route.ts` 신설. `/api/naver-redirect`와 동일 구조이되 `logChannelClick({ channel: 'ghost', ... })` 호출. 도착지는 환경변수 `GHOST_REDIRECT_DESTINATION` 또는 기본값 `https://tutoring.superfastsat.com/`. `post` 쿼리 파라미터 지원 (없으면 `'direct'`).
- **Acceptance Criteria**: GET `/api/ghost-redirect?post=bar` 호출 시 302 리다이렉트 + `channel_clicks`에 channel='ghost' row INSERT.
- **Verification**: (TEST) `src/__tests__/api/ghost-redirect.test.ts`

### REQ-006: /api/instagram-redirect 신규 엔드포인트
- **Priority**: Must
- **Description**: `src/app/api/instagram-redirect/route.ts` 신설. REQ-005와 동일 패턴, `channel: 'instagram'`. 도착지는 `INSTAGRAM_REDIRECT_DESTINATION` env 또는 기본값.
- **Acceptance Criteria**: GET `/api/instagram-redirect?post=baz` 호출 시 302 + `channel_clicks`에 channel='instagram' row INSERT.
- **Verification**: (TEST) `src/__tests__/api/instagram-redirect.test.ts`

### REQ-007: 통합 통계 API /api/admin/traffic-stats
- **Priority**: Must
- **Description**: `src/app/api/admin/traffic-stats/route.ts` 신설. 쿼리 파라미터: `channel`(optional: `'all' | 'naver' | 'ghost' | 'instagram'`, 기본 `'all'`), `days`(optional, 기본 30). 응답 형태:
  ```
  {
    total: number,
    byChannel: [{ channel: string, count: number, lastClick: string }],
    byPost: [{ channel: string, postId: string, count: number, lastClick: string }],
    byDay: [{ date: string, count: number }]   // channel='all'이면 전체 합계, 그 외 해당 채널만
  }
  ```
  인증은 기존 `isAuthenticated(request)` 헬퍼 재사용. 미인증 시 401.
- **Acceptance Criteria**: (1) 401 미인증 시 응답, (2) `?channel=all` 정상 응답에 byChannel 배열 포함, (3) `?channel=naver` 응답의 byPost는 모두 channel='naver', (4) `?days=7` 시 byDay는 7개 이하.
- **Verification**: (TEST) `src/__tests__/api/admin/traffic-stats.test.ts` — 인증/필터/집계 케이스 모두 검증

### REQ-008: 사이드바 메뉴명/링크 변경
- **Priority**: Must
- **Description**: `src/app/admin/layout.tsx`의 `NAV_ITEMS`에서 `{ href: '/admin/naver', label: 'Naver 유입', icon: '📊' }` → `{ href: '/admin/traffic', label: '채널 유입 통계', icon: '📊' }`로 교체.
- **Acceptance Criteria**: 사이드바에 "채널 유입 통계" 메뉴가 표시되고 클릭 시 `/admin/traffic`으로 이동. `/admin/naver` 경로는 한 릴리스 동안 리다이렉트로 유지(REQ-009).
- **Verification**: (BROWSER) Playwright MCP로 `/admin` 접속 → 사이드바에 "채널 유입 통계" 텍스트 존재 확인 + 클릭 시 `/admin/traffic` 이동 확인

### REQ-009: /admin/naver → /admin/traffic 영구 리다이렉트 (호환성)
- **Priority**: Should
- **Description**: `next.config.mjs` 또는 `src/app/admin/naver/page.tsx`를 server-side redirect로 교체. `next.config.mjs`의 `redirects()`에 `{ source: '/admin/naver', destination: '/admin/traffic', permanent: false }` 추가 (permanent=false로 두어 추후 정책 변경 여유 확보).
- **Acceptance Criteria**: 브라우저에서 `/admin/naver` 접속 시 `/admin/traffic`으로 302 리다이렉트.
- **Verification**: (BROWSER) Playwright MCP로 `/admin/naver` 직접 접속 → URL이 `/admin/traffic`으로 바뀌고 통계 페이지 렌더 확인

### REQ-010: 채널 허브 페이지 /admin/traffic
- **Priority**: Must
- **Description**: `src/app/admin/traffic/page.tsx` 신설. 구성:
  1. **상단 요약 카드** — 채널별 카드(Naver / Ghost / Instagram) 각각 총 클릭 수, 최근 7일 변동률, 최근 클릭 시각 표시
  2. **탭 네비게이션** — `전체 | Naver | Ghost | Instagram`. 탭 선택 시 `/api/admin/traffic-stats?channel=<선택>` 재조회
  3. **차트 영역** — 기존 30일 바 차트 재사용 (선택 채널 기준)
  4. **포스트별 테이블** — `channel`, `postId`, `count`, `lastClick` 컬럼. Naver는 기존 `blog.naver.com/superfastsat/{postId}` 링크, 그 외 채널은 plain text(또는 채널별 URL 빌더 함수 `buildPostUrl(channel, postId)`로 확장 여지 확보).
  5. **사용 안내 섹션** — 채널별 redirect URL 예시 코드 블록 (Naver/Ghost/Instagram 각각).
  
  UI는 기존 `/admin/naver/page.tsx`의 다크 테마 스타일(`bg-[#1e2023]`, `border-white/5` 등) 유지.
- **Acceptance Criteria**: (1) 페이지 로드 시 채널별 카드 3개 표시, (2) 탭 클릭 시 데이터 재조회 + 테이블 필터 동작, (3) 401 시 에러 메시지 표시.
- **Verification**: (BROWSER) Playwright MCP로 `/admin/traffic` 접속 → 카드 3개, 탭 4개 존재 + Naver 탭 클릭 → 기존 Naver 데이터만 표시 확인. 스크린샷 첨부.

### REQ-011: 기존 /api/admin/naver-stats 호환 유지 (deprecated 표시)
- **Priority**: Should
- **Description**: `/api/admin/naver-stats`는 한 릴리스 동안 유지하되 내부적으로 `channel_clicks` (channel='naver')를 조회하도록 수정 (점진적 전환). 응답 헤더에 `Deprecation: true` 와 `Link: </api/admin/traffic-stats?channel=naver>; rel="successor-version"` 추가.
- **Acceptance Criteria**: (1) 기존 응답 shape 그대로 유지, (2) Deprecation 헤더 존재, (3) 데이터 소스가 `channel_clicks`로 전환됨.
- **Verification**: (TEST) `src/__tests__/api/admin/naver-stats-deprecated.test.ts`

### REQ-012: 채널 메타데이터 상수 모듈
- **Priority**: Should
- **Description**: `src/lib/channels.ts` 신설. `CHANNELS` 배열 export:
  ```ts
  export const CHANNELS = [
    { key: 'naver', label: 'Naver 블로그', icon: '📗', postUrlBuilder: (id) => `https://blog.naver.com/superfastsat/${id}` },
    { key: 'ghost', label: 'Ghost 블로그', icon: '👻', postUrlBuilder: null },
    { key: 'instagram', label: 'Instagram', icon: '📷', postUrlBuilder: null },
  ] as const;
  export type ChannelKey = typeof CHANNELS[number]['key'];
  ```
  허브 페이지, redirect API, 통계 API 모두 이 상수를 import해서 사용 → 신규 채널 추가 시 한 파일만 수정.
- **Acceptance Criteria**: 모든 채널 관련 파일이 `CHANNELS` 또는 `ChannelKey` 타입을 import. 하드코딩된 채널 문자열 없음.
- **Verification**: (TEST) `src/__tests__/lib/channels.test.ts` — CHANNELS 배열 구조 및 타입 검증 + (MANUAL) `grep -r "'naver'" src/app` 결과가 channels.ts 외 redirect 라우트(채널 식별용)에 한정되는지 확인

### REQ-013: dual-write 제거 cleanup 마이그레이션 (후속 릴리스)
- **Priority**: Could
- **Description**: 한 릴리스 후 안정성 확인되면 (a) `/api/naver-redirect`의 `naver_clicks` INSERT 제거, (b) 마이그레이션 `017_drop_naver_clicks.sql`로 `naver_clicks` 테이블 DROP. **본 스펙에서는 마이그레이션 파일과 코드 변경을 작성만 해두고 실제 적용은 별도 PR에서**. 위치: `supabase/migrations/_pending/017_drop_naver_clicks.sql` (또는 주석으로 disabled).
- **Acceptance Criteria**: 파일 존재 + 적용 시 `naver_clicks` 테이블 삭제 SQL 포함 + 주석에 "후속 릴리스에서 활성화" 명시.
- **Verification**: (MANUAL) PR 리뷰어가 파일 존재 및 SQL 내용 확인

---

## Technical Design

### Architecture

**Before**:
```
[Naver 블로그] → /api/naver-redirect → INSERT naver_clicks → 302 → tutoring.superfastsat.com
                                                ↓
                                         /api/admin/naver-stats ← SELECT naver_clicks
                                                ↓
                                         /admin/naver (UI)
```

**After**:
```
[Naver 블로그] → /api/naver-redirect ──┐
[Ghost 블로그] → /api/ghost-redirect ──┼→ logChannelClick(channel, ...) → INSERT channel_clicks → 302
[Instagram]   → /api/instagram-redirect ┘
                                                          ↓
                                        /api/admin/traffic-stats?channel=... ← SELECT channel_clicks
                                                          ↓
                                        /admin/traffic (허브 + 탭/필터)

                                        /api/admin/naver-stats (deprecated, channel='naver' 필터)
                                        /admin/naver → 302 redirect → /admin/traffic
```

### 새/변경 파일 목록

**Database**:
- `supabase/migrations/015_channel_clicks.sql` (NEW) — REQ-001
- `supabase/migrations/016_backfill_naver_to_channel_clicks.sql` (NEW) — REQ-002
- `supabase/migrations/_pending/017_drop_naver_clicks.sql` (NEW, disabled) — REQ-013

**Lib (재사용 로직)**:
- `src/lib/channels.ts` (NEW) — REQ-012
- `src/lib/channel-clicks.ts` (NEW) — REQ-003

**API Routes**:
- `src/app/api/naver-redirect/route.ts` (MODIFY) — REQ-004 dual-write
- `src/app/api/ghost-redirect/route.ts` (NEW) — REQ-005
- `src/app/api/instagram-redirect/route.ts` (NEW) — REQ-006
- `src/app/api/admin/traffic-stats/route.ts` (NEW) — REQ-007
- `src/app/api/admin/naver-stats/route.ts` (MODIFY) — REQ-011 deprecation

**UI**:
- `src/app/admin/layout.tsx` (MODIFY) — REQ-008 NAV_ITEMS
- `src/app/admin/traffic/page.tsx` (NEW) — REQ-010 허브
- `src/app/admin/naver/page.tsx` (DELETE 또는 redirect로 단순화) — REQ-009
- `next.config.mjs` (MODIFY) — REQ-009 redirects

**Tests**:
- `src/__tests__/api/channel-clicks-schema.test.ts` (NEW) — REQ-001
- `src/__tests__/migrations/backfill-naver.test.ts` (NEW) — REQ-002
- `src/__tests__/lib/channel-clicks.test.ts` (NEW) — REQ-003
- `src/__tests__/api/naver-redirect.test.ts` (NEW) — REQ-004
- `src/__tests__/api/ghost-redirect.test.ts` (NEW) — REQ-005
- `src/__tests__/api/instagram-redirect.test.ts` (NEW) — REQ-006
- `src/__tests__/api/admin/traffic-stats.test.ts` (NEW) — REQ-007
- `src/__tests__/api/admin/naver-stats-deprecated.test.ts` (NEW) — REQ-011
- `src/__tests__/lib/channels.test.ts` (NEW) — REQ-012

### Dependencies

- 기존: `@supabase/supabase-js`, `next`, `vitest` — 추가 의존성 없음
- 환경변수 신규: `GHOST_REDIRECT_DESTINATION`, `INSTAGRAM_REDIRECT_DESTINATION` (둘 다 optional, 기본값 있음)

### Database Schema (REQ-001 상세)

```sql
-- 015_channel_clicks.sql
CREATE TABLE IF NOT EXISTS channel_clicks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now() NOT NULL,
  channel text NOT NULL CHECK (channel IN ('naver','ghost','instagram')),
  post_id text NOT NULL DEFAULT 'direct',
  referer_url text,
  user_agent text
);

CREATE INDEX IF NOT EXISTS idx_channel_clicks_channel_created_at
  ON channel_clicks (channel, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_channel_clicks_channel_post_id
  ON channel_clicks (channel, post_id);
```

**확장성 메모**: CHECK 제약을 ENUM 대신 text로 둔 이유 — 새 채널(예: youtube) 추가 시 `ALTER TABLE channel_clicks DROP CONSTRAINT ... ADD CONSTRAINT ...`만 하면 되고 ENUM의 ALTER TYPE 잠금 문제 회피.

### Backfill Strategy (REQ-002 상세)

```sql
-- 016_backfill_naver_to_channel_clicks.sql
INSERT INTO channel_clicks (id, created_at, channel, post_id, referer_url, user_agent)
SELECT id, created_at, 'naver', post_id, referer_url, user_agent
FROM naver_clicks
ON CONFLICT (id) DO NOTHING;
```

`id` (uuid PK) 그대로 가져와서 dual-write 기간 동안 중복 INSERT가 발생해도 idempotent. `naver_clicks`는 한 릴리스 후 REQ-013에서 삭제.

---

## Traceability Matrix

| REQ ID  | Description                                     | Verification | Test/Check Location                                       | Status  |
|---------|-------------------------------------------------|--------------|-----------------------------------------------------------|---------|
| REQ-001 | channel_clicks 테이블/인덱스/CHECK 마이그레이션 | (TEST)       | `src/__tests__/api/channel-clicks-schema.test.ts`         | Pending |
| REQ-002 | naver_clicks → channel_clicks 백필              | (TEST)       | `src/__tests__/migrations/backfill-naver.test.ts`         | Pending |
| REQ-003 | logChannelClick 공통 헬퍼                       | (TEST)       | `src/__tests__/lib/channel-clicks.test.ts`                | Pending |
| REQ-004 | /api/naver-redirect dual-write 전환             | (TEST)       | `src/__tests__/api/naver-redirect.test.ts`                | Pending |
| REQ-005 | /api/ghost-redirect 신규                        | (TEST)       | `src/__tests__/api/ghost-redirect.test.ts`                | Pending |
| REQ-006 | /api/instagram-redirect 신규                    | (TEST)       | `src/__tests__/api/instagram-redirect.test.ts`            | Pending |
| REQ-007 | /api/admin/traffic-stats 통합 통계 API          | (TEST)       | `src/__tests__/api/admin/traffic-stats.test.ts`           | Pending |
| REQ-008 | 사이드바 NAV_ITEMS 변경                         | (BROWSER)    | Playwright MCP: `/admin` 사이드바 텍스트/링크 확인        | Pending |
| REQ-009 | /admin/naver → /admin/traffic 리다이렉트        | (BROWSER)    | Playwright MCP: URL 전환 확인                             | Pending |
| REQ-010 | /admin/traffic 허브 페이지                      | (BROWSER)    | Playwright MCP: 카드 3개 + 탭 4개 + 스크린샷              | Pending |
| REQ-011 | /api/admin/naver-stats deprecation              | (TEST)       | `src/__tests__/api/admin/naver-stats-deprecated.test.ts`  | Pending |
| REQ-012 | CHANNELS 메타데이터 상수                        | (TEST)       | `src/__tests__/lib/channels.test.ts`                      | Pending |
| REQ-013 | dual-write 제거 cleanup 마이그레이션 (예약)     | (MANUAL)     | PR 리뷰: `_pending/017_drop_naver_clicks.sql` 존재 확인   | Pending |

---

## Implementation Order

순서는 **DB → 공통 라이브러리 → API → UI → cleanup** 흐름. 의존성 역방향 진행 금지.

1. **REQ-001** (channel_clicks 마이그레이션) — 모든 후속 작업의 토대
2. **REQ-002** (백필 마이그레이션) — REQ-001 완료 후, 실데이터 이관
3. **REQ-012** (CHANNELS 상수) — 다른 작업에서 import할 단일 진실원
4. **REQ-003** (logChannelClick 헬퍼) — REQ-001 스키마 + REQ-012 타입 의존
5. **REQ-004** (naver-redirect dual-write) — REQ-003 사용, 기존 동작 보존하며 신규 테이블 기록 시작
6. **REQ-005** (ghost-redirect) + **REQ-006** (instagram-redirect) — REQ-003 사용, 병렬 진행 가능
7. **REQ-007** (traffic-stats API) — REQ-001 스키마 의존, UI보다 먼저 완성
8. **REQ-011** (naver-stats deprecation) — REQ-001/REQ-002 의존, REQ-007과 병렬 가능
9. **REQ-010** (traffic 허브 UI) — REQ-007/REQ-012 의존
10. **REQ-008** (사이드바 NAV_ITEMS) — REQ-010 완료 후 (페이지 없으면 깨진 링크)
11. **REQ-009** (legacy 경로 리다이렉트) — REQ-010 완료 후
12. **REQ-013** (cleanup 마이그레이션 파일 작성) — 마지막. 적용은 다음 릴리스.

---

## DB Migration Strategy (무중단/Zero-Downtime)

### 단계별 전략

| 단계 | 시점 | 작업 | 안전성 |
|------|------|------|--------|
| **Stage 1** | 본 릴리스 | `015_channel_clicks.sql` 적용 (테이블 신설) | 안전 — 기존 테이블/코드 영향 없음 |
| **Stage 2** | 본 릴리스 | `016_backfill_naver_to_channel_clicks.sql` 적용 | 안전 — INSERT만, ON CONFLICT DO NOTHING |
| **Stage 3** | 본 릴리스 | 앱 배포: dual-write 활성화 (REQ-004) | 안전 — 두 테이블 모두 기록, 읽기는 신규 테이블 |
| **Stage 4** | 본 릴리스 | 신규 redirect 및 UI 배포 (REQ-005~010) | 안전 — 기존 `/admin/naver`는 리다이렉트로 대체 |
| **Stage 5** | 다음 릴리스 (관찰 기간 후) | dual-write 제거 (`/api/naver-redirect`에서 `naver_clicks` INSERT 코드 삭제) | 안전 — 신규 테이블만 기록 |
| **Stage 6** | 다음 릴리스 | `017_drop_naver_clicks.sql` 적용 (REQ-013) | **롤백 불가 지점** — 사전에 `pg_dump` 백업 권장 |

### 롤백 시나리오

- **Stage 1~4에서 문제 발생**: 코드만 이전 버전으로 revert. `channel_clicks` 테이블은 그대로 두고 다음 시도. `naver_clicks`는 손상 없음 (dual-write 덕분에).
- **Stage 5에서 문제 발생**: dual-write 코드를 다시 활성화하는 핫픽스 + 그 사이 누락된 데이터는 `channel_clicks (channel='naver')` 기준으로 `naver_clicks`에 역백필 (필요 시).
- **Stage 6 이후 문제 발생**: `pg_dump` 백업에서 `naver_clicks` 복원. 단, `channel_clicks`의 naver 데이터가 SoR(System of Record)이므로 실질적 데이터 손실은 없음.

### 마이그레이션 검증 명령

```bash
# Stage 2 적용 후
psql $DATABASE_URL -c "SELECT (SELECT COUNT(*) FROM naver_clicks) AS naver, (SELECT COUNT(*) FROM channel_clicks WHERE channel='naver') AS channel_naver;"
# → 두 값이 동일해야 함

# Stage 3 dual-write 검증
curl -I "https://tutoring.superfastsat.com/api/naver-redirect?post=test"
psql $DATABASE_URL -c "SELECT post_id, created_at FROM naver_clicks ORDER BY created_at DESC LIMIT 1;"
psql $DATABASE_URL -c "SELECT channel, post_id, created_at FROM channel_clicks ORDER BY created_at DESC LIMIT 1;"
# → 두 쿼리 모두 방금 INSERT된 row 표시
```

---

## Testing Strategy

### Unit Tests (Vitest)
- **REQ-001**: `channel-clicks-schema.test.ts` — Supabase 클라이언트로 valid/invalid channel INSERT, 인덱스 존재 확인 (information_schema 조회)
- **REQ-002**: `backfill-naver.test.ts` — 마이그레이션 실행 전후 카운트 비교 (테스트 DB or 트랜잭션 rollback 패턴)
- **REQ-003**: `channel-clicks.test.ts` — Supabase 클라이언트 mock으로 정상/실패 경로
- **REQ-004**: `naver-redirect.test.ts` — `naver_clicks` + `channel_clicks` 양쪽 INSERT 호출 검증
- **REQ-005, REQ-006**: 각 redirect 라우트별 302 응답 + 단일 테이블 INSERT 검증
- **REQ-007**: `traffic-stats.test.ts` — 인증 가드, channel 필터, days 필터, 집계 정확성
- **REQ-011**: `naver-stats-deprecated.test.ts` — 응답 shape 유지 + Deprecation 헤더 + 데이터 소스 전환 확인
- **REQ-012**: `channels.test.ts` — CHANNELS 배열 구조, postUrlBuilder 동작

### Browser Tests (Playwright MCP)
- **REQ-008**: `/admin` 접속 → 사이드바에 "채널 유입 통계" 텍스트 확인
- **REQ-009**: `/admin/naver` 접속 → URL이 `/admin/traffic`으로 변경 확인
- **REQ-010**: `/admin/traffic` 접속 → 카드 3개, 탭 4개, Naver 탭 데이터 확인 + 스크린샷 캡처

### Manual Verification
- **REQ-013**: PR 리뷰에서 `_pending/017_drop_naver_clicks.sql` 존재 + SQL 내용 + "후속 릴리스에서 활성화" 주석 확인

### Coverage Target
- 전체 80%+, redirect/통계 API는 90%+

---

## Risks & Considerations

| Risk | Impact | Mitigation |
|------|--------|------------|
| 백필 중 신규 INSERT가 들어와 ID 중복 | 마이그레이션 실패 | `ON CONFLICT (id) DO NOTHING`로 idempotent 처리. dual-write는 백필 완료 후 코드 배포. |
| `channel_clicks` INSERT 실패로 redirect 응답 지연 | 사용자 경험 저하 | `logChannelClick`을 try/catch로 감싸 실패 시에도 302 응답 보장. 로깅은 console.error. |
| CHECK 제약으로 새 채널 추가 시 마이그레이션 필요 | 운영 부담 | 채널 추가 워크플로 문서화 — `channels.ts` 수정 + `ALTER TABLE ... ADD CONSTRAINT` 마이그레이션 단일 PR로 처리. |
| `naver_clicks` 삭제 후 외부 도구/리포트가 직접 SELECT 중이었다면 깨짐 | 외부 의존성 단절 | DROP 전 grep으로 코드/스크립트 의존성 확인. README/wiki에 deprecation 일정 공지. |
| Playwright MCP 환경에서 admin 인증 토큰 필요 | E2E 테스트 자동화 어려움 | 테스트 전용 admin key를 .env.test에 두고 localStorage 주입. 기존 admin 페이지 테스트 패턴 따라감. |
| dual-write 기간 동안 `naver_clicks`와 `channel_clicks` 카운트 불일치 가능 (race condition, 한 쪽만 성공한 경우) | 통계 1~2건 차이 | 분석상 허용. 모니터링 쿼리로 일일 차이 5건 이상이면 알림. |
| `next.config.mjs` redirect 추가로 빌드 시 기존 admin 라우팅에 영향 | 빌드 실패 가능성 | redirect 추가 후 `npm run build` 로컬 검증. 기존 redirect 목록과 우선순위 확인. |

---

## Open Questions (Builder가 결정 가능)

1. `byPost` 응답에서 채널별 그룹핑을 API에서 할지 UI에서 할지 — **권장**: API에서 채널까지 포함해 평탄한 배열로 반환, UI에서 필터링/그룹핑.
2. 채널 카드의 "최근 7일 변동률" 계산 기준 — **권장**: `(최근 7일 합) / (그 이전 7일 합) - 1`, divide-by-zero 시 `null` 반환 후 UI에서 "–" 표시.
3. Ghost/Instagram의 `postUrlBuilder` — 실제 URL 패턴이 정해지면 `channels.ts`에서 추가. 본 스펙에서는 `null` 두고 plain text 표시.

