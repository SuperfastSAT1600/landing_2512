# 직전 점수 기반 진단테스트 Easy/Hard 모드 자동 변환 시스템 설계 문서

## 1. 개요 (Goal)
현재 단일 버전(`is_current = true`인 1개의 버전)으로 제공되는 진단 테스트를 개선하여, **학생이 직접 입력한 직전 SAT 점수(Previous Score)를 기준으로 Easy Mode와 Hard Mode 테스트를 자동 배정**하는 시스템을 구축합니다. 이를 통해 학생 수준에 맞는 보다 정확한 진단과 맞춤형 결과를 제공하는 것이 목적입니다.

---

## 2. User Review Required / Open Questions
> [!IMPORTANT]
> 본 기획을 실제 코드로 구현하기 전, 아래 항목들에 대한 관리자(사용자)의 결정이 필요합니다.

1. **점수 기준 (Threshold)**: Hard Mode로 배정하기 위한 직전 점수의 기준점은 몇 점으로 설정할 것인가요? (예: 1200점 미만은 Easy, 1200점 이상은 Hard)
2. **점수 입력 시점**: 학생이 점수를 어느 단계에서 입력하게 할 것인가요?
   - A: 랜딩 페이지에서 상담/진단 신청서(`diagnostic_applications`)를 제출할 때
   - B: 발급받은 토큰으로 `/diagnosis` 페이지에 진입하여 테스트를 시작하기 직전 모달창에서
3. **과거 데이터 호환성**: 기존에 생성된 `diagnostic_test_versions` (단일 버전)은 어떤 난이도(Easy/Hard)로 취급할 것인가요?
4. **직전 점수가 없는 경우(No previous score)**: SAT 응시 경험이 없는 학생(점수 없음)은 기본적으로 Easy Mode로 배정하면 될까요?

---

## 3. 시스템 아키텍처 및 데이터베이스 변경안

최근 생성된 **SQLite 문제 은행(`blog_database/sat_questions.db`)**을 마스터 데이터 소스로 활용하여, 수동으로 전체 문제를 업로드하던 기존 방식에서 **조건 기반 동적 추출 방식**으로 전환합니다.

### 3.1. 문제 은행 연동 (SQLite 활용)

새로운 시스템은 `sat_questions.db`를 활용하여 Easy 모드와 Hard 모드의 문제를 구성합니다.
- **Easy 모드 생성 규칙 (예시)**: `WHERE difficulty IN ('Easy', 'Medium')` 기반으로 스킬별 배분 추출
- **Hard 모드 생성 규칙 (예시)**: `WHERE difficulty IN ('Medium', 'Hard')` 기반으로 스킬별 배분 추출
- **구현 방식 선택**:
  1. **정적 주입 (A안)**: Python 스크립트(`build_diagnostic_sets.py` 등)를 통해 1회성으로 Easy/Hard 세트를 추출하여 Supabase의 `diagnostic_test_versions`에 주입 후 사용. (서버/클라이언트 코드 변경 최소화)
  2. **동적 추출 (B안)**: 테스트 시작 시 API가 실시간으로 SQLite DB를 쿼리하여 난이도에 맞는 문제를 랜덤 추출해 제공. (매번 다른 문제 제공 가능)

### 3.2. DB 스키마 수정 (`Supabase`)

**1. `diagnostic_test_versions` 테이블 변경 (정적 주입 방식 선택 시)**
- **추가 컬럼**: `difficulty` (VARCHAR, 예: `'easy'`, `'hard'`, `'standard'`)
- **제약조건 변경**: 기존 `is_current`의 UNIQUE 제약조건을 삭제하고, `(difficulty, is_current)`의 조합이 UNIQUE 하도록 부분 인덱스를 생성하여 난이도별 1개 버전을 활성화.

**2. `diagnostic_access_tokens` / `diagnostic_test_results` 테이블 변경**
- **추가 컬럼**: `previous_score` (INTEGER, nullable) - 학생이 입력한 직전 점수
- **추가 컬럼**: `assigned_difficulty` (VARCHAR, nullable) - 배정된 난이도 기록용

### 3.3. 서버 API 로직 변경안 (`src/app/api/`)

