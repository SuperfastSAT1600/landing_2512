# SRM: N+1일 스케줄 + 코치 패널

## 목표
1. 스케줄 탭에서 오늘(N) + 내일(N+1) 이벤트를 동시에 표시
2. 진입점 기반 암묵적 컨텍스트 태깅 (event_id, coach_id)
3. 코치 이름 클릭 → 코치 독립 커뮤니케이션 패널

---

## REQ-1: 스케줄 API N+1 지원 (TEST)

`/api/admin/srm/schedule?date=YYYY-MM-DD` 응답 구조 변경:

```ts
// Before
{ coachRoom: ScheduleEvent[], studyHall: ScheduleEvent[] }

// After
{
  today:    { coachRoom: ScheduleEvent[], studyHall: ScheduleEvent[] },
  tomorrow: { coachRoom: ScheduleEvent[], studyHall: ScheduleEvent[] },
}
```

`ScheduleEvent`에 `coachIds: string[]` 추가 (현재 coaches는 이름만 있음).

---

## REQ-2: ScheduleList UI N+1 표시 (BROWSER)

- `todayEvents`, `tomorrowEvents` props로 분리
- "오늘" 헤더 → 오늘 이벤트 목록
- "내일" 헤더 → 내일 이벤트 목록 (접히지 않음, 항상 표시)
- 복사 메시지 분기:
  - 오늘 → `오늘 수업 HH:MM에 있습니다!`
  - 내일 → `내일 수업 HH:MM에 있습니다, 잊지 마세요!`

---

## REQ-3: 암묵적 컨텍스트 태깅 (TEST)

스케줄 카드에서 학생 클릭 → StudentPanel 열릴 때 `eventId`, `coachId` 자동 주입.
comm 저장 시 DB에 기록 (사용자에게 드롭다운 없음).

DB migration (060):
```sql
ALTER TABLE srm_communications
  ADD COLUMN IF NOT EXISTS event_id TEXT,
  ADD COLUMN IF NOT EXISTS coach_id TEXT;
```

---

## REQ-4: 코치 패널 (BROWSER)

스케줄 카드의 코치 이름 → 클릭 가능한 버튼으로 변경.
클릭 → `CoachPanel` 슬라이드 인.

`CoachPanel` 구성:
- 헤더: 코치 이름
- 오늘/내일 수업 학생 목록 (스케줄 데이터에서)
- 커뮤니케이션 기록 (coach_id 기준, student_id IS NULL)
- 기록 추가 폼 (기존 CommLog AddForm 재활용)

comm 저장 시: `student_id = null`, `coach_id = <coachId>`

---

## 파일 변경 목록

| 파일 | 변경 |
|------|------|
| `supabase/migrations/060_srm_comm_coach_context.sql` | NEW: event_id, coach_id 컬럼 |
| `src/app/api/admin/srm/schedule/route.ts` | today/tomorrow 구조, coachIds 추가 |
| `src/app/api/admin/srm/communications/route.ts` | event_id, coach_id 필드, coachId 쿼리 |
| `src/app/admin/srm/components/ScheduleList.tsx` | N+1 표시, 메시지 분기, 코치 버튼 |
| `src/app/admin/srm/components/CoachPanel.tsx` | NEW |
| `src/app/admin/srm/components/StudentPanel.tsx` | eventId, coachId props 추가 |
| `src/app/admin/srm/page.tsx` | selectedCoach 상태, CoachPanel 렌더 |
