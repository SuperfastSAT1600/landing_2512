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

## REQ-4: vocab 복사 메시지 추가 (BROWSER)
`UnifiedTimeline.tsx`
- `buildVocabCopyMessage` 함수 추가 (스터디홀 패턴 동일, 끝부분만 다름)
  - KO: `${dayWord} 단어학습 접속 시간 ${timeInfo}이니 ${verb} 출석해서 단어 외우는데 집중해보자구요!`
  - EN: `${dayWord} Vocab session is on ${timeInfo}. ${verb} Join and focus on memorizing the words!`
  - verb(KO): 오늘='늦지 말고', 내일='잊지 말고'
  - verb(EN): 오늘="Don't be late!", 내일="Don't forget!"
- vocab 이벤트에 KO/EN 복사 버튼 표시 (코치룸·스터디홀과 동일)
- `handleCopy`에 vocab 분기 추가

## 스킵
- test_center: 현재 1건뿐이므로 이번 작업에서 제외
