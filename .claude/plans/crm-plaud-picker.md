# CRM 상담패널 Plaud 녹음 선택 → 자동요약 초안

## Overview

CRM 학생 상담 패널에서 **Plaud 녹음을 직접 목록으로 보고 선택**해 상담메모 자동요약(published:false 초안)을
생성하는 기능. 브라우저는 Plaud에 직접 못 붙으므로, Next.js 백엔드가 **Plaud 호스팅 원격 MCP
서버(`https://mcp.plaud.ai/mcp`, Bearer)** 에 HTTP 클라이언트로 붙어 `list_files`/`get_file`을 프록시한다.
토큰은 `PLAUD_REFRESH_TOKEN`(env)로 서버가 자동 갱신(refresh_token 재사용 가능, 24h) — DB·로컬 프로세스 불필요, Vercel 가능.

## 조사로 확정된 사실 (근거)
- Plaud는 공식 API 키 없음. 접근은 MCP 전용. 원격 HTTP MCP: `mcp.plaud.ai/mcp` (docs.plaud.ai 확인).
- `POST mcp.plaud.ai/mcp` + `Authorization: Bearer <access_token>` + `Accept: application/json, text/event-stream`
  → **stateless**(initialize 불필요) tools/call 동작. 응답은 SSE(`event: message\ndata: {json}`),
  `result.content[0].text`가 JSON 문자열(list_files=목록, get_file=presigned_url 포함).
- list_files는 `page_size>=10` 필수.
- 토큰 refresh: `POST platform.plaud.ai/developer/api/oauth/third-party/access-token/refresh`,
  `Content-Type: x-www-form-urlencoded`, body `refresh_token=...`, **브라우저 UA 헤더 필요**(Cloudflare 1010 회피),
  응답 `{access_token, refresh_token, token_type, expires_in:86400}`. 원본 refresh_token **재사용 가능**(단일사용 아님).

## Requirements

### REQ-001: Plaud MCP HTTP 클라이언트 (`src/lib/plaud-client.ts`)
- **Priority**: Must
- **Description**: `getPlaudAccessToken()` — 모듈 캐시된 access token 반환, 없거나 만료임박(≤60s)이면
  `PLAUD_REFRESH_TOKEN`으로 refresh(브라우저 UA)해 캐시. `PLAUD_ACCESS_TOKEN` 있으면 그걸 우선(갱신 생략).
  `plaudMcpCall(name, args)` — mcp.plaud.ai에 tools/call, SSE 파싱, `content[0].text` 반환(isError면 throw).
  `listPlaudRecordings({query?,date_from?,date_to?,page?,page_size?})` → `{id,name,created_at,start_at,duration}[]`.
  `getPlaudFile(fileId)` → `{id,name,duration,start_at,presigned_url}`.
- **Acceptance**: 토큰 미설정→명확한 Error. refresh 성공 경로·SSE 파싱·isError throw 검증.
- **Verification**: (TEST) fetch 모킹으로 refresh/SSE/에러 경로.

### REQ-002: `GET /api/crm/plaud/recordings` (목록 프록시)
- **Priority**: Must
- **Description**: 관리자 인증 후 query(`q`,`date_from`,`date_to`,`page`,`page_size`)를 listPlaudRecordings로 전달,
  최소 필드 배열 반환. 토큰/네트워크 실패→502, 인증없음→401.
- **Acceptance**: 401/200. page_size 기본 20(≥10 보정).
- **Verification**: (TEST) 라우트 테스트(모킹).

### REQ-003: `POST .../plaud-memo`에 `file_id` 지원 추가
- **Priority**: Must
- **Description**: 기존 audio_url 유지(back-compat)하되 `{file_id}` 오면 서버가 `getPlaudFile`로
  presigned_url·name·start_at 해석 후 동일 처리. audio_url이 브라우저에 노출되지 않음.
- **Acceptance**: file_id로 201, 둘 다 없으면 400, 24MB초과 413, 없는학생 404.
- **Verification**: (TEST) file_id 경로 추가 테스트.

### REQ-004: CRM UI — 녹음 선택 모달 + 상담패널 버튼
- **Priority**: Must
- **Description**: `PlaudRecordingPicker` 모달 — 최근 녹음 목록(이름/일시/길이), 이름·날짜 검색,
  선택 시 `POST plaud-memo {file_id}` → 생성된 entry를 타임라인에 append 후 닫기. 로딩/에러/413 처리.
  MemoSection에 "🎙️ Plaud 녹음" 버튼 추가, StudentDetailPanel에서 상태·onCreated(setTimeline) 배선.
- **Verification**: (BROWSER) dev에서 실제 녹음 선택→초안 생성 확인. (MANUAL) E2E.

### REQ-005: 토큰 env
- **Priority**: Must
- **Description**: `.env.local`에 `PLAUD_REFRESH_TOKEN` 설정(~/.plaud/tokens-mcp.json에서), `.env.example`에 문서화.

## Technical Design
- 재사용: `processPlaudRecording`(audioUrl), `appendConsultationEntry`, `server-auth`, `useMemoSection` 타임라인 패턴.
- plaud-client는 MCP SDK 없이 fetch+SSE 파싱(경량). 브라우저 UA는 refresh 호출에만.
- 응답 파싱: SSE에서 `data: ` 라인 모아 result 있는 JSON 채택.

## Traceability
| REQ | Verification | Test |
|-----|--------------|------|
| REQ-001 | TEST | `src/lib/__tests__/plaud-client.test.ts` |
| REQ-002 | TEST | `src/app/api/crm/plaud/recordings/__tests__/route.test.ts` |
| REQ-003 | TEST | 기존 plaud-memo route.test.ts에 file_id 케이스 |
| REQ-004 | BROWSER/MANUAL | dev E2E |
| REQ-005 | MANUAL | env 확인 |

## Out of Scope
- 토큰 DB 영속화(refresh_token 재사용으로 불필요), 24MB 초과 분할, 완전자동 학생매칭, 페이지네이션 무한스크롤.
