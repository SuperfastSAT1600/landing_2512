# 진단테스트 — 수집 데이터 스키마

진단테스트 완료 시 `diagnostic_test_results` 테이블에 저장되는 데이터 전체 목록.

---

## 1. 학생 식별 정보

| 필드 | 타입 | 내용 |
|------|------|------|
| `student_name` | string | 이름 |
| `student_email` | string \| null | 이메일 (선택 입력) |
| `token_id` | UUID \| null | 연결된 6자리 접속 코드 FK |

---

## 2. 시간 데이터

| 필드 | 타입 | 내용 |
|------|------|------|
| `started_at` | ISO timestamp | 테스트 시작 시각 |
| `submitted_at` | ISO timestamp | 제출 시각 |
| `total_time_seconds` | number | 총 소요 시간(초) |
| `time_limit_minutes` | number | 부여된 제한 시간(분), 기본 30 |
| `question_times` | `{ questionId: 초 }` | 문항별 소요 시간 |

---

## 3. 응답 데이터

| 필드 | 타입 | 내용 |
|------|------|------|
| `answers` | `{ questionId: selectedAnswerId }` | 문항별 선택지 |
| `confidence_levels` | `{ questionId: 1-5 }` | 문항별 자신감 (1=매우 낮음, 5=매우 높음) |
| `flagged_questions` | `string[]` | 플래그 표시한 문항 ID 배열 |

---

## 4. 어휘 데이터 (`saved_words`)

학생이 "모르는 단어"로 저장한 항목 배열. 항목당 구조:

| 필드 | 타입 | 내용 |
|------|------|------|
| `word` | string | 단어 텍스트 (소문자, trim) |
| `questionId` | string | 해당 문항 ID |
| `section` | `passage \| option \| question` | 단어가 등장한 위치 |
| `optionId` | `A \| B \| C \| D \| null` | 선택지 내 위치 (선택지가 아니면 null) |
| `positionIndex` | number | 소스 텍스트 내 단어 인덱스 (중복 방지) |

---

## 5. 이전 성적 (사전 설문)

| 필드 | 타입 | 내용 |
|------|------|------|
| `previous_score_status` | `scored \| never_taken \| dont_remember` | 이전 시험 여부 |
| `previous_test_date` | `YYYY-MM-DD \| null` | 이전 시험 날짜 |
| `previous_rw_score` | `200–800 \| null` | 이전 RW 점수 |
| `previous_math_score` | `200–800 \| null` | 이전 Math 점수 |

---

## 6. 메타 정보

| 필드 | 타입 | 내용 |
|------|------|------|
| `id` | UUID | 결과 레코드 고유 ID |
| `test_id` | string | 테스트 식별자 (예: `diagnostic-test-1`) |
| `test_version_id` | UUID \| null | 테스트 버전 ID |
| `created_at` | ISO timestamp | 레코드 생성 시각 |
| `slack_sent_at` | ISO timestamp \| null | Slack 알림 발송 시각 |
| `slack_error` | string \| null | Slack 알림 실패 시 에러 메시지 |

---

## 중복 제출 방지 규칙

- 동일 `token_id`로 결과가 이미 존재하면 기존 `resultId` 반환 (재삽입 없음)
- 동일 `student_name` + `test_id`로 30일 이내 결과가 있으면 차단
- 토큰 없는 경우: 동일 `student_email` + `test_id`로 10분 이내 재제출 차단

---

## 분석 가능 항목 예시

- **취약 문항 탐지**: 오답 + 긴 `question_times` + 낮은 `confidence_levels` 조합
- **어휘 약점**: `saved_words` 집계로 자주 모르는 단어 파악
- **망설임 패턴**: `flagged_questions`와 오답률 교차 분석
- **성적 향상도**: `previous_rw_score` / `previous_math_score` vs 진단 결과 비교

---

_소스: `src/types/diagnosis.ts`, `src/app/api/diagnosis/submit/route.ts`_
_updated: 2026-05-21_
