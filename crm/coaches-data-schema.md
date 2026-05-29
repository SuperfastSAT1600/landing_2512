# 코치 사이드 — 수집 데이터 스키마

코치 관련 데이터 전체 목록. 학생-코치 배정 시스템 설계 기준 문서.

---

## 1. 코치 프로필 (`coaches` 테이블 / Supabase)

코치 1인당 1개 레코드. Admin에서 CRUD.

| 필드 | 타입 | 내용 |
|------|------|------|
| `slug` | string (PK) | URL 식별자 (예: `john-doe`) |
| `name` | string | 코치 이름 |
| `photo` | string | 프로필 사진 URL |
| `bio` | string | 소개글 |
| `intro_post_slug` | string | 소개 블로그 포스트 slug |
| `curriculum_post_slug` | string | 커리큘럼 블로그 포스트 slug |
| `is_active` | boolean | 활성 여부 (false면 공개 페이지에 미노출) |
| `reel_urls` | `string[]` | 인스타그램 릴스 URL 배열 |
| `subjects` | `string[]` | 담당 과목 (`SAT`, `AP` 중 복수 가능) |
| `created_at` | ISO timestamp | 레코드 생성 시각 |

**비고**: `slug`가 PK이므로 중복 불가. 과목은 `SAT`/`AP`만 허용.

---

## 2. 리뷰 (`reviews.json` / 파일 기반)

학생이 작성한 수강 후기. 코치 페이지와 연결.

| 필드 | 타입 | 내용 |
|------|------|------|
| `id` | UUID | 리뷰 고유 ID |
| `title` | string | 리뷰 제목 |
| `category` | string | 카테고리 (예: `SAT`, `AP`) |
| `author` | string | 작성자 이름 |
| `authorType` | string | 작성자 유형 (예: `Student`, `Parent`) |
| `grade` | string | 학년 |
| `rating` | `1–5` | 별점 |
| `content` | string | 리뷰 본문 |
| `date` | `YYYY.MM.DD` | 작성일 |
| `marketingConsent` | boolean | 마케팅 활용 동의 (필수) |
| `rewardType` | string | 리워드 유형 |
| `contact` | string | 연락처 |
| `status` | `pending \| published \| hidden` | 노출 상태 |
| `isFeatured` | boolean | 메인 히어로 노출 여부 |
| `coachSlug` | string \| undefined | 연결된 코치 slug (코치별 페이지 필터링용) |

**비고**: 현재 파일 기반 저장. DB 이관 시 Supabase `reviews` 테이블로 전환 필요.

---

## 3. 진단 상담 신청 (`diagnostic_applications` 테이블 / Supabase)

진단 테스트 이후 상담 신청 폼 제출 데이터. 리드 발생 지점.

| 필드 | 타입 | 내용 |
|------|------|------|
| `id` | UUID | 신청 고유 ID |
| `name` | string | 신청자 이름 |
| `phone` | string | 전화번호 |
| `preferred_date` | `YYYY-MM-DD` | 희망 상담 날짜 |
| `preferred_time` | string | 희망 상담 시간 (KST, 예: `오후 3:00`) |
| `status` | `pending` | 처리 상태 (현재 `pending` 고정) |
| `created_at` | ISO timestamp | 신청 시각 |

**알림 채널**: 신청 시 이메일 + Slack + Meta CAPI(Lead 이벤트) 동시 발송.

---

## 현재 데이터 관계도

```
coaches (Supabase)
  └── slug ──────────────┐
                         ↓
reviews.json            reviews[].coachSlug  (코치 페이지 연결)

diagnostic_test_results (Supabase)   ← 학생 테스트 데이터
diagnostic_applications (Supabase)   ← 상담 신청 (리드)

※ 현재 coaches ↔ diagnostic_test_results/applications 간 직접 FK 없음
```

---

## 학생-코치 배정 시스템 설계 시 고려사항

### 현재 누락된 연결 고리

1. `diagnostic_applications`에 담당 코치 FK 없음
2. `diagnostic_test_results`에 담당 코치 FK 없음
3. 학생 엔티티 테이블 자체가 없음 (이름/이메일이 각 테이블에 분산)

### 배정 시스템 신규 테이블 후보

```
students
  id (UUID, PK)
  name
  email
  phone
  created_at

student_coach_assignments
  id (UUID, PK)
  student_id → students.id
  coach_slug → coaches.slug
  assigned_at
  assigned_by (admin)
  status (active | ended)
  notes

※ diagnostic_applications, diagnostic_test_results에
  student_id FK를 추가하면 전체 이력 추적 가능
```

### 코치별로 집계 가능한 데이터 (배정 후)
- 담당 학생 수 및 목록
- 학생별 진단 결과 (취약 스킬, 점수 추이)
- 학생별 자신감 / 플래그 / 모르는 단어 패턴
- 상담 신청일 → 배정일 → 수업 시작일 리드타임

---

_소스: `src/lib/coaches-data.ts`, `src/lib/reviews-data.ts`, `src/app/api/diagnosis/apply/route.ts`_
_updated: 2026-05-21_
