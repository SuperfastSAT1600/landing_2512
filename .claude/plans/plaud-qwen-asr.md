# Plaud 전사 STT: OpenAI → Qwen(DashScope) fun-asr 전환

## Overview

Plaud 녹음 상담메모 파이프라인의 STT를 OpenAI `gpt-4o-transcribe`에서
Qwen(DashScope 국제) `fun-asr` 비동기 파일 전사로 교체한다.

배경: OpenAI 크레딧 소진으로 전사가 전면 중단됐고(429 `credit_balance_exhausted`),
요약은 이미 Qwen을 쓰고 있어 STT까지 옮기면 벤더가 하나로 통일된다.

실측(21분 5초 / 20.2MB 실제 세일즈콜):

| 항목 | OpenAI(현재) | Qwen fun-asr |
|------|------------|--------------|
| 20MB 처리 | MP3 청킹 4분할 필요 | URL 1개, 청킹 불필요 |
| 서버 오디오 다운로드 | 필수(20MB) | 불필요 |
| 소요 | ~40s+ | 22s |
| 화자분리 | 없음 | `speaker_id` 0/1 제공 |

부수 효과: MP3 프레임 청킹(`mp3-chunk.ts`), 24MB/80분 상한, 청크 병렬 전사 로직이 불필요해진다.
화자분리로 상담사/고객이 구분되어 요약 프롬프트가 문맥 추론에 의존하지 않아도 된다.

## Requirements

### REQ-001: Qwen 비동기 파일 전사 클라이언트
- **Priority**: Must
- **Description**: presigned 오디오 URL을 DashScope `fun-asr`에 제출(`X-DashScope-Async`)하고,
  작업 상태를 폴링해 완료되면 `transcription_url`의 결과 문서를 받아 전사 텍스트를 반환한다.
- **Acceptance Criteria**: URL을 넘기면 전사 텍스트가 반환된다. 제출 실패·작업 FAILED·폴링
  타임아웃은 각각 명확한 에러로 구분되어 throw된다.
- **Verification**: (TEST) fetch를 모킹해 제출→폴링→결과조회 3단계와 실패 경로를 검증

### REQ-002: 화자분리 전사 포맷
- **Priority**: Must
- **Description**: `diarization_enabled`로 화자를 분리하고, 연속된 동일 화자 문장을 병합해
  `화자1: ...` / `화자2: ...` 형태의 전사문을 만든다. 화자 정보가 없으면 평문으로 폴백한다.
- **Acceptance Criteria**: speaker_id가 있으면 화자 라벨이 붙고, 없으면 기존처럼 평문 전사가 나온다.
- **Verification**: (TEST) 화자 있는 응답/없는 응답 두 픽스처로 출력 포맷 검증

### REQ-003: 요약 프롬프트를 화자분리 전제로 갱신
- **Priority**: Must
- **Description**: 요약 프롬프트의 "화자가 구분돼 있지 않다" 전제를 "화자1/화자2로 구분돼 있으니
  문맥으로 어느 쪽이 세일즈 담당자인지 판단하라"로 바꾼다. 섹션·분량 규칙은 그대로 둔다.
- **Acceptance Criteria**: 기존 4섹션 출력 계약([핵심 요약]/[현황]/[니즈·문제]/[다음 액션])이 유지된다.
- **Verification**: (TEST) 기존 요약 테스트 통과 + 실제 녹음 1건 수동 확인

### REQ-004: OpenAI STT 경로 및 청킹 제거
- **Priority**: Must
- **Description**: `plaud-transcribe.ts`에서 OpenAI STT·MP3 청킹·`AudioTooLargeError`/
  `AudioTooLongError`/`SttQuotaError`를 제거하고, 라우트의 413/402 매핑과 UI 분기를 정리한다.
  `mp3-chunk.ts`는 다른 사용처가 없으므로 함께 삭제한다.
- **Acceptance Criteria**: Plaud 경로에서 OpenAI 의존이 사라진다. 다른 기능(ai-care, coach-brief,
  embedding 등)의 OpenAI 사용은 건드리지 않는다.
- **Verification**: (TEST) 라우트 테스트 갱신 + `grep`으로 잔여 참조 0건 확인

### REQ-005: 전사 실패의 사용자 노출
- **Priority**: Should
- **Description**: 전사 실패(작업 FAILED·타임아웃)를 502로 매핑하고 원인을 담은 한국어 메시지를 노출한다.
- **Acceptance Criteria**: 실패 시 Picker에 "요약 생성에 실패했습니다"가 아닌 구체적 원인이 보인다.
- **Verification**: (TEST) 라우트 테스트에서 상태코드·메시지 검증

## Technical Design

### Architecture

```
PlaudRecordingPicker → POST /api/crm/students/[id]/plaud-memo
  → getPlaudFile()            (presigned URL 해석, 기존 유지)
  → processPlaudRecording()
      → transcribeAudioUrl()  ← qwen-asr.ts 로 교체 (신규)
      → summarizeTranscriptWithQwen()  (프롬프트만 갱신)
  → appendConsultationEntry() (기존 유지)
```

신규 `src/lib/qwen-asr.ts`:
- `POST {HOST}/api/v1/services/audio/asr/transcription` (헤더 `X-DashScope-Async: enable`)
- `GET  {HOST}/api/v1/tasks/{task_id}` 폴링 (PENDING/RUNNING → SUCCEEDED/FAILED)
- `GET  transcription_url` → `transcripts[0].sentences[]` → 화자 병합

라우트의 `maxDuration = 300`은 유지(폴링 상한 240s).

### Dependencies
- DashScope 국제 엔드포인트 + 기존 `QWEN_API_KEY` (신규 키 불필요)
- env: `QWEN_ASR_MODEL`(기본 `fun-asr`), `QWEN_ASR_BASE_URL`(기본 dashscope-intl)
- 오디오는 알리바바 서버가 presigned URL로 직접 fetch (서버 다운로드 없음)

## Traceability Matrix

| REQ ID  | Description                  | Verification | Test File                                              | Status  |
|---------|------------------------------|--------------|--------------------------------------------------------|---------|
| REQ-001 | 비동기 전사 클라이언트        | (TEST)       | `src/lib/__tests__/qwen-asr.test.ts`                   | Pending |
| REQ-002 | 화자분리 포맷                 | (TEST)       | `src/lib/__tests__/qwen-asr.test.ts`                   | Pending |
| REQ-003 | 요약 프롬프트 갱신            | (TEST)       | `src/lib/__tests__/plaud-transcribe.test.ts`           | Pending |
| REQ-004 | OpenAI·청킹 제거              | (TEST)       | `src/app/api/crm/students/[id]/plaud-memo/__tests__/route.test.ts` | Pending |
| REQ-005 | 실패 메시지 노출              | (TEST)       | `src/app/api/crm/students/[id]/plaud-memo/__tests__/route.test.ts` | Pending |

## Implementation Order

1. REQ-001 — 전사 클라이언트가 나머지의 토대
2. REQ-002 — REQ-001의 결과 문서 파싱 위에 얹힘
3. REQ-003 — REQ-002의 출력 포맷이 정해져야 프롬프트를 맞출 수 있음
4. REQ-004 — 신규 경로가 검증된 뒤 구경로 제거
5. REQ-005 — 라우트 정리와 함께

## Out of Scope

- ai-care / coach-brief / embedding / SEO 등 **다른 기능의 OpenAI 사용** (별건)
- Plaud 목록 조회·계정 토큰 로직
- 상담메모 UI 레이아웃 변경
