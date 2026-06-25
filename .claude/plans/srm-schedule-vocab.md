# Spec: SRM 스케줄에 vocab 카테고리 추가

## 배경
`scheduled_events` 테이블에 `vocab` 카테고리 이벤트가 108건 존재하지만,
현재 `/api/admin/srm/schedule` 라우트는 `coach_room`, `study_hall`만 필터링 중.
SRM 타임라인에 vocab 스케줄을 함께 표시해야 함.

## DB 확인 결과
- `scheduled_events.category` 값: `coach_room`, `study_hall`, `vocab`, `test_center`
- vocab 이벤트 구조: `starts_at`, `ends_at`, `status` + `scheduled_event_participants`에 학생 연결
- vocab 이벤트에 코치 없음 (학생만 참여)

## 변경 범위

### REQ-1: API 라우트 (MANUAL)
`src/app/api/admin/srm/schedule/route.ts`
- `.in('category', ['coach_room', 'study_hall'])` → `['coach_room', 'study_hall', 'vocab']` 로 변경
- `ScheduleResponse` 타입에 `vocab: ScheduleEvent[]` 추가 (today/tomorrow 각각)
- `fetchEventsForDate` 반환 타입에 `vocab` 추가

### REQ-2: UnifiedTimeline 컴포넌트 (BROWSER)
`src/app/admin/srm/components/UnifiedTimeline.tsx`
- `EventType` = `'coachRoom' | 'studyHall' | 'vocab'`
- Props에 `todayVocab`, `tomorrowVocab` 추가
- `mergeAndSort`에 vocab 포함
- `renderRow`에 vocab 뱃지 추가 (초록색, "단어학습" 표시)
- vocab 이벤트는 copy 버튼 없음 (알림 메시지 불필요)

### REQ-3: page.tsx 연결 (BROWSER)
`src/app/admin/srm/page.tsx`
- `UnifiedTimeline`에 `todayVocab`, `tomorrowVocab` props 전달
- `allEventIds` 수집에 vocab 이벤트 포함

## 스킵
- ScheduleList 컴포넌트: 현재 미사용(UnifiedTimeline으로 대체) → 변경 없음
- copy-log: vocab은 복사 기능 없으므로 변경 없음
- test_center: 현재 1건뿐이므로 이번 작업에서 제외
