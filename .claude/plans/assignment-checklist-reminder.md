# Assignment Checklist Reminder (배정 체크리스트 미완료 DM)

## Overview

[[assignment-checklist]] 로 스레드에 달린 학생 배정 체크리스트가 끝나지 않았으면, 3시간마다 담당자 2명
(Slack `U07FK6LSK7C` 2017newshcoach, `U07FMTVHYBX` minjae.lee90)에게 DM 으로 남은 항목을 알려 준다.
Slack 메시지만으로는 "진행 중인 체크리스트"를 찾을 수 없어, 체크리스트마다 DB 에 한 행을 두고 체크 때마다 갱신한다.

## Requirements

### REQ-001: 체크리스트 추적 저장
- **Priority**: Must
- **Description**: 체크리스트를 게시하면 `assignment_checklists` 에 (channel, message_ts, 요청 글 첫 줄, created_at) 행을 만든다. 체크가 바뀔 때마다 체크된 항목 id 와, 9개 모두 체크면 `completed_at` 을 저장한다. 해제하면 `completed_at` 을 다시 비운다.
- **Acceptance Criteria**: `postChecklist` 가 게시한 메시지 ts 를 돌려준다. DB 저장 실패가 체크리스트 게시·갱신 자체를 막지 않는다(로그만).
- **Verification**: (TEST) `src/lib/__tests__/assignment-checklist-reminder.test.ts`, 기존 events/interactions 테스트 확장

### REQ-002: 알림 대상 선별과 문구 (순수 함수)
- **Priority**: Must
- **Description**: 미완료 행 중 마지막 알림(없으면 생성) 후 170분 이상 지난 것만 고른다. DM 문구는 건마다 요청 글 첫 줄, 남은 항목, 스레드 링크를 담는다.
- **Acceptance Criteria**: 완료된 행·170분 미만 행 제외. 남은 항목은 정의된 순서로 표기.
- **Verification**: (TEST) `src/lib/__tests__/assignment-checklist-reminder.test.ts`

### REQ-003: 3시간 cron 과 DM 전송
- **Priority**: Must
- **Description**: `GET /api/cron/assignment-checklist-reminder` (`0 */3 * * *`) 가 대상 건을 묶어 담당자 2명 각각에게 DM 1통씩 보낸다. 전송에 성공하면 해당 건의 `last_reminded_at` 을 갱신한다. 한 명이라도 실패하면 갱신하지 않아 다음 실행에서 재시도한다.
- **Acceptance Criteria**: CRON_SECRET 불일치 401. 대상이 없으면 전송하지 않음. SLACK_BOT_TOKEN 없으면 아무것도 하지 않음. `vercel.json` 크론과 cron 설정 테스트 일치. 마이그레이션 162.
- **Verification**: (TEST) `src/app/api/cron/assignment-checklist-reminder/__tests__/route.test.ts`, `src/__tests__/vercel-cron-config.test.ts`, (MANUAL) 마이그레이션 적용 후 실제 DM 수신

## Technical Design

### Architecture
- 마이그레이션 `162_assignment_checklists.sql`: PK(channel, message_ts), `request_text`, `checked_ids text[]`, `created_at`, `completed_at`, `last_reminded_at`. RLS service_role 전용(161 과 동일 패턴).
- `src/lib/assignment-checklist-store.ts`: 생성/체크 저장/미완료 조회/알림 시각 갱신.
- `src/lib/assignment-checklist-reminder.ts`: `pickDueChecklists`, `buildReminderText` (순수).
- 기존 `slack-assignment-checklist.ts`: `postChecklist` 가 ts 반환, DM 전송 함수 추가. events/interactions 라우트는 저장 호출만 추가.
- 수신자 Slack ID 는 상수로 둔다(이메일 조회에는 `users:read.email` 권한이 필요해 쓰지 않음).

### Dependencies
- 봇이 DM 을 보낼 수 있어야 함(`chat:write`; 필요 시 `im:write`).

## Traceability Matrix

| REQ ID  | Description              | Verification | Test File                                                                   | Status  |
|---------|--------------------------|--------------|-----------------------------------------------------------------------------|---------|
| REQ-001 | 체크리스트 추적 저장     | (TEST)       | `src/lib/__tests__/assignment-checklist-reminder.test.ts`                   | Passing |
| REQ-002 | 대상 선별·문구           | (TEST)       | `src/lib/__tests__/assignment-checklist-reminder.test.ts`                   | Passing |
| REQ-003 | cron·DM 전송             | (TEST)       | `src/app/api/cron/assignment-checklist-reminder/__tests__/route.test.ts`    | Passing |

## Implementation Order

1. REQ-002 — 순수 함수
2. REQ-001 — 저장 및 기존 라우트 연결
3. REQ-003 — cron

## Out of Scope

- 야간 조용한 시간 설정(요청대로 3시간 간격 고정), 담당자별 수신 설정, 이미 올라간 과거 체크리스트 소급 추적
