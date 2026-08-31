# IntelligentFunctions 세일즈 콜 데이터셋 파이프라인

## Overview

`call_transcripts`에 쌓인 세일즈 상담 전사를 IntelligentFunctions의 **external dataset**으로
내보내 전환 예측 pack을 학습시킨다. 마이그레이션 119가 전사를 보관하기 시작한 이유가
"전환 예측 모델 학습 코퍼스의 유일한 원천"이므로, 이 파이프라인이 그 코퍼스의 소비처다.

**external dataset을 쓰는 이유.** `dataset.import()`는 행을 intfunc이 보관한다.
`externalDataset()`은 스키마 선언만 남기고, Parquet은 서명된 스토리지 URL로 직접 올라가며
(바이트가 그들의 API를 통과하지 않는다), 잡이 끝나면 성공·실패·취소 어느 쪽이든 업로드가
파기되고 `deletionReceipt`가 남는다. 이 데이터는 미성년자·학부모 대화 원문이고,
119/058 마이그레이션이 이미 "클라이언트 노출 경로를 만들지 않는다"고 못박은 자산이다.
제3자가 원문을 보관하지 않는 경로는 external dataset 뿐이다.

**한 학생 = 한 행인 이유.** pack의 corpus 선언은 경로 **하나**를 가리킨다
(`corpus: { text: "transcript", label: "outcome" }`). 그러므로 한 학생의 여러 통화는
하나의 텍스트 컬럼 안에 들어가야 하고, 통화 경계는 본문 안의 구분자 헤더로 표시한다.

**두 가지 위험을 코드로 막는다.**
1. *라벨 누출* — 결제·이탈이 확정된 뒤의 통화에는 결과가 그대로 등장한다. 그 통화까지
   넣으면 pack은 세일즈 신호가 아니라 결과 발화를 읽는 법을 배운다.
2. *원문 유출* — 이름·전화번호·결제 정보가 담긴 원문이 로컬 `.parquet`으로 디스크에
   떨어지고 외부로 나간다. 비식별은 파일에 쓰이기 **전에** 끝나야 한다.

## Requirements

### REQ-001: 학생 단위로 통화를 하나의 행에 모은다
- **Priority**: Must
- **Description**: `call_transcripts`를 `student_id`로 묶어 학생당 행 하나를 만든다.
  통화는 `recorded_at` 오름차순으로 정렬한다. `recorded_at`이 없는 통화는 `created_at`으로
  폴백하고, 둘 다 없으면 순서를 정할 수 없으므로 맨 뒤에 안정 정렬로 붙인다.
- **Acceptance Criteria**: 학생 3명 · 통화 7건을 넣으면 행 3개가 나오고, 각 행의
  `call_count`가 그 학생의 통화 수와 같다. 통화 순서는 시각 오름차순이다.
- **Verification**: (TEST) `src/lib/intfunc/__tests__/corpus-row.test.ts`

### REQ-002: 통화는 본문 안에서 구분자로 식별된다
- **Priority**: Must
- **Description**: 각 통화 앞에 `=== 통화 {n} · {KST 시각} · {분}분 · {source} ===` 헤더를
  붙여 하나의 `transcript` 텍스트로 합친다. 시각은 KST로 표기한다(상담이 일어난 시간대).
  누락된 메타데이터는 헤더에서 생략하되 통화 번호는 언제나 붙는다.
- **Acceptance Criteria**: 통화 2건을 합치면 헤더가 정확히 2개 나오고 번호가 1, 2다.
  `recorded_at`/`duration_sec`이 없어도 `=== 통화 2 · voip ===` 형태로 렌더된다.
- **Verification**: (TEST) `src/lib/intfunc/__tests__/corpus-row.test.ts`

### REQ-003: 라벨은 확정된 결과에서만 뽑는다
- **Priority**: Must
- **Description**: `students.funnel_stage`가 `'9'`(결제 완료)면 `converted`,
  `'churned'`면 `lost`. 그 외 단계는 아직 진행 중이므로 **행을 만들지 않는다** —
  external dataset은 pack 학습이 목적이고 라벨 없는 행은 학습에 기여하지 않는다.
- **Acceptance Criteria**: `funnel_stage: '4'`인 학생은 출력에 없다. `'9'`는 `converted`,
  `'churned'`는 `lost`로 나온다. 제외된 학생 수가 통계로 보고된다.
