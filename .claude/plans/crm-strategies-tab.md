# CRM 전략 탭 — 스펙

## 배경
현재 `retry_strategies` 테이블과 `RetryKanban`이 재시도 세일즈에만 전략 개념을 지원한다.
사용자 요청: 최초 세일즈 / 재시도 세일즈 모두 "전략"을 선택·기록할 수 있어야 하며,
전략을 일원화해서 관리하는 "전략" 탭을 CRM에 추가한다.

---

## DB 변경

### REQ-1 `retry_strategies` 테이블에 `type` 컬럼 추가 (MANUAL)
- `type text NOT NULL DEFAULT 'retry' CHECK (type IN ('initial', 'retry'))`
- 기존 레코드는 모두 `'retry'`로 유지됨 (DEFAULT)

### REQ-2 `students` 테이블에 `initial_strategy_id` 컬럼 추가 (MANUAL)
- `initial_strategy_id uuid REFERENCES retry_strategies(id) ON DELETE SET NULL`
- 최초 세일즈 전략 배정을 저장

---

## API 변경

### REQ-3 `GET /api/crm/retry-strategies` — `?type=` 파라미터 추가 (TEST)
- `?type=initial` → initial 전략만
- `?type=retry` → retry 전략만
- 파라미터 없으면 전체 반환

### REQ-4 `POST /api/crm/retry-strategies` — `type` 필드 수신 (TEST)
- body에 `type: 'initial' | 'retry'` 추가 (기본값 `'retry'`)

### REQ-5 `PATCH /api/crm/students/[id]` — `initial_strategy_id` 허용 (TEST)
- 이미 있는 PATCH 라우트에 `initial_strategy_id` 필드 허용

---

## UI 변경

### REQ-6 CRM 페이지에 "전략" 탭 추가 (BROWSER)
- 탭 순서: `최초 세일즈 | 수업 중 | 재시도 세일즈 | 전략 | 전체 리드풀 | 통계`
- "전략" 탭 내부 구조:
  - 상단: `초 세일즈 전략` / `재시도 세일즈 전략` 섹션 구분
  - 각 섹션: 전략 목록 (이름, 배정 학생 수) + 새 전략 추가 버튼
  - 전략 클릭 → 해당 전략의 학생 목록 패널 표시

### REQ-7 RetryKanban — 전략 목록을 `type=retry` 필터로 조회 (TEST)
- 기존 동작 유지, fetch URL에 `?type=retry` 추가

### REQ-8 StudentDetailPanel — 최초 세일즈 전략 선택 UI (BROWSER)
- "학생 정보" 섹션에 `최초 세일즈 전략` 드롭다운 추가
- initial 전략 목록 불러와서 선택 → PATCH `initial_strategy_id`
- 비어 있으면 "전략 없음"

### REQ-9 SalesKanban StudentCard — 전략 배지 표시 (BROWSER)
- 학생 카드에 `initial_strategy_id`가 있으면 전략 이름 배지 노출 (작은 텍스트)

---

## 제외 범위
- 전략별 상세 분석/통계
- 전략 간 학생 이동 드래그앤드롭
- 재시도 칸반의 드래그 동작 변경

---

## 구현 순서
1. DB 마이그레이션 (REQ-1, REQ-2) — Supabase SQL 실행
2. API 수정 (REQ-3, REQ-4, REQ-5)
3. `StrategiesTab` 컴포넌트 신규 작성 (REQ-6)
4. RetryKanban 필터 적용 (REQ-7)
5. StudentDetailPanel 드롭다운 (REQ-8)
6. StudentCard 배지 (REQ-9)
