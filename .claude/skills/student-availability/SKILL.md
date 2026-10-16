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
Chloe Koo 학생 코치룸 가능 시간 (KST 기준)

월요일 12:00 ~ 14:00 (2026-09-10~)
화요일 12:00 ~ 14:00 (2026-09-10~)
수요일 11:00 ~ 13:00 (2026-09-10~)
목요일 11:00 ~ 13:00 (2026-09-10~)
금요일 11:00 ~ 13:00 (2026-09-10~)
토요일 11:00 ~ 13:00 (2026-09-10~)
일요일 11:00 ~ 13:00 (2026-09-10~)
```

## 참고

- 슬롯의 `weekday`·시간은 `tz`(보통 `America/Los_Angeles`) 로컬 기준이고, KST로 변환하면 보통 다음날로 넘어감
- 10월까지는 PDT(UTC-7, diff +16h), 11월 첫째 일요일 이후는 PST(UTC-8, diff +17h)로 자동 처리
- 이름 부분 일치 검색 지원 (예: "Chloe" 만 입력해도 됨)
- 스크립트는 `.env.local`에서 `SUPERFASTSAT_V2_SUPABASE_URL`과 `SUPERFASTSAT_V2_SUPABASE_SERVICE_KEY`를 자동으로 읽음