**1. 테스트 배정 API (`/api/diagnosis/start` 또는 토큰 검증 API)**
- **입력 (Request)**: `token`, `previous_score`
- **처리 로직**:
  1. `previous_score`가 기준점(예: 1200) 이상이면 `target_difficulty = 'hard'`, 미만이거나 없으면 `'easy'`로 판별.
  2. Supabase `diagnostic_test_versions` 테이블에서 `is_current = true` AND `difficulty = target_difficulty` 인 버전 조회 (A안) **또는** SQLite 기반 API를 호출하여 즉석에서 문제 세트 받아오기 (B안).
  3. 토큰 상태 업데이트 (`test_version_id` 매핑).
- **반환 (Response)**: 배정된 테스트 난이도의 문제 데이터.

**2. 어드민 API (`/api/admin/diagnosis/versions`)**
- 관리자가 새로운 테스트 버전을 생성하거나, 스크립트가 버전을 주입할 때 난이도(`difficulty`)를 지정할 수 있도록 API 수정.
- `is_current`를 `true`로 설정 시, 동일 `difficulty`를 가진 기존 버전은 `false`로 자동 변경.

---

## 4. 프론트엔드(Client) 변경안

### 4.1. 사용자 화면 (`src/app/diagnosis/page.tsx`)
1. **점수 입력 UI 추가**:
   - 테스트 시작 전 이름/이메일을 입력하는 화면(또는 안내 모달)에 **"직전 SAT 점수 (선택)"** 입력 필드를 추가합니다.
   - 드롭다운(예: '없음', '1000점 이하', '1000~1200', '1200 이상') 또는 숫자 직접 입력 방식을 사용합니다.
2. **상태 관리**:
   - 입력받은 `previous_score`를 상태로 관리하고, 테스트 시작 버튼 클릭 시 API 페이로드에 포함하여 전송합니다.

### 4.2. 관리자 화면 (`src/app/admin/diagnosis/...`)
1. **테스트 버전 관리 페이지**:
   - 테스트 버전을 목록에서 볼 때 '난이도(Easy/Hard)' 뱃지를 표시합니다.
   - 새 버전을 업로드/생성할 때 난이도를 선택하는 Radio Button 또는 Select UI를 추가합니다.
2. **테스트 결과 조회 페이지**:
   - 학생의 테스트 결과 목록(`diagnostic_test_results`)에 '직전 점수' 및 '응시한 난이도(Easy/Hard)'를 표시하여 코치가 참고할 수 있게 합니다.

---

## 5. 단계별 구현 계획 (Implementation Steps)

1. **Phase 1: DB 마이그레이션**
   - Supabase SQL Editor를 통해 `diagnostic_test_versions`에 `difficulty` 컬럼 추가.
   - 기존 데이터를 `difficulty = 'standard'` 또는 `'easy'`로 일괄 업데이트.
   - `diagnostic_test_results`에 `previous_score` 컬럼 추가.

2. **Phase 2: 어드민 기능 업데이트**
   - 관리자 페이지에서 Easy/Hard 버전 테스트를 각각 등록하고 활성화(`is_current`)할 수 있도록 UI와 API 수정.

3. **Phase 3: 클라이언트 및 테스트 배정 로직 구현**
   - `/diagnosis` 페이지 테스트 진입 폼에 직전 점수 입력 필드 추가.
   - 테스트 시작 시 API에서 점수를 기반으로 분기 처리하여 알맞은 난이도의 `test_version_id`를 매핑하고 해당 문제를 반환하도록 구현.

4. **Phase 4: 결과 및 보고서 연동**
   - 진단 결과 보고서 생성 시, 해당 테스트가 Easy인지 Hard인지에 따라 다른 벤치마크나 평가 코멘트가 나오도록(필요한 경우) 리포트 렌더링 로직(`report-data.ts` 등) 업데이트.

---

## 6. Verification Plan (검증 계획)

### Manual Verification
- [ ] **어드민 테스트**: 관리자 페이지에서 Easy용 버전과 Hard용 버전을 각각 업로드하고 모두 현재 활성(`is_current`) 상태로 설정할 수 있는지 확인.
- [ ] **라우팅 테스트 (Easy)**: 점수를 낮게(예: 1000점) 입력하거나 입력하지 않고 테스트를 시작했을 때 Easy 버전의 문제(방금 업로드한 Easy ID)가 렌더링되는지 확인.
- [ ] **라우팅 테스트 (Hard)**: 점수를 높게(예: 1400점) 입력하고 시작했을 때 Hard 버전의 문제가 렌더링되는지 확인.
- [ ] **결과 확인**: 제출 완료 후 어드민 대시보드와 리포트 화면에 학생의 직전 점수와 응시 난이도가 정상적으로 표기되는지 확인.
