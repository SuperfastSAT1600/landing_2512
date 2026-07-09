# SRM 어제 활동 점검 탭

## Overview

SRM 업무 큐에 "어제 점검" 탭을 추가한다. 어제 예약된 레슨·스터디홀·보카 이벤트를 시간순으로 나열하고, 각 이벤트별로 출석 여부·코치 피드백·학습 성과를 한눈에 파악할 수 있게 한다. 문제가 있는 항목(결석·피드백 미작성·미학습)은 강조 표시하고, 해당 학생에게 바로 메시지를 보낼 수 있도록 StudentPanel을 연다.

## Requirements

### REQ-001: 어제 점검 API 엔드포인트
- **Priority**: Must
- **Description**: `GET /api/admin/srm/yesterday-check?date=YYYY-MM-DD` 엔드포인트를 신규 생성한다. 어제 날짜의 scheduled_events (coach_room, study_hall, vocab)를 조회하고, 각 이벤트별로 출석/성과 데이터를 결합해 반환한다.
- **Acceptance Criteria**:
  - `date` 파라미터 없으면 400 에러
  - coach_room: `schedule_noshow_alert` 참조해 `arrivedIds`, `missingIds` 포함; `scheduled_events.feedback` null 여부로 `hasFeedback` 반환
  - study_hall: `study_hall_session` 에서 `scheduled_event_id` 매칭으로 실제 입장 여부; `study_hall_unit_attempts` 집계로 `totalProblems`, `accuracy` 반환
  - vocab: vocab 이벤트 시간대의 `vocab.events` (kind='graded') 건수로 출석 여부; `wordCount`, `masteredCount` 반환
  - 결과는 `starts_at` KST 오름차순 정렬
- **Verification**: (MANUAL) curl `/api/admin/srm/yesterday-check?date=2026-07-05` 실행 후 JSON 구조 확인

### REQ-002: YesterdayCheck 컴포넌트
- **Priority**: Must
- **Description**: `src/app/admin/srm/components/YesterdayCheck.tsx` 신규 생성. API를 호출해 이벤트 목록을 시간순으로 렌더링한다.
- **Acceptance Criteria**:
  - 로딩 skeleton 표시
  - 이벤트별 행: KST 시간 | 카테고리 뱃지(레슨/스터디홀/보카) | 학생명 | 코치명(레슨만) | 상태 표시
  - 레슨: 학생 결석이면 빨간 "결석" 뱃지; 코치 피드백 미작성이면 주황 "피드백 없음" 뱃지
  - 스터디홀: 미입장이면 빨간 "미입장"; 입장 시 "N문제 / X%" 표시
  - 보카: 미학습이면 빨간 "미학습"; 학습 시 "N단어 / 마스터M개" 표시
  - 문제 있는 행(결석·피드백 없음·미입장·미학습) 클릭 시 `onStudentClick` 호출 → StudentPanel 열림
- **Verification**: (BROWSER) 어제 데이터가 있는 날짜로 접속 시 이벤트 목록 정상 표시 확인

### REQ-003: 업무 큐 탭에 "어제 점검" 추가
- **Priority**: Must
- **Description**: `src/app/admin/srm/page.tsx`의 큐 서브 탭(`QUEUE_TABS`)에 `'yesterday'` 탭을 추가하고, 해당 탭 선택 시 `YesterdayCheck` 컴포넌트를 렌더링한다. `selectedDate`에서 하루 전 날짜를 계산해 전달한다.
- **Acceptance Criteria**:
  - "어제 점검" 탭이 다른 큐 탭들과 함께 표시
  - 문제 있는 항목 수가 탭 뱃지로 표시 (API 응답의 `issueCount`)
  - 탭 전환 후 선택된 날짜에서 하루 전 날짜로 API 호출
- **Verification**: (BROWSER) 탭 클릭 시 어제 이벤트 목록 렌더링 확인

### REQ-004: 문제 항목 카운트 배지
- **Priority**: Should
- **Description**: API 응답에 `issueCount` (결석+피드백미작성+미입장+미학습 합계)를 포함한다. 탭 뱃지에 이 숫자를 표시한다.
- **Acceptance Criteria**: 문제가 없으면 뱃지 미표시; 1개 이상이면 주황 뱃지로 숫자 표시
- **Verification**: (BROWSER) 어제 결석 학생이 있을 때 탭에 뱃지 숫자 표시 확인

## Technical Design

### Architecture

**신규 파일:**
- `src/app/api/admin/srm/yesterday-check/route.ts` — API 엔드포인트
- `src/app/admin/srm/components/YesterdayCheck.tsx` — UI 컴포넌트

**수정 파일:**
- `src/app/admin/srm/page.tsx` — QUEUE_TABS에 'yesterday' 추가, YesterdayCheck 렌더링

**DB 쿼리 패턴 (기존 패턴 재사용):**
- `kstDateToUtcRange(dateStr)` → `schedule/route.ts`에서 import 또는 인라인
- `scheduled_events` + `scheduled_event_participants` → 이벤트·참가자 조회
- `schedule_noshow_alert` → 노쇼 감지 (coach_room)
- `study_hall_session` (scheduled_event_id 매칭) → 스터디홀 입장 여부
- `study_hall_unit_attempts` → 문제 수·정답률
- `vocab.events` (kind='graded', occurred_at 범위) → 보카 학습 여부

**타입 구조:**
```ts
export interface YesterdayCheckItem {
  eventId: string;
  category: 'coach_room' | 'study_hall' | 'vocab';
  startsAt: string;           // ISO
  endsAt: string;
  students: Array<{ id: string; name: string }>;
  coaches?: Array<{ id: string; name: string }>;  // coach_room만
  // coach_room 전용
  arrivedIds?: string[];
  missingIds?: string[];
  hasFeedback?: boolean;
  // study_hall 전용
  attended?: boolean;
  totalProblems?: number;
  accuracy?: number;
  // vocab 전용
  vocabStudied?: boolean;
  wordCount?: number;
  masteredCount?: number;
  // 공통
  hasIssue: boolean;
}

export interface YesterdayCheckResponse {
  date: string;
  items: YesterdayCheckItem[];
  issueCount: number;
}
```

### Dependencies
- `supabaseSFv2` (sfv2 DB 접근)
- 기존 `kstDateToUtcRange` 유틸 패턴
- `isAuthenticated` (인증)
- `srmFetch` (클라이언트 fetch wrapper)

## Traceability Matrix

| REQ ID  | Description                    | Verification | Status  |
|---------|--------------------------------|--------------|---------|
| REQ-001 | 어제 점검 API                  | (MANUAL)     | Pending |
| REQ-002 | YesterdayCheck 컴포넌트         | (BROWSER)    | Pending |
| REQ-003 | 업무 큐 탭에 추가               | (BROWSER)    | Pending |
| REQ-004 | 문제 항목 카운트 배지            | (BROWSER)    | Pending |

## Implementation Order

1. REQ-001 — API 먼저: 데이터 모델 확정 후 UI 작성
2. REQ-002 — API 완성 후 컴포넌트 작성
3. REQ-003 — 컴포넌트 완성 후 페이지에 통합
4. REQ-004 — REQ-001/003 의존 (issueCount는 API + 탭 뱃지 연계)

## Out of Scope

- 실시간 새로고침 (수동 새로고침만)
- 메시지 템플릿 자동 생성 (StudentPanel 연결로 기존 메시지 발송 UI 사용)
- 레슨 피드백 직접 작성 (SRM 내 피드백 편집 기능 없음, 연결만)
- 날짜 선택 UI (selectedDate에서 자동 계산)
