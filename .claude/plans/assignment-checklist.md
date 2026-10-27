# Assignment Checklist (학생 배정 요청 체크리스트)

## Overview

Slack 채널 `C0C9B0DEGDN` 에 "학생 배정 요청" 글이 올라오면, 봇이 그 글의 스레드에 해결해야 할 업무 9개를
체크박스로 달아 준다. 담당자가 항목을 하나씩 체크하면 메시지가 갱신되고, 누가 언제 체크했는지가 항목 옆에 남는다.
모두 체크되면 완료 표시가 붙는다. 상태는 Slack 메시지 자체(체크박스 `initial_options` + 항목 설명)에 담아
DB 없이 무상태로 동작한다.

업무 항목(고정 순서): 진단테스트 / 회원 가입 확인 / 상담 정보 코치 전달 / 첫·두번째 수업 가능 스케줄 확인 /
코치 초대 / 첫 수업 스케줄 재확인 요청 / 코치-학생 매칭 / 코치 스케줄 등록 / 단톡방 스케줄 링크 공지.

## Requirements

### REQ-001: 배정 요청 글 판별 (순수 함수)
- **Priority**: Must
- **Description**: 이벤트가 "배정 요청 글"인지 판별한다. 채널이 `C0C9B0DEGDN` 이고, 스레드 답글이 아닌 최상위 글이며, 본문에 "배정"이 있어야 한다. 서브타입은 없거나 `bot_message`(워크플로 글)만 허용한다.
- **Acceptance Criteria**: 다른 채널, 스레드 답글(`thread_ts` ≠ `ts`), "배정" 없는 글, 수정/삭제 등 다른 서브타입은 false.
- **Verification**: (TEST) `src/lib/__tests__/slack-assignment-checklist.test.ts`

### REQ-002: 체크리스트 블록 생성과 토글 반영 (순수 함수)
- **Priority**: Must
- **Description**: 9개 항목의 체크박스 블록을 만든다. 체크 상태가 바뀌면 새로 체크된 항목에는 `✔ 사용자 MM/DD HH:mm`(KST) 설명을 붙이고, 해제된 항목은 설명을 지우며, 그대로인 항목은 기존 설명을 유지한다. 모두 체크되면 완료 문구를 더한다.
- **Acceptance Criteria**: 진행률 `n/9` 표기. 옵션 설명은 75자 이하. 전부 체크 시 "배정 업무 완료" 컨텍스트 블록 포함.
- **Verification**: (TEST) 같은 파일

### REQ-003: 이벤트 연결 — 글이 올라오면 스레드에 체크리스트 게시
- **Priority**: Must
- **Description**: `/api/slack/events` 가 REQ-001 에 맞는 이벤트를 받으면 `chat.postMessage`(thread_ts = 글 ts)로 체크리스트를 올린다. Slack 재전송(`x-slack-retry-num`)은 무시해 중복 게시를 막는다.
- **Acceptance Criteria**: 맞는 글 1건당 게시 1회. 재전송 헤더가 있으면 게시하지 않음. 기존 리드/블로그 채널 동작은 그대로.
- **Verification**: (TEST) `src/app/api/slack/events/__tests__/assignment-checklist.test.ts`

### REQ-004: 체크 이벤트 처리 — 메시지 갱신
- **Priority**: Must
- **Description**: `/api/slack/interactions` 가 `assignment_checklist` 체크박스 액션을 받으면 REQ-002 로 블록을 다시 만들어 `chat.update` 한다. 이전 상태는 `payload.message.blocks` 의 기존 `initial_options` 에서 읽는다.
- **Acceptance Criteria**: 서명 검증 통과 요청만 처리. 체크/해제/전부 체크 세 경우 모두 갱신 호출에 올바른 블록이 담김. 다른 액션(`submit_lead` 등) 동작 불변.
- **Verification**: (TEST) `src/app/api/slack/interactions/__tests__/assignment-checklist.test.ts`

### REQ-005: 실채널 동작 확인
- **Priority**: Should
- **Description**: 배포 후 실제 채널에서 글 → 체크리스트 → 체크 → 완료까지 한 번 돌려 본다.
- **Acceptance Criteria**: 봇이 채널에 초대되어 있고 `message.channels` 이벤트·Interactivity URL 이 설정돼 있어야 함.
- **Verification**: (MANUAL) 테스트 글 1건으로 확인

## Technical Design

### Architecture
- 신규 `src/lib/slack-assignment-checklist.ts`: 상수(채널·항목), `isAssignmentRequest`, `buildChecklistBlocks`, `applyToggle`, 전송 함수(`postChecklist`, `updateChecklist`).
- `src/app/api/slack/events/route.ts`: 봇 필터 앞에서 REQ-001 분기 한 줄 추가(워크플로 글은 `bot_id` 가 있어 기존 필터에 걸리므로). 스레드에만 답하므로 봇 자기 글에 반응하는 루프는 없음.
- `src/app/api/slack/interactions/route.ts`: `assignment_checklist` 분기 추가, 로직은 lib 로 위임.
- 형식 판별은 휴리스틱("배정" 키워드 + 최상위 글)이라 오탐 시 스레드에 체크리스트가 하나 더 붙는 정도의 영향.

### Dependencies
- 기존 `SLACK_BOT_TOKEN`, `SLACK_SIGNING_SECRET`. 신규 환경변수·마이그레이션 없음.
- Slack 앱 설정: 봇이 `C0C9B0DEGDN` 에 초대, `message.channels` 구독(리드 채널에서 이미 사용 중이면 추가 설정 불필요).

## Traceability Matrix

| REQ ID  | Description                    | Verification | Test File                                                          | Status  |
|---------|--------------------------------|--------------|--------------------------------------------------------------------|---------|
| REQ-001 | 배정 요청 글 판별              | (TEST)       | `src/lib/__tests__/slack-assignment-checklist.test.ts`             | Passing |
| REQ-002 | 블록 생성·토글·완료 표시       | (TEST)       | `src/lib/__tests__/slack-assignment-checklist.test.ts`             | Passing |
| REQ-003 | 이벤트 → 스레드 체크리스트     | (TEST)       | `src/app/api/slack/events/__tests__/assignment-checklist.test.ts`  | Passing |
| REQ-004 | 체크 → chat.update             | (TEST)       | `src/app/api/slack/interactions/__tests__/assignment-checklist.test.ts` | Passing |
| REQ-005 | 실채널 확인                    | (MANUAL)     | -                                                                  | Pending |

## Implementation Order

1. REQ-001, REQ-002 — 순수 함수부터 (이후 단계가 의존)
2. REQ-003 — 이벤트 연결
3. REQ-004 — 체크 처리
4. REQ-005 — 배포 후 수동 확인

## Out of Scope

- 항목별 담당자 지정·마감 알림·리마인더
- 학생/코치 CRM 데이터와의 자동 연동(예: 매칭 완료 시 자동 체크)
- 글 본문에서 학생·코치 이름 파싱
