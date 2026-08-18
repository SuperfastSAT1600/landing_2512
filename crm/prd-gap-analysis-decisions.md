# PRD 빈틈 점검 결과 — 확정 결정사항

SAT Coach Assignment & Sales CRM Dashboard PRD 및 Implementation Plan의 기획 빈틈을 점검하고, 각 항목별로 확정한 결정사항을 정리한 문서입니다.

_작성일: 2026-05-22_

---

## 1. 데이터 모델 정의

### 학생 카드 스키마 — 3계층 구조

**등록 시점 — 매니저 입력 (8개 필드)**

| # | 필드 | 타입 | 필수 여부 | 비고 |
|---|------|------|-----------|------|
| 1 | 학생 이름 | string | 필수 | |
| 2 | 학년 | string | 필수 | 예: 11th |
| 3 | 재학 유형 | enum | 필수 | 미국 현지 / 한국 특례 / 국제학교 / 기타 |
| 4 | 학부모 연락처 | string | 필수 | 전화번호 |
| 5 | 직전 SAT 점수 | number × 2 | 필수 | RW / Math 각각, "미응시" 허용 |
| 6 | 목표 점수 | number | 선택 | 80%가 등록 시 제공, 미정 허용 |
| 7 | 목표 시험 일자 | date | 필수 | |
| 8 | 희망 과목 | enum | 필수 | RW / Math / Both |

**학부모 입력 — 마이페이지에서 직접**

| 필드 | 타입 | 시점 |
|------|------|------|
| 패스코드 | hash | 최초 접속 시 설정 |
| 학부모 타임존 | timezone | 스케줄 입력 직전 선택 |
| 첫 수업(OT) 희망 일시 | datetime (UTC) | 스케줄 입력 시 |
| 장기 정규 스케줄 | JSON (요일/시간 그리드) | 스케줄 입력 시 |

**매니저 누적 — 운영 중**

| 필드 | 타입 | 비고 |
|------|------|------|
| 진단테스트 결과 | FK → diagnostic_test_results | 총점, 영역별 점수, 취약 영역 요약, 어휘 약점 수준 |
| 상담 타임라인 | JSON array | 원본 메모 + AI 가공본 + 코치 전달용 교육 이력 |
| 퍼널 단계 | enum | 세일즈 퍼널 단계 (아래 2번 참조) |
| 이탈 태그 | string | null 가능 |
| 이탈 분류 | enum | 잠재 / 완전 종료, null 가능 |
| 배정 코치 | FK → coaches.slug | student_coach_assignments로 관리 |
| 코치 응답 상태 | enum | 대기 / 수락 / 거절 / 고민 |

---

## 2. 세일즈 퍼널 — 두 개의 칸반 보드

### 칸반 보드 A: 세일즈 퍼널 (결제까지)

운영담당자 실제 프로세스 기반. 진단테스트 시점이 세일즈 콜 전/후로 분기.

| # | 단계 | 이탈 가능 |
|---|------|-----------|
| 1 | 첫 메시지 발송 | ✓ |
| 2 | 세일즈 콜 예약 확정 후 대기 | ✓ |
| 3a | 세일즈 콜 전 진단테스트 대기 | ✓ |
| 3b | 세일즈 콜 전 진단테스트 제출 완료 | ✓ |
| 4 | 세일즈 콜 완료 | ✓ |
| 5a | 세일즈 콜 후 진단테스트 대기 | ✓ |
| 5b | 세일즈 콜 후 진단테스트 제출 완료 | ✓ |
| 6 | 진단 Report 세일즈 콜 예약 확정 후 대기 | ✓ |
| 7 | 진단 Report 세일즈 콜 완료 | ✓ |
| 8 | 세일즈 진행 중 | ✓ |
| 9 | 결제 완료 | — |

- **분기 처리**: 매니저가 수동으로 카드를 해당 단계로 이동
- **이탈 태그 종류**: 회신 없음 / 노쇼 / 미응시 / 미결제 / 기타(자유 입력)
- **이탈 카드 분류**: 잠재(복귀 가능) / 완전 종료
- **모든 단계에서 이탈 가능**

### 칸반 보드 B: 코치 매칭 프로세스 (결제 완료 후)

결제 완료된 카드만 진입. 이탈 없음 — 매칭될 때까지 진행.

