# CRM 5탭 네비게이션 재구조화

## Goal
현재 단일 페이지 CRM을 5개 탭으로 분리한다.
탭: [최초 세일즈] [수업 중] [재시도 세일즈] [전체 리드풀] [통계]

---

## REQ-1: 탭 네비게이션 (BROWSER)
- CRM 상단에 5개 탭 버튼 배치
- 활성 탭 강조 (underline 또는 bg 변경)
- URL query param `?tab=sales|enrolled|retry|pool|stats` 으로 상태 유지
- 새로고침해도 탭 유지

## REQ-2: [최초 세일즈] 탭 (BROWSER)
- 기존 SalesKanban 그대로 유지
- 기존 검색 + 새 학생 추가 버튼 그대로

## REQ-3: [수업 중] 탭 (BROWSER)
- lead_status = 'enrolled' 학생 목록 표시
- 이름 검색 가능
- 카드 클릭 시 StudentDetailPanel 열림
- 간단한 카드 리스트 (칸반 불필요)

## REQ-4: [재시도 세일즈] 탭 (BROWSER)

### 전략(Strategy) 관리
- 화면 좌측에 전략 목록 패널
- "새 전략 만들기" 버튼 → 이름 입력 인라인 또는 모달 → 생성
- 전략 삭제 버튼 (확인 후 삭제, 해당 전략 학생은 리드풀로 복귀)
- 전략 선택 시 해당 전략의 칸반 표시

### 재시도 칸반 (4단계)
단계: 연락 시도 → 상담 중 → 제안 완료 → 결제 완료
- 기존 SalesKanban 재활용 (단계만 다르게)
- 전략 내에서 드래그앤드롭으로 단계 이동
- 학생 카드 클릭 → StudentDetailPanel

### 리드 추가
- 각 전략에 "리드 추가" 버튼 → 리드풀에서 이름 검색 → 선택하여 추가
- 추가된 학생: lead_status 변경 없음, retry_strategy_id + retry_stage 설정

## REQ-5: [전체 리드풀] 탭 (BROWSER)
- 기존 LeadPool 그대로 유지

## REQ-6: [통계] 탭 (BROWSER)
- 기본 통계: 단계별 학생 수, 이번 달 신규 인입, 결제 전환율
- Phase 1: 간단한 숫자 카드만 표시 (차트는 추후)

---

## DB Changes (Migration 039)

```sql
-- 재시도 전략 테이블
CREATE TABLE retry_strategies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 학생에 재시도 세일즈 필드 추가
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS retry_strategy_id UUID REFERENCES retry_strategies(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS retry_stage TEXT CHECK (
    retry_stage IS NULL OR
    retry_stage IN ('연락 시도', '상담 중', '제안 완료', '결제 완료')
  );
```

---

## API Endpoints

| Method | Path | 설명 |
|--------|------|------|
| GET | /api/crm/retry-strategies | 전략 목록 |
| POST | /api/crm/retry-strategies | 전략 생성 |
| DELETE | /api/crm/retry-strategies/[id] | 전략 삭제 |
| POST | /api/crm/retry-strategies/[id]/students | 학생 추가 |
| PATCH | /api/crm/students/[id] | retry_stage 업데이트 (기존 PATCH 재활용) |

---

## File Plan

```
src/app/admin/crm/
  page.tsx                          ← 탭 라우팅 추가
  components/
    CrmTabNav.tsx                   ← 새로 생성: 탭 네비게이션
    EnrolledList.tsx                ← 새로 생성: 수업 중 탭
    RetryKanban.tsx                 ← 새로 생성: 재시도 세일즈 탭
    RetryStrategyPanel.tsx          ← 새로 생성: 전략 목록 사이드바
    CrmStats.tsx                    ← 새로 생성: 통계 탭
    (기존 SalesKanban, LeadPool 유지)

src/app/api/crm/
  retry-strategies/
    route.ts                        ← GET/POST
    [id]/
      route.ts                      ← DELETE
      students/route.ts             ← POST (학생 추가)

supabase/migrations/039_retry_strategies.sql
```

---

## Implementation Order
1. Migration 039 작성
2. API 엔드포인트 (retry-strategies)
3. CrmTabNav 컴포넌트
4. page.tsx 탭 라우팅
5. EnrolledList (수업 중)
6. RetryStrategyPanel + RetryKanban (재시도 세일즈)
7. CrmStats (통계 — 기본 숫자만)
