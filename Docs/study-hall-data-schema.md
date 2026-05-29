# Study Hall 학습 데이터 스키마 참조

**Supabase 프로젝트**: `uvyzmnpdxreatmczlsds`  
**최종 확인**: 2026-05-22  
**전체 누적 레코드**: log 39,005 / session 858 / unit_attempts 8,827 / unit_progress 6,711

---

## 테이블 관계 개요

```
sessions (SMS)
    └── study_hall_session          ← 학생이 Study Hall에 입장한 세션
            └── study_hall_log      ← 세션 내 모든 행동 이벤트 (fine-grained)

profiles (SMS)
    └── study_hall_unit_attempts    ← 문제 1개당 1레코드 (답 제출 시점)
    └── study_hall_unit_progress    ← 문제 1개당 진행 상태 (시작/완료)

curricula / lessons / units (SMS)
    └── (위 모든 테이블에서 curriculum_id, lesson_id, unit_id로 참조)
```

---

## 1. `study_hall_session`

**역할**: 학생이 Study Hall 화면에 입장해서 나갈 때까지의 단위. 하나의 SMS `session`에 여러 개 생길 수 있다.

| 컬럼 | 타입 | Nullable | 설명 |
|------|------|----------|------|
| `id` | UUID | NO | 기본 키 |
| `session_id` | UUID | NO | SMS `sessions.id` 참조 (student_id 역참조 가능) |
| `lesson_id` | UUID | YES | 학습 중인 레슨 (`lessons.id`) |
| `curriculum_id` | UUID | YES | 학습 중인 커리큘럼 (`curricula.id`) |
| `started_at` | timestamptz | NO | Study Hall 입장 시각 |
| `ended_at` | timestamptz | YES | Study Hall 이탈 시각 (비정상 종료 시 null 가능) |
| `last_active_at` | timestamptz | YES | 마지막 활성 시각 (커서 이동, 스크롤 등) |
| `last_interaction_at` | timestamptz | YES | 마지막 실질 상호작용 시각 (답 제출, 채팅 등) |

**비고**
- `lesson_id` / `curriculum_id`가 null인 세션 존재 → 특정 레슨 없이 자유 학습 진입
- 학습 시간 계산: `ended_at - started_at` (분 단위)
- 학생 ID 조회 경로: `session_id → sessions.student_id → profiles.full_name`

---

## 2. `study_hall_log`

**역할**: 세션 내 학생의 모든 행동을 이벤트 스트림으로 기록. 가장 세분화된 원시 데이터.

| 컬럼 | 타입 | Nullable | 설명 |
|------|------|----------|------|
| `id` | UUID | NO | 기본 키 |
| `study_hall_session_id` | UUID | NO | `study_hall_session.id` 참조 |
| `student_id` | UUID | NO | `profiles.id` 참조 |
| `unit_id` | UUID | YES | 이벤트 발생 시점의 문제 (`units.id`) |
| `action_type` | text | NO | 이벤트 종류 (아래 목록 참조) |
| `payload` | JSONB | YES | 이벤트별 추가 데이터 |
| `occurred_at` | timestamptz | NO | 이벤트 발생 시각 |

### action_type 목록

| action_type | payload 구조 | 설명 |
|-------------|-------------|------|
| `unit_enter` | `{ "unitOrderIndex": 2 }` | 문제 화면에 진입 |
| `select_answer` | `{ "answer": "A" }` | 보기 선택 (제출 전 변경 포함) |
| `confidence_select` | `{ "level": 75 }` | 자신감 수준 선택 (0·25·50·75·100) |
| `eliminate_option` | `{ "option": "C", "eliminated": true }` | 보기 제거/복원 |
| `highlight` | `{ "text": "...", "color": "#fef08a", "section": "passage" }` | 텍스트 하이라이트 |
| `highlight_delete` | `{ "highlightId": "uuid" }` | 하이라이트 삭제 |
| `chat_message_sent` | `null` | AI 튜터에게 메시지 전송 |
| `session_abandon` | `null` | 세션 중간 이탈 |
| `browse_entered` | `null` | 문제 목록 브라우저 진입 |

**비고**
- `select_answer`는 최종 제출이 아닌 선택 변경마다 기록됨 → 최종 답은 `study_hall_unit_attempts`에서 확인
- `highlight.section` 값: `"passage"` 또는 `"question"`
- `confidence_select.level` 값: 0 / 25 / 50 / 75 / 100

---

## 3. `study_hall_unit_attempts`

**역할**: 학생이 문제에 최종 답을 제출한 레코드. 문제당 1개가 원칙이며 풀이 전략 데이터(하이라이트, 제거 선택지, 자신감, AI 채팅)가 함께 저장된다.

