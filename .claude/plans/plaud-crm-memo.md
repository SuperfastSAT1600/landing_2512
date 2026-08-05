# 전화상담 제거 + Plaud 상담메모 신규 구축

## Overview

기존 브라우저 VoIP 통화(Daily.co)→녹음→전사→요약→상담메모 자동기록 기능을 **전체 제거**하고,
Plaud(AI 녹음기) 오디오를 가져와 **OpenAI STT → Qwen 4섹션 요약 → 상담메모 미공개 초안**으로
기록하는 기능을 **자체완결형으로 신규** 구축한다. 24MB(OpenAI 전사 한도) 초과 녹음은
폴백 없이 "전사 불가" 에러로 표시한다. `call_sessions` 테이블은 남긴다(코드만 제거).

## Requirements

### REQ-001: 전화상담(Daily VoIP) 기능 전체 제거
- **Priority**: Must
- **Description**: 통화 라우트·고객 통화페이지(/call)·Daily 웹훅·phone-call-cleanup 크론·`phone-call.ts`·
  `phone-call-process.ts`·`call-transcribe.ts`·PhoneCallBox·usePhoneCall 삭제, StudentDetailPanel/MemoSection
  전화 위젯 언와이어링, vercel.json 크론·.env.example Daily 블록·`@daily-co/daily-js` 정리.
  `call_sessions` 테이블은 유지.
- **Acceptance Criteria**: `phone-call`/`PhoneCall`/`@daily-co`/`call-transcribe` 잔여 import 0, typecheck 통과,
  CRM 상담 패널에 전화 위젯 없음.
- **Verification**: (TEST) typecheck + grep 잔여참조 0. (BROWSER) 상담 패널에 PhoneCallBox 미표시.

### REQ-002: Plaud 오디오 전사·요약 코어 (`plaud-transcribe.ts`, `plaud-process.ts`)
- **Priority**: Must
- **Description**: `transcribeAudioUrl(url)` — 오디오 다운로드→24MB 초과 시 `AudioTooLargeError`,
  아니면 OpenAI `gpt-4o-transcribe`(ko) 전사(폴백 없음). `summarizeTranscriptWithQwen(transcript)` —
  Qwen 화자분리(fast)+4섹션 요약(strong). `processPlaudRecording({audioUrl})` — 둘을 엮음.
- **Acceptance Criteria**: 24MB 초과→AudioTooLargeError, 정상→`{transcript, summary}`, 빈 전사/요약→throw.
- **Verification**: (TEST) fetch·OpenAI·Qwen 모킹으로 크기/정상/에러 경로 검증.

### REQ-003: `POST /api/crm/students/[id]/plaud-memo` 엔드포인트
- **Priority**: Must
- **Description**: 관리자 인증 후 `{ audio_url, recording_name?, recorded_at? }` 받아
  `processPlaudRecording`로 요약→`🎙️ Plaud 상담 자동 요약` 헤더로 `appendConsultationEntry(published:false)`.
- **Acceptance Criteria**: 인증없음→401, audio_url없음→400, 24MB초과→413, 없는학생→404, 정상→201.
- **Verification**: (TEST) 라우트 테스트 — 401/400/413/404/201/500 경로.

### REQ-004: `/plaud-to-memo` Claude Code 커맨드
- **Priority**: Should
- **Description**: Plaud MCP `list_files`→`get_file`(오디오 URL), 학생 이름 검색·확정,
  `POST .../plaud-memo` 전송, 결과·용량초과 안내.
- **Verification**: (MANUAL) 셋업 후 실제 녹음으로 엔드투엔드.

## Technical Design

### Architecture
전화상담 제거로 `call-transcribe.ts` 등 삭제 → Plaud는 이에 의존하지 않는 독립 모듈로 구축.
재사용(유지): `consultation-timeline.ts`(appendConsultationEntry), `server-auth.ts`, `supabase-admin.ts`,
`qwen.ts`(getQwenAnthropicClient — 이미 CRM 4개 라우트 실사용). Qwen 호출 패턴은 `strategy-memos.ts` 참고.

### Dependencies
Plaud MCP(`npx @plaud-ai/mcp install`+OAuth), OpenAI(`OPENAI_API_KEY`), Qwen(`QWEN_*` 설정됨), `ADMIN_SECRET_KEY`.

## Traceability Matrix

| REQ ID  | Description                    | Verification | Test File                                   | Status  |
|---------|--------------------------------|--------------|---------------------------------------------|---------|
| REQ-001 | 전화상담 기능 제거              | (TEST)       | typecheck + grep                            | Pending |
| REQ-002 | Plaud 전사·요약 코어           | (TEST)       | `src/lib/__tests__/plaud-transcribe.test.ts`, `plaud-process.test.ts` | Pending |
| REQ-003 | plaud-memo 엔드포인트           | (TEST)       | `src/app/api/crm/students/[id]/plaud-memo/__tests__/route.test.ts` | Pending |
| REQ-004 | /plaud-to-memo 커맨드           | (MANUAL)     | 수동 E2E                                     | Pending |

## Implementation Order

1. REQ-001 — 제거(정리) 먼저. 2. REQ-002 — 코어. 3. REQ-003 — 라우트. 4. REQ-004 — 커맨드·E2E.

## Out of Scope
- 24MB 초과 폴백(Plaud 전사)·오디오 분할, 완전자동 워커, CRM UI 버튼, 자동 학생매칭, call_sessions DROP.