- **Verification**: (TEST) `src/lib/intfunc/__tests__/corpus-row.test.ts`

### REQ-004: 결과 확정 이후의 통화는 잘라낸다
- **Priority**: Must
- **Description**: `stage_history`에서 `'9'` 또는 `'churned'`에 진입한 `entered_at`을 찾아
  그 시각 **이후**의 통화를 제외한다. 같은 단계가 여러 번 있으면 가장 이른 진입을 쓴다.
  `stage_history`에 해당 항목이 없으면 `funnel_stage_updated_at`으로, 그것도 없으면
  절단하지 않고 **그 사실을 통계로 보고한다** — 조용히 통과시키면 누출을 못 본 채 학습한다.
- **Acceptance Criteria**: 확정 시각 뒤의 통화만 가진 학생은 행이 만들어지지 않는다.
  절단 근거가 없는 학생 수가 `cutoffUnavailable`로 집계된다.
- **Verification**: (TEST) `src/lib/intfunc/__tests__/corpus-row.test.ts`

### REQ-005: 원문은 디스크에 쓰이기 전에 비식별된다
- **Priority**: Must
- **Description**: 행을 만드는 시점에 전화번호, 이메일, 카드·계좌번호, 그리고 해당 학생·
  학부모의 이름을 마스킹한다. 이름은 `students.name`에서 가져와 성/이름 조합과 호칭
  (`OO 어머니`, `OO 학생`)까지 치환한다. 마스킹은 순수 함수이며 Parquet 작성 경로가
  비식별을 거치지 않은 문자열을 볼 수 없도록 `buildCorpusRow` 내부에서 수행한다.
- **Acceptance Criteria**: `010-1234-5678`, `010 1234 5678`, `01012345678`이 모두
  `[전화번호]`가 된다. 학생 이름이 `[학생]`, 학부모 호칭이 `[학부모]`가 된다.
  이메일·카드번호가 각각 `[이메일]`, `[결제정보]`가 된다.
- **Verification**: (TEST) `src/lib/intfunc/__tests__/redact.test.ts`

### REQ-006: 행을 Parquet으로 쓴다
- **Priority**: Must
- **Description**: `hyparquet-writer`로 평면 텍스트 컬럼만 쓴다(struct 없음).
  컬럼: `student_id`, `transcript`, `outcome`, `grade`, `school_type`,
  `desired_subjects`, `target_score`, `previous_rw_score`, `previous_math_score`,
  `call_count`, `total_duration_sec`.
- **Acceptance Criteria**: 쓴 파일을 `hyparquet`으로 다시 읽으면 넣은 행 수·컬럼 값이
  그대로 나온다(왕복 테스트).
- **Verification**: (TEST) `src/lib/intfunc/__tests__/parquet.test.ts`

### REQ-007: export 스크립트는 dry-run이 기본 안전장치다
- **Priority**: Must
- **Description**: `scripts/export-sales-call-dataset.ts`가 Supabase에서 students와
  call_transcripts를 페이지 단위로 읽어(500행, 1000행 캡 회피) 행을 만들고 Parquet을 쓴다.
  `--dry-run`은 파일을 쓰지 않고 통계만 출력한다: 대상 학생 수, 라벨 분포, 제외 사유별
  집계, `cutoffUnavailable`, 비식별 치환 건수.
- **Acceptance Criteria**: `--dry-run`으로 실행하면 `out/`에 파일이 생기지 않는다.
  `--limit N`으로 학생 수를 제한할 수 있다.
- **Verification**: (MANUAL) `npx tsx scripts/export-sales-call-dataset.ts --dry-run`

### REQ-008: 학습 잡은 삭제 영수증까지 확인해야 끝난다
- **Priority**: Must
- **Description**: `scripts/train-sales-call-pack.ts`가 external dataset 스키마를 선언하고
  (이미 있으면 재사용), training 잡을 만들고, Parquet을 올리고, 시작하고, `wait()`한다.
  `wait()`는 `completed`에서만 resolve하므로 `ExternalTrainingError`를 잡아
  `deletion_failed`면 `retryDeletion()`을 호출한다. 성공하면 `packDigest`와
  `deletionReceipt`를 `reports/intfunc/{jobId}.json`에 남긴다 — 영수증이 파기의 증거다.