| # | 단계 |
|---|------|
| 1 | 스케줄 입력 대기 |
| 2 | 스케줄 입력 완료 |
| 3 | 코치 제안 발송 |
| 4 | 코치 응답 대기 |
| 5 | 매칭 확정 |

### 학부모 마이페이지 노출 매핑 (4단계)

| 학부모 노출 | 매핑 원본 |
|-------------|-----------|
| 신규 | 세일즈 퍼널 1~9 |
| 스케줄 | 매칭 보드 1~2 |
| 매칭중 | 매칭 보드 3~4 |
| 완료 | 매칭 보드 5 |

---

## 3. 코치 매칭 분기 처리

| 항목 | 결정 |
|------|------|
| 제안 방식 | 한 학생에 대해 **여러 코치에게 동시 발송** |
| 코치 오퍼 뷰 표시 | "현재 N명의 코치가 검토 중입니다" 노출 |
| 확정 로직 | **먼저 수락한 코치가 자동 확정** |
| 확정 후 처리 | 나머지 코치 오퍼 즉시 자동 마감 (링크 접속 시 "이미 매칭 완료" 안내) |
| 거절 시 | 해당 코치만 상태 변경, 나머지 오퍼 유지 |
| 고민(조율 문의) 시 | 대시보드에 "고민" 상태 표시, 매니저가 iMessage/카톡에서 별도 조율 |
| 전원 거절/만료 시 | 매니저가 수동으로 새 코치 선정 후 재발송 (보드 3번으로 복귀) |

### 코치에게 보내는 iMessage 흐름

```
iMessage: "선생님, 배코치입니다! 이런 학생 수업 가능하시겠어요? [링크]"
→ 링크(CoachOffer 뷰): 학생 정보 + 스케줄 캘린더 + 수락/거절/고민 버튼
```

메시지 본문에는 상세 정보 없음. 모든 정보는 링크 안에서 확인.

---

## 4. 데이터 저장 및 동기화

| 항목 | 결정 |
|------|------|
| 저장소 | **Supabase** |
| 동기화 | **Supabase Realtime** — 실시간 동기화 |
| 매니저 → 학부모 | 상담 메모 승인 즉시 학부모 마이페이지에 반영 |
| 코치 → 매니저 | 코치 수락 즉시 대시보드 + 다른 코치 오퍼 뷰 마감 처리 |

---

## 5. 타임존 처리 로직

| 항목 | 결정 |
|------|------|
| 학부모 타임존 | 스케줄 입력 직전에 선택 UI 노출 |
| 코치 타임존 | 오퍼 뷰 진입 시 본인이 직접 선택 |
| 내부 저장 | 모든 시간을 **UTC**로 저장 |
| 표시 | 각 사용자 타임존 + DST 규칙으로 변환하여 표시 |
| DST 처리 | 기본 적용. `Intl.DateTimeFormat` 또는 `date-fns-tz` 활용 |
| 엣지 케이스 | 장기 정규 스케줄이 DST 전환 시점을 걸칠 경우, 캘린더 뷰에서 해당 주 시간 변동 표시 |

---

## 6. coaches 테이블 및 CRM 신규 테이블

### 기존 coaches 테이블 (변경 없음)

CRM 매칭에 사용할 필드: `slug`(PK), `name`, `subjects`, `is_active`, `photo`

코치 타임존은 테이블에 저장하지 않음 — 오퍼 뷰에서 매번 직접 선택.

### CRM 신규 테이블 ① — `students`

```sql
students
  id              UUID (PK)
  name            string
  grade           string
  school_type     enum (domestic_us / korean_special / international / other)
  parent_phone    string
  previous_rw_score       number | null
  previous_math_score     number | null
  previous_score_status   enum (scored / never_taken / dont_remember)
  target_score            number | null
  target_test_date        date
  desired_subjects        enum (RW / Math / Both)
  parent_timezone         timezone | null
  ot_datetime             timestamp (UTC) | null
  weekly_schedule         JSONB | null
  passcode_hash           string | null
  funnel_stage            enum
  churn_tag               string | null
  churn_type              enum (potential / closed) | null
  diagnostic_result_id    UUID | null → diagnostic_test_results.id
  created_at              timestamp
```

### CRM 신규 테이블 ② — `student_coach_assignments`

