---
name: student-availability
description: 학생 이름을 입력받아 SFv2 Supabase의 scheduled_availability_slots 테이블에서 코치룸 가능 시간을 조회하고, America/Los_Angeles → KST로 변환해 복사하기 좋은 줄글로 출력한다. "학생 가능 시간 알려줘", "코치룸 시간 뽑아줘", "availability 조회", "수업 가능 시간" 등의 표현이 나오면 이 스킬을 사용한다.
---

# Student Availability

학생 이름을 받아 SFv2 Supabase `scheduled_availability_slots` 테이블을 조회하고, LA 타임존(PDT/PST)을 KST로 변환해 줄글로 출력한다.

## 실행

```bash
python3 .claude/skills/student-availability/scripts/student-availability.py "학생 이름"
```

이름을 인자로 넘기면 스크립트가 DB 조회 → KST 변환 → 줄글 출력까지 모두 처리한다.

## 출력 예시

```
Lauren Park 학생 코치룸 가능 시간
학생 시간대: America/New_York (EDT, UTC-4)
기간: 2026-10-19 ~ 2026-11-30

화요일 05:30 ~ 11:00 (학생 시간: 월요일 16:30 ~ 22:00)
수요일 07:00 ~ 11:00 (학생 시간: 화요일 18:00 ~ 22:00)
```

DST 전환이 기간에 걸치면 아래처럼 구간을 나눠 출력한다.

```
[기간: 2026-10-19 ~ 2026-10-31 · EDT]
화요일 05:30 ~ 11:00 (학생 시간: 월요일 16:30 ~ 22:00)

[기간: 2026-11-01 ~ 2026-11-30 · EST]
화요일 06:30 ~ 12:00 (학생 시간: 월요일 16:30 ~ 22:00)
```

```
코치 준비 링크: https://tutoring.superfastsat.com/coach-prep/{CRM students.id}
```

- 코치 준비 링크는 CRM `students` 행을 `sfv2_profile_id` → 이름 순으로 찾아 생성 (CRM 패널의 "코치 준비" 버튼과 동일한 `/coach-prep/{id}` 경로). 못 찾으면 안내 문구 출력

- 학생 시간대와 기간은 한 번만 표기하고, 각 줄은 KST 먼저, 괄호 안에 학생 현지 요일·시간을 표기
- 슬롯마다 기간이 다르면 `[기간: ...]` 블록으로 나눠 출력

## 참고

- 슬롯의 `weekday`·시간은 `tz`(보통 `America/Los_Angeles`) 로컬 기준이고, KST로 변환하면 보통 다음날로 넘어감
- 변환은 `zoneinfo`(IANA tz)로 날짜별 UTC 오프셋을 계산. 유효 기간 안에 DST 전환(예: 11/1)이 있으면 전환일 기준으로 기간을 나눠 구간마다 KST를 따로 출력 (`[기간: ... · EDT]` / `[기간: ... · EST]`). 학생 현지 시간은 그대로이고 KST만 1시간 이동
- 학생이 입력한 기간(`effective_from` ~ `effective_until`)까지만 표시. 종료일이 없는 슬롯은 시작일 기준 한 구간만 출력하고 이후 DST 전환은 추정해서 나누지 않음
- 이름 부분 일치 검색 지원 (예: "Chloe" 만 입력해도 됨)
- 스크립트는 `.env.local`에서 `SUPERFASTSAT_V2_SUPABASE_URL`과 `SUPERFASTSAT_V2_SUPABASE_SERVICE_KEY`를 자동으로 읽음 (코치 준비 링크 조회에는 `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`도 사용)