- **Acceptance Criteria**: 잡이 끝나면 영수증 파일이 생기고 `verifiedEmpty`가 기록된다.
  `deletion_failed`는 성공으로 보고되지 않는다.
- **Verification**: (MANUAL) 콘솔에서 잡 상태 확인 + 영수증 파일 검사

### REQ-009: 내보낸 Parquet은 저장소에 들어가지 않는다
- **Priority**: Must
- **Description**: `.gitignore`에 `out/*.parquet`를 추가한다. 영수증
  (`reports/intfunc/*.json`)은 행으로 되돌릴 수 없고 증거이므로 커밋한다.
- **Acceptance Criteria**: `git status`가 생성된 parquet을 추적 대상으로 보여주지 않는다.
- **Verification**: (MANUAL) `git status --ignored`

### REQ-010: CRM에서 학습을 시작할 수 있다
- **Priority**: Must
- **Description**: `POST /api/crm/intfunc/training`이 코퍼스를 내보내 Parquet을 `/tmp`에 쓰고,
  스키마를 선언하고, 잡을 열고, 업로드하고, `start()`한 뒤 **즉시** jobId를 돌려준다.
  여기서 `wait()`를 부르지 않는다 — intfunc 잡은 그쪽에서 비동기로 돌므로 요청을 붙잡을
  이유가 없고, 전사 백필과 달리 청킹도 시간 예산도 필요 없다.
  `dry_run: true`면 통계만 돌려주고 파일도 업로드도 만들지 않는다.
  `/tmp` 파일은 성패와 무관하게 `finally`에서 지운다 — 상담 원문이다.
- **Acceptance Criteria**: 성공 시 `{ data: { jobId, state, stats } }`. 인증 없으면 401.
  대상 행이 0이면 400. 응답 어디에도 전사 본문이 실리지 않는다.
- **Verification**: (TEST) `src/app/api/crm/intfunc/training/__tests__/route.test.ts`

### REQ-011: 진행 상황은 폴링으로 따라간다
- **Priority**: Must
- **Description**: `GET /api/crm/intfunc/training/[jobId]`가 `summarizeJob` 요약을 돌려준다.
  `deletion_failed`는 pack이 있어도 **완료가 아니다**. 조회가 부수효과를 내지 않도록
  파기 재시도는 같은 경로의 `POST`로 분리한다.
- **Acceptance Criteria**: 진행 중 상태는 `finished: false`, 멈춘 상태는 `true`.
  `deletion_failed`는 `finished: true`이면서 `deletionFailed: true`다.
- **Verification**: (TEST) `src/lib/intfunc/__tests__/training.test.ts`

### REQ-012: 모달은 비용과 외부 전송을 먼저 알린다
- **Priority**: Must
- **Description**: `IntfuncTrainingModal`은 열자마자 아무것도 시작하지 않는다. 외부 전송·
  비식별·파기 영수증·비용을 먼저 고지하고, `미리보기`(dry-run)로 대상 건수를 확인한 뒤에야
  `학습 시작`을 누를 수 있다. `cutoffUnavailable > 0`이면 누출 위험을 경고한다.
  잡이 시작되면 창을 닫아도 학습이 계속됨을 알린다.
- **Acceptance Criteria**: 렌더만으로 fetch가 일어나지 않는다. `deletion_failed`는 완료로
  표시되지 않고 파기 재시도 버튼이 뜬다.
- **Verification**: (TEST) `src/app/admin/crm/components/__tests__/IntfuncTrainingModal.test.tsx`

## Non-Goals

- 일반 dataset(`import()`) 경로. external dataset은 `training.create()`가 곧 pack 빌드라
  콘솔의 선언·빌드 단계를 거치지 않는다.
- pack의 `ask()` / `recourse()` 호출 경로 (REQ-012의 학습 트리거까지가 이번 범위).
- 학습 완료 알림(슬랙 등). 지금은 모달 폴링으로만 확인한다.

## Open Questions

- ~~`schema.columns`의 `type` 어휘~~ — 확인됨. SDK의 `ExternalColumnType`은
  `text | number | boolean | struct | list`. 이 설계는 `text`와 `number`만 쓴다.
- 프로젝트 slug와 pack slug는 콘솔에서 받아 `.env.local`에 넣는다.
