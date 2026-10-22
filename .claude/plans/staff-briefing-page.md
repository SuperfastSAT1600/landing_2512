# 직원용 일일 브리핑 페이지

## Overview

08:00 스터디홀/보캡 스케줄 브리핑(종료 임박 / 지금 없음 / 한 번도 없음 / 코치별 예약 비율)을
날짜별 웹 페이지로 보여준다. SFv2 staff 계정으로 로그인한 직원이 학생에게 연락할 때마다 기록하고,
학생별 연락 이력(언제·누가)을 같은 페이지에서 본다.

## Decisions (사용자 확정)
- 접근: SFv2 `profiles.role` 이 `staff` 또는 `admin` 이고 `status='active'` 인 계정만 (SFv2 이메일·비밀번호 로그인)
- 체크 단위: 학생당 연락 기록 (여러 번 가능, 누가·언제·메모)
- 이력 표시: 이 페이지 안에서만 (CRM 학생 패널 연동 없음)

## Requirements

### REQ-001: 직원 로그인
- **Priority**: Must
- **Description**: SFv2 이메일·비밀번호로 로그인하고 role 이 staff/admin 인 활성 계정만 세션 발급
- **Acceptance Criteria**: `POST /api/staff/login` 성공 시 httpOnly·sameSite=strict·secure(prod) 서명 쿠키. student/teacher 계정·비활성 계정·잘못된 비밀번호는 401(같은 메시지). 같은 IP+이메일 15분 5회 초과 시 429. `POST /api/staff/logout` 은 쿠키 삭제
- **Verification**: (TEST) 세션 서명/만료/변조, 역할 판정, 로그인 라우트 분기

### REQ-002: 일별 브리핑 저장
- **Priority**: Must
- **Description**: 08:00 cron 이 브리핑 결과(세 목록 + 코치별 비율·학생별)를 KST 날짜 단위로 저장. 같은 날 재발송은 덮어씀
- **Acceptance Criteria**: `schedule_briefing_snapshots(briefing_date PK, payload jsonb)`. payload 의 학생 항목에 SFv2 userId 포함. 저장 실패해도 슬랙 발송은 진행
- **Verification**: (TEST) payload 직렬화·날짜 키, 저장 실패 시 발송 지속

### REQ-003: 브리핑 조회 API
- **Priority**: Must
- **Description**: 세션이 있는 직원이 날짜별 저장본을 조회
- **Acceptance Criteria**: `GET /api/staff/briefing?date=YYYY-MM-DD` → `{ data: { date, payload, availableDates } }`, 세션 없으면 401, 날짜 형식 오류 400, 저장본 없으면 404
- **Verification**: (TEST) 401/400/404/200

### REQ-004: 연락 기록 API
- **Priority**: Must
- **Description**: 학생별 연락 기록 생성·조회·삭제(본인이 오늘 만든 것만)
- **Acceptance Criteria**: `student_contact_logs(id, student_id, student_name, contacted_at, staff_id, staff_name, briefing_date, list_key, note)`. `POST /api/staff/contacts` 는 서버가 staff·시각을 채움(클라이언트 값 무시). `GET /api/staff/contacts?studentIds=a,b` 학생별 최신순 전체 이력. `DELETE /api/staff/contacts/:id` 는 본인이 만든 당일 기록만
- **Verification**: (TEST) 생성 시 세션 직원 기록, 타인 기록 삭제 403, 입력 검증

### REQ-005: 브리핑 페이지 UI
- **Priority**: Must
- **Description**: `/staff/briefing?date=` — 로그인 화면, 날짜 이동, 네 섹션, 학생 행마다 연락 체크
- **Acceptance Criteria**: 학생 행에 "마지막 연락 N일 전"과 [연락함] 버튼(메모 선택). 펼치면 전체 이력(날짜·시각·직원·메모). 그날 연락한 학생은 체크 표시. noindex
- **Verification**: (BROWSER) 로그인 → 날짜 이동 → 연락함 클릭 → 체크·이력 반영

## Implementation Order
1. REQ-001 세션·로그인 → 2. REQ-002 저장 → 3. REQ-003·004 API → 4. REQ-005 UI

## Out of Scope
- CRM 학생 패널 연동, 연락 알림/리마인더, 직원 계정 관리, 과거 날짜 소급 저장
- 저장본이 없는 날짜(기능 배포 전)는 조회 불가

## Notes
- 세션 만료는 업무일 사용을 고려해 8시간 (규칙의 15~30분 JWT 기준과 다름, 내부 직원 도구)
- 마이그레이션 160 필요, 적용 전에는 저장/조회가 실패 (브리핑 발송은 영향 없음)
