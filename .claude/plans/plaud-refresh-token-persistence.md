# Plaud refresh_token 영구 저장 + 에러 노출

## Overview

배포본에서 "Plaud 녹음 목록을 불러오지 못했습니다. 토큰 만료 시 재인증이 필요합니다." 가
계속 발생한다. 원인은 두 겹:

1. **잠재 버그(확정)**: Plaud refresh 엔드포인트는 OAuth **refresh token rotation** 방식이라
   갱신 응답에 새 `refresh_token`을 돌려준다(라이브 검증: 응답 keys에 `refresh_token` 포함).
   그런데 `src/lib/plaud-client.ts`의 `refreshAccessToken`은 `access_token`만 취하고 새
   refresh_token을 **버린다**. env `PLAUD_REFRESH_TOKEN`에 박아둔 토큰은 JWT `exp` 기준
   **7일 hard expiry**라, 한 번 세팅한 토큰이 7일 뒤 무조건 죽고 수동 재인증이 필요해진다.
   (env 주석의 "재사용 가능, 24h"는 access token 얘기 — 잘못된 설명.)

2. **진단 불가(현재)**: `route.ts`의 catch가 모든 에러를 고정 문구 하나로 뭉개서, 실제 원인
   (env 미설정 / 토큰 갱신 401 / Cloudflare 1010 / MCP 오류)이 화면·응답에 드러나지 않는다.

해결: 회전된 refresh_token을 Supabase에 영구 저장해 체인을 유지(7일 만료로 안 끊김)하고,
route 에러 메시지에 실제 원인을 노출한다.

## Requirements

### REQ-001: refresh 응답의 새 refresh_token 회수
- **Priority**: Must
- **Description**: `refreshAccessToken`이 응답의 `refresh_token`을 파싱해 함께 반환한다.
- **Acceptance Criteria**: 갱신 응답에 `refresh_token`이 있으면 반환값에 포함된다. 없으면 undefined.
- **Verification**: (TEST) refresh 응답에 refresh_token이 있을 때 반환값에 실린다.

### REQ-002: rotation된 refresh_token을 Supabase에 영구 저장
- **Priority**: Must
- **Description**: 신규 모듈 `plaud-token-store.ts`가 `integration_tokens` 테이블에서
  최신 refresh_token을 읽고/upsert한다. Supabase 미구성·오류 시 조용히 폴백(read→null, write→noop).
- **Acceptance Criteria**: `getPlaudAccessToken`은 저장소 토큰 우선, 없으면 env 씨앗 토큰 사용.
  갱신으로 새 refresh_token을 받으면(기존과 다르면) 저장소에 upsert한다.
- **Verification**: (TEST) 저장소가 토큰을 주면 그것으로 refresh; 새 refresh_token 수신 시 write 호출.
  저장소 read 실패 시 env 폴백.

### REQ-003: 저장소 실패는 치명적이지 않다(부트스트랩/그레이스풀)
- **Priority**: Must
- **Description**: 저장소 read/write가 throw해도 갱신 흐름은 env 씨앗으로 계속 동작한다.
- **Acceptance Criteria**: 저장소 read가 throw여도 env 토큰으로 목록 조회 성공. write throw는 무시.
- **Verification**: (TEST) 저장소 read reject 시 env 폴백으로 list_files 성공.

### REQ-004: 목록 조회 실패 시 실제 원인 노출
- **Priority**: Must
- **Description**: `/api/crm/plaud/recordings` GET catch가 friendly 문구 뒤에 실제 `e.message`를 덧붙인다.
  (메시지에 토큰 값은 포함되지 않음 — 원인 코드/상태만)
- **Acceptance Criteria**: 502 응답 `error`에 실제 원인 문자열이 포함된다.
- **Verification**: (TEST) listPlaudRecordings가 특정 메시지로 throw하면 응답 error에 그 메시지가 포함.

### REQ-005: DB 마이그레이션 — integration_tokens 테이블
- **Priority**: Must
- **Description**: `provider`(pk), `refresh_token`, `updated_at` 컬럼의 소형 테이블. 사용자가 직접 적용.
- **Acceptance Criteria**: 마이그레이션 파일 존재, upsert(onConflict provider) 가능한 스키마.
- **Verification**: (MANUAL) 사용자가 Supabase에서 적용 후 upsert 동작 확인.

## Technical Design

### Architecture
- `src/lib/plaud-token-store.ts` (신규): `readStoredRefreshToken()`, `writeStoredRefreshToken()`.
  `supabase-admin`을 **동적 import + try/catch**로 감싸 테스트/미구성 환경에서 네트워크·throw 없이 null 폴백.
- `src/lib/plaud-client.ts`:
  - `refreshAccessToken` 반환에 `newRefreshToken?` 추가.
  - `getPlaudAccessToken`: 저장소 토큰 → env 씨앗 순서로 refresh 토큰 확보, 갱신 후 새 토큰 저장.
- `src/app/api/crm/plaud/recordings/route.ts`: catch에서 `e.message`를 error 문구에 포함.
- `supabase/migrations/104_integration_tokens.sql` (신규).

### Dependencies
- 기존 `@supabase/supabase-js`(supabase-admin), Plaud MCP/refresh 엔드포인트. 신규 의존성 없음.

## Traceability Matrix

| REQ ID  | Description                         | Verification | Test File                                                        | Status  |
|---------|-------------------------------------|--------------|------------------------------------------------------------------|---------|
| REQ-001 | refresh_token 회수                  | (TEST)       | `src/lib/__tests__/plaud-client.test.ts`                         | Pending |
| REQ-002 | 저장소 저장/우선 사용               | (TEST)       | `src/lib/__tests__/plaud-client.test.ts`                         | Pending |
| REQ-003 | 저장소 실패 그레이스풀              | (TEST)       | `src/lib/__tests__/plaud-client.test.ts`                         | Pending |
| REQ-004 | 실제 원인 노출                      | (TEST)       | `src/app/api/crm/plaud/recordings/__tests__/route.test.ts`       | Pending |
| REQ-005 | integration_tokens 마이그레이션     | (MANUAL)     | `supabase/migrations/104_integration_tokens.sql`                 | Pending |

## Implementation Order

1. REQ-005 — 스키마 먼저(코드가 기대하는 테이블 정의)
2. REQ-001 — refresh 반환 확장(하위 로직)
3. REQ-002/003 — 저장소 모듈 + getPlaudAccessToken 연결
4. REQ-004 — route 에러 노출(독립)

## Out of Scope

- Cloudflare 1010(데이터센터 IP 차단) 대응 — 실제 원인이 이걸로 밝혀지면 별도 처리(프록시/공식 토큰).
- 7일 이상 무활동 대비 keep-alive 크론 — 필요 시 후속.
- 프로덕션 Render env `PLAUD_REFRESH_TOKEN` 씨앗값 초기 설정(운영 작업, 사용자 수행).