```sql
student_coach_assignments
  id              UUID (PK)
  student_id      UUID → students.id
  coach_slug      string → coaches.slug
  status          enum (pending / accepted / rejected / considering)
  reject_reason   string | null
  deadline        timestamp (UTC)
  coach_timezone  timezone | null
  assigned_at     timestamp
  responded_at    timestamp | null
  assigned_by     string
  is_confirmed    boolean (먼저 수락한 코치만 true)
```

### 기존 테이블 수정

- `diagnostic_test_results`에 `student_id` FK 추가 → 학생 이력 추적 연결

---

## 7. 학부모 패스코드 플로우

| 항목 | 결정 |
|------|------|
| 최초 설정 | 학부모가 마이페이지 링크 첫 접속 시 6자리 패스코드 직접 생성 |
| 재접속 | 패스코드 입력 → 인증 후 진입 |
| 분실 시 | 학부모 → 매니저 연락 → 매니저가 대시보드에서 리셋 → 학부모 재설정 |
| 저장 | Supabase에 **해시 저장** (`passcode_hash`), 평문 저장 안 함 |

---

## 8. AI 케어 메시지 입출력 범위

### 구현 방식

**실제 LLM API 호출** (Claude API)

### AI 변환 시 3가지 역할

| 역할 | 내용 | 노출 대상 |
|------|------|-----------|
| ① 순화 | 비즈니스/부정적 표현을 정중한 경어체로 변환 | 학부모 |
| ② 삭제 | 민감 내용 자동 제거 | 누구에게도 노출 안 됨 (매니저만 원본 확인) |
| ③ 분리 | 이전 교육 이력/특이사항을 감지하여 별도 추출 | 코치 |

### 자동 삭제 대상 (학부모·코치 모두 비노출)

- 가격/비용 관련 불만 ("돈 아까워함", "할인 요청")
- 학생/학부모 태도 관련 부정 평가 ("태도 안 좋음", "비협조적")
- 내부 운영 판단 메모 ("클로징 가능성 낮음", "업셀 시도")

### 코치에게 전달되는 분리 항목

- 이전 교육 서비스 트러블 이력 → 코치 오퍼 뷰 "이전 교육 이력" 항목으로 노출

### 매니저 검토 플로우

```
매니저 원본 메모 입력
  → [AI 케어 메시지로 변환] 클릭
  → LLM이 3가지 역할 수행 (순화 / 삭제 / 분리)
  → 매니저가 3가지 결과 각각 확인·수정
  → 승인 시 학부모 타임라인에 가공본 노출
  → 코치 오퍼 뷰에 교육 이력 항목 노출
```

### 저장

원본 메모, AI 가공본(학부모용), 분리된 교육 이력(코치용) 모두 별도 저장.

---

## 9. 코치 오퍼 뷰 — 학생 정보 노출 범위

### 코치에게 보여주는 것

- 학생 이름, 학년, 재학 유형, 희망 과목
- 직전 SAT 점수 (RW / Math), 목표 점수, 목표 시험 일자
- 진단테스트 요약 (총점, 영역별 점수, 취약 영역 요약, 어휘 약점 수준)
- 스케줄 캘린더 (첫 수업 + 장기 정규, 코치 타임존으로 자동 변환)
- 이전 교육 이력/특이사항 (AI가 상담 메모에서 분리 추출)
- 검토 중인 코치 수 ("N명 검토 중")
- 응답 데드라인 + 카운트다운 타이머

### 코치에게 보여주지 않는 것

- 학부모 연락처
- 상담 타임라인 (원본/가공본 모두)
- 퍼널 단계, 이탈 태그
- 결제 정보
- 가격/비용 관련 내용

---

## 부록: 진단테스트 데이터 — 코치 오퍼 뷰 노출 항목

`diagnostic_test_results` 테이블에서 코치에게 노출하는 가공 데이터:

| 항목 | 원본 필드 | 가공 방식 |
|------|-----------|-----------|
| 진단테스트 총점 | `answers` + 정답 키 | 채점 로직으로 산출 |
| 영역별 점수 | `answers` + 문항 메타데이터 | 영역별 그루핑 후 산출 |
| 취약 영역 요약 | `answers` + `question_times` + `confidence_levels` | 오답 + 긴 소요시간 + 낮은 자신감 교차 분석 |
| 어휘 약점 수준 | `saved_words` | 저장 단어 수 및 빈도 집계 |

코치에게 노출하지 않는 원시 데이터: 문항별 소요시간 상세, flagged_questions 원본, confidence_levels 원시값, 메타 정보 (token, slack 알림 등)
