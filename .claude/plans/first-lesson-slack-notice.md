# First Lesson Slack Notice (매칭 첫 수업 잡힘 알림)

## Overview

SFv2에서 학생-코치 매칭의 첫 코치룸 수업이 처음 잡히면 Slack 채널 `C0CCCD90Z0Q`(운영-매칭-현황)에
"어떤 학생-코치가 언제(KST, 학생 현지 시각) 수업하는지" 알려 준다. 10분마다 도는 cron 이 SFv2 를 조회한다.

결정 사항(사용자 확인): 자동 알림 / "최초" = 매칭(학생-코치 쌍)의 첫 수업.

## Requirements

### REQ-001: 첫 수업 판정 (순수 함수)
- **Priority**: Must
- **Description**: 최근에 만들어진 코치룸 일정(취소 제외)과 매칭별 기존 일정 유무로 "이번에 처음 잡힌 매칭"을 가려낸다.
- **Acceptance Criteria**: 조회 구간 이전에 만들어진 일정(취소 포함)이 있는 매칭은 제외. 같은 매칭의 여러 일정은 시작이 가장 빠른 것을 첫 수업으로 한 건만 반환.
- **Verification**: (TEST) `src/lib/__tests__/first-lesson-notice.test.ts`

### REQ-002: 알림 문구
- **Priority**: Must
- **Description**: 학생명·코치명·첫 수업 KST 와 학생 현지 시각(시간대가 있을 때)을 한국어로 만든다.
- **Acceptance Criteria**: 학생이 여러 명이면 모두 표기, 코치가 없으면 "코치 미정", 시간대가 없으면 현지 줄 생략.
- **Verification**: (TEST) 같은 파일

### REQ-003: cron 라우트와 중복 방지
- **Priority**: Must
- **Description**: `GET /api/cron/first-lesson-notice` 가 최근 6시간 내 생성된 일정을 보고 신규 매칭을 알린다. `first_lesson_notices(matching_id PK)` 에 먼저 선점 후 전송, 전송 실패 시 선점을 풀어 다음 실행에서 재시도.
- **Acceptance Criteria**: CRON_SECRET 불일치 401. 이미 알린 매칭은 다시 보내지 않음. 마이그레이션 161.
- **Verification**: (TEST) 라우트 테스트(인증·중복·실패 롤백), (MANUAL) 마이그레이션 적용 후 실제 채널 확인

## Out of Scope
- 두 번째 수업 이후 알림, 수업 변경/취소 알림, 과거 매칭 소급 알림

## Notes
- cron 6시간 조회 구간 + PK 로 중복을 막아, 일시 장애 후에도 누락을 줄인다.
- SLACK_BOT_TOKEN 이 없으면 아무것도 보내지 않고 선점도 하지 않는다.
