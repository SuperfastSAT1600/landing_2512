# Blog Slack Auto-Write — Slack 선택 감지 → 자동 블로그 작성

## Overview

사용자가 슬랙 채널(C0A28EJQA7P)에서 "N번 써줘"를 입력하면
당일 제안된 주제 중 N번을 자동으로 감지해 블로그 작성 에이전트를 실행한다.

흐름:
```
[07:00 KST] 주제 5개 슬랙 발송 + today-topics.json 저장
     ↓
사용자: 슬랙에 "3번 써줘" 입력
     ↓
[15분 이내] 폴링 에이전트가 감지
     ↓
슬랙에 "3번 주제로 블로그 작성을 시작합니다" 확인 메시지
     ↓
새 세션에서 superfastsat-blog 스킬로 블로그 작성 + 발행
```

---

## Requirements

### REQ-001: today-topics.json 저장
- **Priority**: Must
- **Description**: `suggest-topics.js`가 슬랙 발송 직후 당일 주제 배열을
  `blog-agent/data/today-topics.json`에 저장.
  형식: `{ "date": "2026-06-30", "topics": [...] }`
  다음날 실행 시 덮어씀.
- **Acceptance Criteria**: 스크립트 실행 후 `today-topics.json`에 date와 topics 배열 존재
- **Verification**: (MANUAL) 파일 내용 확인

### REQ-002: 슬랙 폴링 크론 등록
- **Priority**: Must
- **Description**: 매 15분마다 `C0A28EJQA7P` 채널의 최신 메시지를 조회.
  `blog-agent/data/slack-poll-cursor.txt`에 마지막 처리한 메시지 타임스탬프 저장.
  "N번 써줘" (N=1~5) 패턴 메시지를 감지하면 REQ-003 실행.
  이미 처리한 메시지는 재처리하지 않음.
- **Acceptance Criteria**: CronList에서 15분 간격 트리거 확인
- **Verification**: (MANUAL) 슬랙에 "1번 써줘" 입력 후 15분 이내 반응 확인

### REQ-003: 주제 선택 및 블로그 작성 트리거
- **Priority**: Must
- **Description**: 감지된 N번에 해당하는 `today-topics.json`의 주제 title을 추출.
  슬랙에 "N번 주제로 블로그 작성을 시작합니다 — {title}" 확인 메시지 발송.
  새 세션에서 superfastsat-blog 스킬 + blog-publisher로 작성 및 발행.
- **Acceptance Criteria**: 슬랙 확인 메시지 발송, 블로그 작성 세션 시작
- **Verification**: (MANUAL) 슬랙 확인 메시지 수신 + 블로그 파일 생성 확인

### REQ-004: 중복 실행 방지
- **Priority**: Must
- **Description**: 같은 날 같은 번호에 대해 두 번 실행되지 않도록 방지.
  `today-topics.json`에 `triggered: true` 플래그 추가.
  이미 트리거된 경우 슬랙에 "이미 작성 중입니다" 메시지 발송.
- **Acceptance Criteria**: "1번 써줘" 두 번 입력 시 두 번째는 "이미 작성 중" 응답
- **Verification**: (MANUAL) 중복 입력 테스트

---

## Technical Design

### Architecture

```
blog-agent/
  scripts/
    suggest-topics.js       ← REQ-001: 발송 후 today-topics.json 저장 추가
  data/
    today-topics.json       ← 당일 주제 + triggered 플래그 (NEW)
    slack-poll-cursor.txt   ← 마지막 처리 타임스탬프 (이미 존재)

Remote Trigger (cron):
  daily-blog-topic-suggestion  ← 기존 (07:00 KST)
  slack-poll-blog-trigger      ← NEW (*/15 * * * *)
```

### 폴링 에이전트 프롬프트 핵심 로직

```
1. slack_get_channel_history(C0A28EJQA7P, oldest=cursor)으로 신규 메시지 조회
2. "N번 써줘" 패턴 메시지 탐색 (N = 1~5)
3. 감지 시:
   a. today-topics.json 읽어 N번 주제 추출
   b. triggered 체크 → 이미 true면 "이미 작성 중" 발송 후 종료
   c. triggered: true 저장
   d. 슬랙에 확인 메시지 발송
   e. 새 원격 트리거 세션에서 블로그 작성 실행
4. cursor를 최신 메시지 ts로 업데이트
```

### Dependencies

- `mcp__slack__slack_get_channel_history` — 채널 메시지 조회
- `mcp__slack__slack_post_message` — 확인 메시지 발송
- `blog-agent/data/today-topics.json` — 당일 주제 저장소
- `blog-agent/data/slack-poll-cursor.txt` — 폴링 커서

---

## Traceability Matrix

| REQ ID  | Description                    | Verification | Status  |
|---------|--------------------------------|--------------|---------|
| REQ-001 | today-topics.json 저장         | (MANUAL)     | Pending |
| REQ-002 | 슬랙 폴링 크론 등록             | (MANUAL)     | Pending |
| REQ-003 | 주제 선택 및 블로그 작성 트리거  | (MANUAL)     | Pending |
| REQ-004 | 중복 실행 방지                  | (MANUAL)     | Pending |

## Implementation Order

1. REQ-001 — suggest-topics.js 수정 (폴링의 데이터 소스)
2. REQ-004 — triggered 플래그 설계 (REQ-003 전제)
3. REQ-003 — 블로그 작성 트리거 프롬프트 작성
4. REQ-002 — 전체 흐름 확인 후 크론 등록

## Out of Scope

- 슬랙 Events API 웹훅 (서버 인프라 필요 — 폴링으로 대체)
- "다시 추천해줘" 슬랙 명령 처리 (별도 Phase)
- 발행 완료 후 슬랙 결과 링크 전송 (blog-publisher 연동 별도)