| 컬럼 | 타입 | Nullable | 설명 |
|------|------|----------|------|
| `id` | UUID | NO | 기본 키 |
| `student_id` | UUID | NO | `profiles.id` 참조 |
| `unit_id` | UUID | NO | 실제 출제된 문제 (`units.id`) |
| `original_unit_id` | UUID | YES | 원본 문제 ID (변형 문제인 경우 원본 참조) |
| `session_id` | UUID | NO | SMS `sessions.id` 참조 |
| `curriculum_id` | UUID | YES | `curricula.id` 참조 |
| `lesson_id` | UUID | YES | `lessons.id` 참조 |
| `selected_answer` | text | YES | 최종 선택 보기 (`"A"` / `"B"` / `"C"` / `"D"`) |
| `is_correct` | boolean | NO | 정답 여부 |
| `time_spent_seconds` | integer | YES | 풀이 소요 시간 (초) |
| `attempted_at` | timestamptz | NO | 제출 시각 |
| `confidence_level` | integer | YES | 제출 시 자신감 (0·25·50·75·100) |
| `review_time_seconds` | integer | YES | 정답 확인 후 복습에 쓴 시간 (초) |
| `highlights` | JSONB array | YES | 하이라이트 목록 (제출 시점 스냅샷) |
| `eliminated_options` | JSONB array | YES | 제거한 보기 목록 (제출 시점 스냅샷) |
| `chat_messages` | JSONB array | YES | AI 튜터와의 대화 내역 |

### JSONB 필드 상세

**`highlights`** — 배열, 각 항목:
```json
{
  "id": "uuid",
  "text": "overlooks crucial variables",
  "color": "#fef08a",
  "section": "passage"
}
```
- `section`: `"passage"` (지문) 또는 `"question"` (문제문)
- `color`: 현재 단색(`#fef08a` 노란색)만 사용 중

**`eliminated_options`** — 문자열 배열:
```json
["B", "C"]
```

**`chat_messages`** — 배열, 각 항목:
```json
{
  "role": "assistant",
  "content": "You answered in 3 seconds with full confidence — so let's dig into that!"
}
```
- `role`: `"user"` 또는 `"assistant"`

---

## 4. `study_hall_unit_progress`

**역할**: 학생별·문제별 진행 상태 추적. `study_hall_unit_attempts`와 달리 "시작했지만 아직 제출하지 않은" 상태를 포착한다.

| 컬럼 | 타입 | Nullable | 설명 |
|------|------|----------|------|
| `id` | UUID | NO | 기본 키 |
| `student_id` | UUID | NO | `profiles.id` 참조 |
| `curriculum_id` | UUID | YES | `curricula.id` 참조 |
| `lesson_id` | UUID | YES | `lessons.id` 참조 |
| `unit_id` | UUID | NO | `units.id` 참조 |
| `status` | text | NO | `"in_progress"` 또는 `"completed"` |
| `started_at` | timestamptz | NO | 문제 시작 시각 |
| `completed_at` | timestamptz | YES | 문제 완료 시각 (`status = "completed"`일 때) |

**비고**
- `status = "in_progress"` + `completed_at = null` → 세션 이탈 등으로 미완료
- `study_hall_unit_attempts`와의 차이: attempts는 "제출한 답", progress는 "진행 상태"를 기록

---

## 집계 시 자주 쓰는 조인 경로

| 목적 | 경로 |
|------|------|
| 학생 이름 | `study_hall_unit_attempts.student_id → profiles.full_name` |
| 학습 시간 | `study_hall_session.session_id → sessions.student_id`, `ended_at - started_at` |
| 커리큘럼 이름 | `*.curriculum_id → curricula.title` |
| 레슨 이름 | `*.lesson_id → lessons.title` |
| 세션별 학생 | `study_hall_session.session_id → sessions.student_id → profiles` |

---

## 데이터 집계 활용 예시

| 분석 | 사용 테이블 | 핵심 컬럼 |
|------|------------|---------|
| 일별 학습 시간 | `study_hall_session` | `ended_at - started_at` |
| 문제 정답률 | `study_hall_unit_attempts` | `is_correct` |
| 영역별 정답률 | `study_hall_unit_attempts` | `curriculum_id`, `is_correct` |
| AI 튜터 사용률 | `study_hall_unit_attempts` | `chat_messages != null` |
| 자신감 vs 정답률 | `study_hall_unit_attempts` | `confidence_level`, `is_correct` |
| 하이라이트 패턴 | `study_hall_log` | `action_type = 'highlight'`, `payload.section` |
| 중도 이탈율 | `study_hall_log` | `action_type = 'session_abandon'` |
| 미완료 문제 | `study_hall_unit_progress` | `status = 'in_progress'` |
