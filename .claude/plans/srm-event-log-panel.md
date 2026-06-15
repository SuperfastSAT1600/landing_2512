# SRM 이벤트 로그 패널 — 스케줄 박스 클릭 기반

## Overview

스케줄 행(박스) 전체를 클릭하면 해당 이벤트를 기준으로 커뮤니케이션을 기록하는 패널이 열린다.
학생 이름 클릭(StudentPanel, 학생 상세)과 이벤트 박스 클릭(EventLogPanel, 이벤트 로그)은 별개 동작.

## Requirements

### REQ-001: UnifiedTimeline — 이벤트 박스 클릭
- 행 배경 전체 onClick → onEventClick(ev)
- 학생 이름 버튼은 stopPropagation + 기존 onStudentClick 유지
- 행 hover 시 배경이 조금 밝아져 클릭 가능함을 암시

### REQ-002: EventLogPanel 컴포넌트 (신규)
- 우측 슬라이드 패널 (w-[520px])
- 헤더: 이벤트 타입(수업/스터디홀) + 시간 + 날짜
- 참여자 목록: 학생 이름들 + 코치 이름 (정보성)
- AddForm: parties 토글 + channel + content + resolution
- 아래 해당 event_id 기준 기존 comm 로그 표시

### REQ-003: API — event_id 기준 comm 조회
- GET /api/admin/srm/communications?eventId=xxx
- event_id로 필터링된 srm_communications 반환

### REQ-004: SrmPage — selectedEvent 상태
- selectedEvent: TaggedEvent | null
- EventLogPanel 열려 있을 때 StudentPanel도 동시에 열릴 수 있음 (별개)
- EventLogPanel → 저장 시 event_id + student_id=null + parties 배열로 POST

## Technical Design

- EventLogPanel은 UnifiedTimeline의 TaggedEvent를 그대로 받음
- comm POST: studentId=null, eventId=ev.id, student_name=ev.students.join(', ')
- 기존 StudentPanel/onStudentClick 흐름은 변경 없음
- EventLogPanel은 SRM 스케줄 탭에서만 사용

## Implementation Order
1. REQ-003 — API eventId 쿼리 추가
2. REQ-002 — EventLogPanel 컴포넌트
3. REQ-001 — UnifiedTimeline 행 클릭 + onEventClick prop
4. REQ-004 — SrmPage 상태 연결
