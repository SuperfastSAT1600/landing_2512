# CRM 통화 녹음 Phase 2 (화자분리·긴통화·cron·ai-care)

## Overview
Phase 1(녹음→전사→요약→메모) 위에 4가지를 추가한다. Phase 1과 같은 브랜치(PR #115)에 누적.

## Requirements

### REQ-001: 화자 분리 (상담사/고객)
- **Priority**: Must
- **Description**: 전사 후 Gemini로 화자 라벨링(상담사:/고객:)한 전사를 만들고, 그 라벨 전사로 요약(귀속 정확도↑). 라벨 전사는 `call_recordings.transcript`에 저장.
- **참고**: 진짜 음향 화자분리는 별도 유료 STT 필요 → 본 구현은 LLM 추론 기반(추가 벤더 불필요). 업그레이드 경로만 문서화.
- **Verification**: (MANUAL) 실제 2인 대화 오디오로 라벨/요약 확인.

### REQ-002: 긴 통화 지원 (세그먼트)
- **Priority**: Must
- **Description**: 클라이언트가 긴 녹음을 N개 세그먼트로 분할(평소 통화는 1세그먼트). 라우트가 다중 오디오를 각각 전사 후 순서대로 합쳐 라벨+요약. OpenAI 전사 파일 한도(25MB/파일)와 세그먼트 길이로 안전.
- **Verification**: (TEST) 다중 파일 폼 파싱·정렬. (MANUAL) 짧은 2세그먼트 업로드.

### REQ-003: 자동 삭제 cron
- **Priority**: Must
- **Description**: purge 로직을 `purgeExpiredRecordings()`로 추출. 신규 `GET /api/cron/call-recording-cleanup`(CRON_SECRET, 기존 cron 패턴) + `vercel.json` 등록(매일). 기존 관리자 POST cleanup도 동일 로직 재사용.
- **Verification**: (MANUAL) cron 시크릿으로 호출 시 만료분 purge.

### REQ-004: ai-care 학부모용 정리본 연동
- **Priority**: Should
- **Description**: Phase 1에서 이미 "메모 저장 → handleAddMemo가 ai-care 트리거" 체인이 있어 녹음 메모도 자동으로 학부모용 정리본 미리보기가 생성됨. 신규 코드 없이 동작 확인·문서화. (자동 적용/발행은 기존과 동일하게 사람이 확정)
- **Verification**: (MANUAL) 녹음 요약 저장 시 ai-care 미리보기 생성 확인.

## Technical Design
- 마이그레이션 `057_call_recording_transcript.sql` (transcript 컬럼).
- 수정: `src/lib/call-transcribe.ts`(2-pass), `src/lib/call-recording.ts`(purge 함수 추출), `call-recording/route.ts`(다중 파일 + transcript 저장), `useCallRecording.ts`(세그먼트), `api/crm/call-recordings/cleanup`(lib 재사용), `vercel.json`(+cron).
- 신규: `src/app/api/cron/call-recording-cleanup/route.ts`.
- 재사용: 기존 cron 패턴(`api/cron/diagnosis-expiry`, CRON_SECRET), ai-care 체인(useMemoSection.handleAddMemo).

## Implementation Order
1. 057 마이그레이션 → 2. 화자분리(2-pass) → 3. 긴통화(세그먼트) → 4. cron → 5. ai-care 검증.

## Out of Scope
- 진짜 음향 기반 화자분리(Deepgram/AssemblyAI 등 유료 키 필요), 실시간(통화 중) 전사.
